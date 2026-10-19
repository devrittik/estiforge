import "server-only";

import mongoose from "mongoose";
import { connection } from "next/server";

import { getEnv, type AppEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging/logger";

import {
  EstimateModel,
  ProjectModel,
  QuotationModel,
  RateItemModel,
  UserModel,
} from "./models";

export class DatabaseConnectionError extends Error {
  readonly mode: "local" | "atlas";

  constructor(mode: "local" | "atlas") {
    super(
      `Could not connect to the ${mode} MongoDB database. EstiForge will not switch to another database mode.`,
    );
    this.name = "DatabaseConnectionError";
    this.mode = mode;
  }
}

type MongoTarget = {
  mode: "local" | "atlas";
  uri: string;
};

type ConnectionCache = {
  uri: string | null;
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalCache = globalThis as typeof globalThis & {
  estiforgeMongo?: ConnectionCache;
};

function cache(): ConnectionCache {
  globalCache.estiforgeMongo ??= { uri: null, conn: null, promise: null };
  return globalCache.estiforgeMongo;
}

export function resolveMongoTarget(env: AppEnv): MongoTarget {
  if (env.MONGODB_MODE === "atlas") {
    return { mode: "atlas", uri: env.MONGODB_ATLAS_URI };
  }
  return { mode: "local", uri: env.MONGODB_LOCAL_URI };
}

export function resetConnectionCache(): void {
  const current = cache();
  current.uri = null;
  current.conn = null;
  current.promise = null;
}

async function ensureIndexes(): Promise<void> {
  await Promise.all([
    UserModel.init(),
    ProjectModel.init(),
    RateItemModel.init(),
    EstimateModel.init(),
    QuotationModel.init(),
  ]);
}

async function waitForRequest(): Promise<void> {
  try {
    await connection();
  } catch (error) {
    if (error instanceof Error && error.message.includes("outside a request scope")) {
      return;
    }
    throw error;
  }
}

export async function connectToDatabase(uriOverride?: string): Promise<typeof mongoose> {
  await waitForRequest();
  const target = uriOverride
    ? { mode: "local" as const, uri: uriOverride }
    : resolveMongoTarget(getEnv());
  const current = cache();

  if (current.conn && current.uri === target.uri && mongoose.connection.readyState === 1) {
    return current.conn;
  }

  if (current.uri !== target.uri) {
    current.conn = null;
    current.promise = null;
  }

  if (!current.promise) {
    current.uri = target.uri;
    current.promise = mongoose
      .connect(target.uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 2000,
      })
      .then(async (connection) => {
        await ensureIndexes();
        return connection;
      })
      .catch((error: unknown) => {
        current.promise = null;
        current.conn = null;
        logger.error(
          {
            module: "db",
            operation: "connect",
            mongodbMode: target.mode,
            errorName: error instanceof Error ? error.name : "Error",
          },
          "database connection failed",
        );
        throw new DatabaseConnectionError(target.mode);
      });
  }

  current.conn = await current.promise;
  return current.conn;
}

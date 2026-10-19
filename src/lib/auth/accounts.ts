import "server-only";

import { redirect } from "next/navigation";

import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { readSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongo";
import { UserModel } from "@/lib/db/models";
import type { RegisterInput } from "@/lib/validation/schemas";

export class AccountExistsError extends Error {
  constructor() {
    super("An account with that email already exists.");
    this.name = "AccountExistsError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Email or password is incorrect.");
    this.name = "InvalidCredentialsError";
  }
}

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  preferredDiscipline: "electrical" | "civil";
};

let dummyHash: Promise<string> | null = null;

function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("not-a-real-password");
  return dummyHash;
}

function toPublicUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  preferredDiscipline: "electrical" | "civil";
}): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    preferredDiscipline: user.preferredDiscipline,
  };
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  await connectToDatabase();
  const email = input.email.toLowerCase();
  const existing = await UserModel.findOne({ email }).select("_id").lean();
  if (existing) {
    throw new AccountExistsError();
  }

  const passwordHash = await hashPassword(input.password);
  try {
    const user = await UserModel.create({
      name: input.name,
      email,
      passwordHash,
      preferredDiscipline: input.preferredDiscipline,
      themePreference: "system",
    });
    return toPublicUser(user);
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new AccountExistsError();
    }
    throw error;
  }
}

export async function authenticateUser(email: string, password: string): Promise<PublicUser> {
  await connectToDatabase();
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  const passwordHash = user?.passwordHash ?? (await dummyPasswordHash());
  const matches = await verifyPassword(password, passwordHash);
  if (!user || !matches) {
    throw new InvalidCredentialsError();
  }
  return toPublicUser(user);
}

export async function requireUser(): Promise<PublicUser | null> {
  const session = await readSession();
  if (!session) {
    return null;
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.userId)
    .select("name email preferredDiscipline")
    .lean();
  if (!user) {
    return null;
  }
  return toPublicUser(user);
}

export async function getCurrentUser(): Promise<PublicUser> {
  const user = await requireUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

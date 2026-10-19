import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { decryptSession, encryptSession } from "@/lib/auth/session";
import { resolveMongoTarget } from "@/lib/db/mongo";
import { safeNextPath } from "@/lib/validation/schemas";
import { parseEnv } from "@/lib/config/env";

describe("password hashing", () => {
  it("stores a hash that is not the password", async () => {
    const hash = await hashPassword("Correct-horse-1");
    expect(hash).not.toContain("Correct-horse-1");
    expect(hash.startsWith("$2")).toBe(true);
    expect(await verifyPassword("Correct-horse-1", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});

describe("sessions", () => {
  it("round-trips the user id and rejects a tampered token", async () => {
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters";
    const token = await encryptSession({ userId: "user-123" });
    expect(token.split(".")).toHaveLength(3);
    await expect(decryptSession(token)).resolves.toEqual({ userId: "user-123" });
    await expect(decryptSession(`${token}x`)).resolves.toBeNull();
    process.env.SESSION_SECRET = "another-session-secret-at-least-32-characters";
    await expect(decryptSession(token)).resolves.toBeNull();
  });
});

describe("database target", () => {
  it("uses only the selected mode", () => {
    const env = parseEnv({
      LLM_BASE_URL: "http://127.0.0.1:8080/v1",
      LLM_MODEL: "local",
      MONGODB_MODE: "local",
      MONGODB_LOCAL_URI: "mongodb://127.0.0.1:27017/estiforge",
      MONGODB_ATLAS_URI: "mongodb+srv://user:secret@cluster.example/estiforge",
      SESSION_SECRET: "test-session-secret-at-least-32-characters",
    });
    expect(resolveMongoTarget(env)).toEqual({
      mode: "local",
      uri: "mongodb://127.0.0.1:27017/estiforge",
    });
  });
});

describe("safeNextPath", () => {
  it("keeps internal paths and drops external targets", () => {
    expect(safeNextPath("/projects")).toBe("/projects");
    expect(safeNextPath("https://example.com")).toBe("/dashboard");
    expect(safeNextPath("//example.com")).toBe("/dashboard");
  });
});

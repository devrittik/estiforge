import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { registerUser } from "@/lib/auth/accounts";
import { UserModel } from "@/lib/db/models";
import { connectToDatabase, DatabaseConnectionError, resetConnectionCache } from "@/lib/db/mongo";
import { calculateOwnedEstimate, EstimateCalculationError } from "@/lib/db/estimate-calculations";
import { createRateItem, updateOwnedRateItem } from "@/lib/db/rate-items";
import {
  createEstimateDraft,
  createProject,
  getOwnedProject,
  readQuotationSubtotal,
  saveQuotationSnapshot,
  updateOwnedProject,
} from "@/lib/db/records";
import { resetEnvCache } from "@/lib/config/env";

const testUri = "mongodb://127.0.0.1:27017/estiforge_phase2_test";

describe("persistence and authorization", () => {
  beforeAll(async () => {
    process.env.MONGODB_MODE = "local";
    process.env.MONGODB_LOCAL_URI = testUri;
    process.env.MONGODB_ATLAS_URI = "mongodb+srv://user:secret@cluster.example/estiforge";
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters";
    process.env.LLM_BASE_URL = "http://127.0.0.1:8080/v1";
    process.env.LLM_MODEL = "test-model";
    resetEnvCache();
    resetConnectionCache();
    await connectToDatabase();
    await mongoose.connection.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    resetConnectionCache();
  });

  it("saves a project for its owner and hides it from another user", async () => {
    const owner = await registerUser({
      name: "Ada Owner",
      email: "ada@example.com",
      password: "Correct-horse-1",
      preferredDiscipline: "electrical",
    });
    const other = await registerUser({
      name: "Grace Other",
      email: "grace@example.com",
      password: "Correct-horse-2",
      preferredDiscipline: "electrical",
    });

    const stored = await UserModel.findById(owner.id).lean();
    expect(stored?.passwordHash).not.toContain("Correct-horse-1");

    const project = await createProject(owner.id, {
      name: "Site lighting",
      clientName: "North Depot",
      clientEmail: "client@example.com",
      clientPhone: "555-0100",
      location: "Pune",
      discipline: "electrical",
      description: "Workshop lighting",
    });

    expect(await getOwnedProject(other.id, project.id)).toBeNull();
    expect(
      await updateOwnedProject(other.id, project.id, {
        name: "Taken over",
        clientName: "North Depot",
        clientEmail: "",
        clientPhone: "",
        location: "Pune",
        discipline: "electrical",
        description: "",
      }),
    ).toBeNull();
    expect((await getOwnedProject(owner.id, project.id))?.name).toBe("Site lighting");

    const estimate = await createEstimateDraft(owner.id, {
      projectId: project.id,
      title: "First draft",
      description: "Twelve light points",
    });
    expect(estimate?.calculationVersion).toBe(1);
    expect(await createEstimateDraft(other.id, {
      projectId: project.id,
      title: "Stolen draft",
      description: "",
    })).toBeNull();

    const snapshot = {
      businessName: "Ada Electrical",
      clientName: "North Depot",
      projectName: "Site lighting",
      location: "Pune",
      issuedOn: "2026-10-18",
      items: [{ description: "Light point", unit: "nos", quantity: 12, rate: 120, amount: 1440 }],
      subtotal: 1440,
      adjustment: 0,
      taxPercent: 0,
      tax: 0,
      total: 1440,
      exclusions: "None",
      terms: "Payment on completion",
      validity: "15 days",
    };
    const quotation = await saveQuotationSnapshot({
      ownerId: owner.id,
      projectId: project.id,
      estimateId: estimate!.id,
      number: "Q-1001",
      snapshot,
    });
    snapshot.subtotal = 1;
    expect(await readQuotationSubtotal(owner.id, quotation.id)).toBe(1440);
    expect(await readQuotationSubtotal(other.id, quotation.id)).toBeNull();

    const lights = await createRateItem(owner.id, {
      name: "Light point",
      unit: "nos",
      materialRate: 80,
      labourRate: 40,
      wastagePercent: 0,
      discipline: "electrical",
      catalogueCode: "light-point",
    });
    expect(await updateOwnedRateItem(other.id, lights.id, {
      name: "Changed",
      unit: "nos",
      materialRate: 1,
      labourRate: 1,
      wastagePercent: 0,
      discipline: "electrical",
      catalogueCode: "",
    })).toBeNull();

    const calculated = await calculateOwnedEstimate(owner.id, estimate!.id, {
      lines: [{ catalogueCode: "light-point", count: 12, rateItemId: lights.id }],
      adjustment: 0,
      taxPercent: 0,
    });
    expect(calculated.boq.lines[0]?.amount).toBe(1440);
    expect(calculated.version).toBe(2);
    await expect(
      calculateOwnedEstimate(other.id, estimate!.id, {
        lines: [{ catalogueCode: "light-point", count: 12, rateItemId: lights.id }],
        adjustment: 0,
        taxPercent: 0,
      }),
    ).rejects.toBeInstanceOf(EstimateCalculationError);
  });
});

describe("connection errors", () => {
  it("reports the selected local database and does not reveal the Atlas URI", async () => {
    process.env.MONGODB_MODE = "local";
    process.env.MONGODB_LOCAL_URI = "mongodb://127.0.0.1:1/estiforge";
    process.env.MONGODB_ATLAS_URI = "mongodb+srv://user:secret-pass@cluster.example/estiforge";
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters";
    process.env.LLM_BASE_URL = "http://127.0.0.1:8080/v1";
    process.env.LLM_MODEL = "test-model";
    resetEnvCache();
    resetConnectionCache();
    await mongoose.disconnect();

    await expect(connectToDatabase()).rejects.toBeInstanceOf(DatabaseConnectionError);
    try {
      await connectToDatabase();
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseConnectionError);
      const message = (error as Error).message;
      expect(message).toContain("local");
      expect(message).not.toContain("secret-pass");
      expect(message).not.toContain("cluster.example");
    }
  });
});

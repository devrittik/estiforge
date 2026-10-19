import mongoose, { Schema, type InferSchemaType, type Types } from "mongoose";

const disciplineValues = ["electrical", "civil"] as const;
const themeValues = ["light", "dark", "system"] as const;
const estimateStatuses = ["draft", "completed"] as const;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    preferredDiscipline: { type: String, required: true, enum: disciplineValues },
    themePreference: { type: String, required: true, enum: themeValues, default: "system" },
  },
  { timestamps: true },
);

const projectSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    clientName: { type: String, required: true, trim: true, maxlength: 120 },
    clientEmail: { type: String, trim: true, maxlength: 200, default: "" },
    clientPhone: { type: String, trim: true, maxlength: 40, default: "" },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    discipline: { type: String, required: true, enum: disciplineValues },
    description: { type: String, trim: true, maxlength: 4000, default: "" },
  },
  { timestamps: true },
);
projectSchema.index({ ownerId: 1, updatedAt: -1 });
projectSchema.index({ ownerId: 1, name: 1 });

const rateItemSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    unit: { type: String, required: true, trim: true, maxlength: 40 },
    materialRate: { type: Number, required: true, min: 0 },
    labourRate: { type: Number, required: true, min: 0 },
    wastagePercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    discipline: { type: String, required: true, enum: disciplineValues },
    catalogueCode: { type: String, trim: true, maxlength: 80, default: "" },
  },
  { timestamps: true },
);
rateItemSchema.index({ ownerId: 1, name: 1 });

const calculationOutputSchema = new Schema(
  {
    version: { type: Number, required: true, min: 1 },
    methodIds: { type: [String], required: true, default: [] },
    results: { type: Schema.Types.Mixed, required: false, default: null },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const estimateSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    status: { type: String, required: true, enum: estimateStatuses, default: "draft" },
    discipline: { type: String, required: true, enum: disciplineValues },
    description: { type: String, trim: true, maxlength: 4000, default: "" },
    inputs: { type: Schema.Types.Mixed, required: true, default: {} },
    calculationOutputs: { type: [calculationOutputSchema], required: true, default: [] },
  },
  { timestamps: true },
);
estimateSchema.index({ ownerId: 1, updatedAt: -1 });
estimateSchema.index({ ownerId: 1, projectId: 1 });

const quotationItemSchema = new Schema(
  {
    description: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const quotationSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    estimateId: { type: Schema.Types.ObjectId, ref: "Estimate", required: true },
    number: { type: String, required: true, trim: true },
    snapshot: {
      businessName: { type: String, required: true, default: "" },
      clientName: { type: String, required: true, default: "" },
      projectName: { type: String, required: true, default: "" },
      location: { type: String, required: true, default: "" },
      issuedOn: { type: String, required: true, default: "" },
      items: { type: [quotationItemSchema], required: true },
      subtotal: { type: Number, required: true },
      adjustment: { type: Number, required: true, default: 0 },
      taxPercent: { type: Number, required: true, default: 0 },
      tax: { type: Number, required: true, default: 0 },
      total: { type: Number, required: true, default: 0 },
      exclusions: { type: String, required: true, default: "" },
      terms: { type: String, required: true, default: "" },
      validity: { type: String, required: true, default: "" },
      capturedAt: { type: Date, required: true },
    },
  },
  { timestamps: true },
);
quotationSchema.index({ ownerId: 1, number: 1 }, { unique: true });
quotationSchema.index({ ownerId: 1, updatedAt: -1 });

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export type ProjectDocument = InferSchemaType<typeof projectSchema> & { _id: Types.ObjectId };

export const UserModel = mongoose.models.User ?? mongoose.model("User", userSchema);
export const ProjectModel = mongoose.models.Project ?? mongoose.model("Project", projectSchema);
export const RateItemModel = mongoose.models.RateItem ?? mongoose.model("RateItem", rateItemSchema);
export const EstimateModel = mongoose.models.Estimate ?? mongoose.model("Estimate", estimateSchema);
export const QuotationModel =
  mongoose.models.Quotation ?? mongoose.model("Quotation", quotationSchema);

import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";

const entityTables = {
  employees: "employees",
  employeeRates: "employeeRates",
  vehicles: "vehicles",
  clients: "clients",
  campaignBookings: "campaignBookings",
  assignments: "assignments",
  attendance: "attendanceDays",
  vehicleAttendance: "vehicleAttendanceDays",
  campaignAttendance: "campaignAttendanceDays",
  employeeExpenses: "employeeExpenses",
  advances: "advances",
  payrollPayments: "payrollPayments",
  bills: "bills",
  otherBills: "otherBills",
  businessExpenses: "businessExpenses",
  suppliers: "suppliers",
  supplierPayments: "supplierPayments",
  quotations: "quotations",
  receipts: "clientReceipts",
} as const;

const entityTableValidator = v.union(
  v.literal("employees"),
  v.literal("employeeRates"),
  v.literal("vehicles"),
  v.literal("clients"),
  v.literal("campaignBookings"),
  v.literal("assignments"),
  v.literal("attendanceDays"),
  v.literal("vehicleAttendanceDays"),
  v.literal("campaignAttendanceDays"),
  v.literal("employeeExpenses"),
  v.literal("advances"),
  v.literal("payrollPayments"),
  v.literal("bills"),
  v.literal("otherBills"),
  v.literal("businessExpenses"),
  v.literal("suppliers"),
  v.literal("supplierPayments"),
  v.literal("quotations"),
  v.literal("clientReceipts"),
);

async function updateStoreRevision(ctx: MutationCtx, storeKey: string, revision: number) {
  const existing = await ctx.db
    .query("storeRevisions")
    .withIndex("by_store", (queryBuilder) => queryBuilder.eq("storeKey", storeKey))
    .unique();
  if (existing) {
    if (revision > existing.revision) await ctx.db.patch(existing._id, { revision });
    return;
  }
  await ctx.db.insert("storeRevisions", { storeKey, revision });
}

export const getRevision = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const revision = await ctx.db
      .query("storeRevisions")
      .withIndex("by_store", (queryBuilder) => queryBuilder.eq("storeKey", key))
      .unique();
    return revision?.revision ?? null;
  },
});

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const settings = await ctx.db
      .query("fleetSettings")
      .withIndex("by_store", (queryBuilder) => queryBuilder.eq("storeKey", key))
      .unique();

    if (settings) {
      const entries = await Promise.all(Object.entries(entityTables).map(async ([field, table]) => {
        const documents = await ctx.db
          .query(table)
          .withIndex("by_store", (queryBuilder) => queryBuilder.eq("storeKey", key))
          .collect();
        const ordered = documents.sort((left, right) => left.position - right.position);
        const value = field.endsWith("Attendance") || field === "attendance"
          ? Object.fromEntries(ordered.map((document) => [document.entityId, document.data]))
          : ordered.map((document) => document.data);
        return [field, value] as const;
      }));
      return {
        payload: JSON.stringify({
          schemaVersion: settings.schemaVersion,
          company: settings.company,
          nextBillNumber: settings.nextBillNumber,
          nextOtherBillNumber: settings.nextOtherBillNumber,
          nextQuotationNumber: settings.nextQuotationNumber ?? 1,
          nextReceiptNumber: settings.nextReceiptNumber ?? 1,
          ...Object.fromEntries(entries),
        }),
        schemaVersion: settings.schemaVersion,
        updatedAt: settings.updatedAt,
        normalized: true,
      };
    }

    return null;
  },
});

export const saveSettings = mutation({
  args: {
    storeKey: v.string(),
    schemaVersion: v.number(),
    company: v.any(),
    nextBillNumber: v.number(),
    nextOtherBillNumber: v.number(),
    nextQuotationNumber: v.optional(v.number()),
    nextReceiptNumber: v.optional(v.number()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fleetSettings")
      .withIndex("by_store", (queryBuilder) => queryBuilder.eq("storeKey", args.storeKey))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    const id = await ctx.db.insert("fleetSettings", args);
    return id;
  },
});

export const saveEntities = mutation({
  args: {
    storeKey: v.string(),
    table: entityTableValidator,
    updatedAt: v.number(),
    entities: v.array(v.object({ entityId: v.string(), position: v.number(), data: v.any() })),
  },
  handler: async (ctx, { storeKey, table, updatedAt, entities }) => {
    await Promise.all(entities.map(async (entity) => {
      const existing = await ctx.db
        .query(table)
        .withIndex("by_store_entity", (queryBuilder) => queryBuilder.eq("storeKey", storeKey).eq("entityId", entity.entityId))
        .unique();
      const value = { storeKey, ...entity, updatedAt };
      if (existing) await ctx.db.patch(existing._id, value);
      else await ctx.db.insert(table, value);
    }));
  },
});

export const deleteEntities = mutation({
  args: {
    storeKey: v.string(),
    table: entityTableValidator,
    updatedAt: v.optional(v.number()),
    entityIds: v.array(v.string()),
  },
  handler: async (ctx, { storeKey, table, entityIds }) => {
    await Promise.all(entityIds.map(async (entityId) => {
      const existing = await ctx.db
        .query(table)
        .withIndex("by_store_entity", (queryBuilder) => queryBuilder.eq("storeKey", storeKey).eq("entityId", entityId))
        .unique();
      if (existing) await ctx.db.delete(existing._id);
    }));
  },
});

export const touchRevision = mutation({
  args: {
    storeKey: v.string(),
    revision: v.number(),
  },
  handler: async (ctx, { storeKey, revision }) => {
    await updateStoreRevision(ctx, storeKey, revision);
  },
});

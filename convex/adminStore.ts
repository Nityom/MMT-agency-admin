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
          ...Object.fromEntries(entries),
        }),
        schemaVersion: settings.schemaVersion,
        updatedAt: settings.updatedAt,
        normalized: true,
      };
    }

    const document = await ctx.db
      .query("adminStores")
      .withIndex("by_key", (queryBuilder) => queryBuilder.eq("key", key))
      .unique();

    if (!document) return null;
    if (document.revision === undefined || document.chunkCount === undefined) {
      return {
        payload: document.payload ?? "",
        schemaVersion: document.schemaVersion,
        updatedAt: document.updatedAt,
        normalized: false,
      };
    }

    const chunks = await ctx.db
      .query("adminStoreChunks")
      .withIndex("by_key_revision", (queryBuilder) =>
        queryBuilder.eq("key", key).eq("revision", document.revision!),
      )
      .collect();
    const chunksByIndex = new Map(chunks.map((chunk) => [chunk.index, chunk]));
    if (chunksByIndex.size !== document.chunkCount) return null;

    return {
      payload: [...chunksByIndex.values()]
        .sort((left, right) => left.index - right.index)
        .map((chunk) => chunk.payload)
        .join(""),
      schemaVersion: document.schemaVersion,
      updatedAt: document.updatedAt,
      normalized: false,
    };
  },
});

export const saveSettings = mutation({
  args: {
    storeKey: v.string(),
    schemaVersion: v.number(),
    company: v.any(),
    nextBillNumber: v.number(),
    nextOtherBillNumber: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fleetSettings")
      .withIndex("by_store", (queryBuilder) => queryBuilder.eq("storeKey", args.storeKey))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      await updateStoreRevision(ctx, args.storeKey, args.updatedAt);
      return existing._id;
    }
    const id = await ctx.db.insert("fleetSettings", args);
    await updateStoreRevision(ctx, args.storeKey, args.updatedAt);
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
    await updateStoreRevision(ctx, storeKey, updatedAt);
  },
});

export const deleteEntities = mutation({
  args: {
    storeKey: v.string(),
    table: entityTableValidator,
    updatedAt: v.optional(v.number()),
    entityIds: v.array(v.string()),
  },
  handler: async (ctx, { storeKey, table, updatedAt, entityIds }) => {
    await Promise.all(entityIds.map(async (entityId) => {
      const existing = await ctx.db
        .query(table)
        .withIndex("by_store_entity", (queryBuilder) => queryBuilder.eq("storeKey", storeKey).eq("entityId", entityId))
        .unique();
      if (existing) await ctx.db.delete(existing._id);
    }));
    if (updatedAt !== undefined) await updateStoreRevision(ctx, storeKey, updatedAt);
  },
});

export const saveChunk = mutation({
  args: {
    key: v.string(),
    revision: v.number(),
    index: v.number(),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    const matchingChunks = await ctx.db
      .query("adminStoreChunks")
      .withIndex("by_key_revision", (queryBuilder) =>
        queryBuilder.eq("key", args.key).eq("revision", args.revision),
      )
      .collect();
    const existing = matchingChunks.find((chunk) => chunk.index === args.index);
    if (existing) {
      await ctx.db.patch(existing._id, { payload: args.payload });
      await Promise.all(matchingChunks.filter((chunk) => chunk.index === args.index && chunk._id !== existing._id).map((chunk) => ctx.db.delete(chunk._id)));
      return;
    }
    await ctx.db.insert("adminStoreChunks", args);
  },
});

export const commit = mutation({
  args: {
    key: v.string(),
    revision: v.number(),
    chunkCount: v.number(),
    schemaVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("adminStoreChunks")
      .withIndex("by_key_revision", (queryBuilder) =>
        queryBuilder.eq("key", args.key).eq("revision", args.revision),
      )
      .collect();
    const chunkIndexes = new Set(chunks.map((chunk) => chunk.index));
    if (chunkIndexes.size !== args.chunkCount || Array.from({ length: args.chunkCount }, (_, index) => index).some((index) => !chunkIndexes.has(index))) {
      throw new Error("Admin store upload is incomplete");
    }

    const existing = await ctx.db
      .query("adminStores")
      .withIndex("by_key", (queryBuilder) => queryBuilder.eq("key", args.key))
      .unique();
    if (existing?.revision !== undefined && existing.revision > args.revision) return existing._id;
    const values = { revision: args.revision, chunkCount: args.chunkCount, schemaVersion: args.schemaVersion, updatedAt: Date.now(), payload: undefined };
    if (existing) {
      await ctx.db.patch(existing._id, values);
    } else {
      await ctx.db.insert("adminStores", { key: args.key, ...values });
    }

    const oldChunks = await ctx.db
      .query("adminStoreChunks")
      .withIndex("by_key", (queryBuilder) => queryBuilder.eq("key", args.key))
      .collect();
    await Promise.all(oldChunks.filter((chunk) => chunk.revision !== args.revision).map((chunk) => ctx.db.delete(chunk._id)));
  },
});

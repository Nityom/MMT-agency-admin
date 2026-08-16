import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const entityTable = () => defineTable({
  storeKey: v.string(),
  entityId: v.string(),
  position: v.number(),
  data: v.any(),
  updatedAt: v.number(),
})
  .index("by_store", ["storeKey"])
  .index("by_store_entity", ["storeKey", "entityId"]);

export default defineSchema({
  fleetSettings: defineTable({
    storeKey: v.string(),
    schemaVersion: v.number(),
    company: v.any(),
    nextBillNumber: v.number(),
    nextOtherBillNumber: v.number(),
    updatedAt: v.number(),
  }).index("by_store", ["storeKey"]),
  employees: entityTable(),
  employeeRates: entityTable(),
  vehicles: entityTable(),
  clients: entityTable(),
  campaignBookings: entityTable(),
  assignments: entityTable(),
  attendanceDays: entityTable(),
  vehicleAttendanceDays: entityTable(),
  campaignAttendanceDays: entityTable(),
  employeeExpenses: entityTable(),
  advances: entityTable(),
  payrollPayments: entityTable(),
  bills: entityTable(),
  otherBills: entityTable(),
  businessExpenses: entityTable(),
  suppliers: entityTable(),
  supplierPayments: entityTable(),

  // Kept temporarily so existing deployments can migrate on their next save.
  adminStores: defineTable({
    key: v.string(),
    payload: v.optional(v.string()),
    revision: v.optional(v.number()),
    chunkCount: v.optional(v.number()),
    schemaVersion: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  adminStoreChunks: defineTable({
    key: v.string(),
    revision: v.number(),
    index: v.number(),
    payload: v.string(),
  })
    .index("by_key", ["key"])
    .index("by_key_revision", ["key", "revision"]),
});

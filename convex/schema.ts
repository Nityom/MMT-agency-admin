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
    nextQuotationNumber: v.optional(v.number()),
    nextReceiptNumber: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_store", ["storeKey"]),
  employees: entityTable(),
  employeeRates: entityTable(),
  employeePayments: entityTable(),
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
  quotations: entityTable(),
  clientReceipts: entityTable(),

  storeRevisions: defineTable({
    storeKey: v.string(),
    revision: v.number(),
  }).index("by_store", ["storeKey"]),
});

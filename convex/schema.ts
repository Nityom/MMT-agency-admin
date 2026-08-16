import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  adminStores: defineTable({
    key: v.string(),
    payload: v.string(),
    schemaVersion: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});

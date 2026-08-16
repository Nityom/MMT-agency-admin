import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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

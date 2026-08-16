import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const document = await ctx.db
      .query("adminStores")
      .withIndex("by_key", (queryBuilder) => queryBuilder.eq("key", key))
      .unique();

    return document
      ? {
          payload: document.payload,
          schemaVersion: document.schemaVersion,
          updatedAt: document.updatedAt,
        }
      : null;
  },
});

export const save = mutation({
  args: {
    key: v.string(),
    payload: v.string(),
    schemaVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("adminStores")
      .withIndex("by_key", (queryBuilder) => queryBuilder.eq("key", args.key))
      .unique();
    const values = {
      payload: args.payload,
      schemaVersion: args.schemaVersion,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, values);
      return existing._id;
    }

    return await ctx.db.insert("adminStores", { key: args.key, ...values });
  },
});

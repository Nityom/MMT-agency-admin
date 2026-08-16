import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
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
    };
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

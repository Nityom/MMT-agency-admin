"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import { emptyStore, FleetStore, migrateStore } from "./fleet-domain";

const STORE_KEY = "primary";
const SAVE_DELAY_MS = 350;
const MUTATION_BATCH_SIZE = 75;
const MUTATION_CONCURRENCY = 8;

const arrayCollections = [
  ["employees", "employees"],
  ["employeeRates", "employeeRates"],
  ["vehicles", "vehicles"],
  ["clients", "clients"],
  ["campaignBookings", "campaignBookings"],
  ["assignments", "assignments"],
  ["employeeExpenses", "employeeExpenses"],
  ["advances", "advances"],
  ["payrollPayments", "payrollPayments"],
  ["bills", "bills"],
  ["otherBills", "otherBills"],
  ["businessExpenses", "businessExpenses"],
  ["suppliers", "suppliers"],
  ["supplierPayments", "supplierPayments"],
] as const;

const attendanceCollections = [
  ["attendance", "attendanceDays"],
  ["vehicleAttendance", "vehicleAttendanceDays"],
  ["campaignAttendance", "campaignAttendanceDays"],
] as const;

type EntityTable = (typeof arrayCollections)[number][1] | (typeof attendanceCollections)[number][1];
type EntityRow = { entityId: string; position: number; data: unknown };
type StoreSnapshot = {
  settings: string;
  collections: Map<EntityTable, Map<string, string>>;
};

function settingsSnapshot(store: FleetStore) {
  return JSON.stringify({
    schemaVersion: store.schemaVersion,
    company: store.company,
    nextBillNumber: store.nextBillNumber,
    nextOtherBillNumber: store.nextOtherBillNumber,
  });
}

function collectionRows(store: FleetStore): [EntityTable, EntityRow[]][] {
  const arrays = arrayCollections.map(([field, table]) => [
    table,
    store[field].map((data, position) => ({ entityId: String(data.id), position, data })),
  ] as [EntityTable, EntityRow[]]);
  const attendance = attendanceCollections.map(([field, table]) => [
    table,
    Object.entries(store[field]).map(([entityId, data], position) => ({ entityId, position, data })),
  ] as [EntityTable, EntityRow[]]);
  return [...arrays, ...attendance];
}

function createSnapshot(store: FleetStore): StoreSnapshot {
  return {
    settings: settingsSnapshot(store),
    collections: new Map(collectionRows(store).map(([table, rows]) => [
      table,
      new Map(rows.map((row) => [row.entityId, JSON.stringify([row.position, row.data])])),
    ])),
  };
}

function batches<T>(items: T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / MUTATION_BATCH_SIZE) }, (_, index) =>
    items.slice(index * MUTATION_BATCH_SIZE, (index + 1) * MUTATION_BATCH_SIZE));
}

async function runMutationQueue(tasks: (() => Promise<unknown>)[]) {
  let nextTask = 0;
  const worker = async () => {
    while (nextTask < tasks.length) {
      const task = tasks[nextTask];
      nextTask += 1;
      await task();
    }
  };
  await Promise.all(Array.from({ length: Math.min(MUTATION_CONCURRENCY, tasks.length) }, worker));
}

export function useFleetStore() {
  const remoteStore = useQuery(api.adminStore.get, { key: STORE_KEY });
  const saveSettings = useMutation(api.adminStore.saveSettings);
  const saveEntities = useMutation(api.adminStore.saveEntities);
  const deleteEntities = useMutation(api.adminStore.deleteEntities);
  const [store, setStore] = useState<FleetStore>(emptyStore);
  const [storageReady, setStorageReady] = useState(false);
  const persisted = useRef<StoreSnapshot | null>(null);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    if (remoteStore === undefined || storageReady) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      let loadedStore = emptyStore;
      if (remoteStore !== null) {
        try {
          loadedStore = migrateStore(JSON.parse(remoteStore.payload), emptyStore);
        } catch {
          loadedStore = emptyStore;
        }
      }
      persisted.current = remoteStore?.normalized ? createSnapshot(loadedStore) : null;
      setStore(loadedStore);
      setStorageReady(true);
    });
    return () => { cancelled = true; };
  }, [remoteStore, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    const timeout = window.setTimeout(() => {
      const nextStore = store;
      saveQueue.current = saveQueue.current.then(async () => {
        const previous = persisted.current;
        const updatedAt = Date.now();
        const mutations: (() => Promise<unknown>)[] = [];
        for (const [table, rows] of collectionRows(nextStore)) {
          const previousRows = previous?.collections.get(table) ?? new Map<string, string>();
          const nextRows = new Map(rows.map((row) => [row.entityId, JSON.stringify([row.position, row.data])]));
          const changed = rows.filter((row) => previousRows.get(row.entityId) !== nextRows.get(row.entityId));
          const removed = [...previousRows.keys()].filter((entityId) => !nextRows.has(entityId));
          for (const entities of batches(changed)) {
            mutations.push(() => saveEntities({ storeKey: STORE_KEY, table, updatedAt, entities }));
          }
          for (const entityIds of batches(removed)) {
            mutations.push(() => deleteEntities({ storeKey: STORE_KEY, table, entityIds }));
          }
        }
        await runMutationQueue(mutations);
        const nextSettings = settingsSnapshot(nextStore);
        if (!previous || previous.settings !== nextSettings) {
          await saveSettings({
            storeKey: STORE_KEY,
            schemaVersion: nextStore.schemaVersion,
            company: nextStore.company,
            nextBillNumber: nextStore.nextBillNumber,
            nextOtherBillNumber: nextStore.nextOtherBillNumber,
            updatedAt,
          });
        }
        persisted.current = createSnapshot(nextStore);
      }).catch((error: unknown) => {
        console.error("Unable to save admin data to Convex", error);
      });
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [deleteEntities, saveEntities, saveSettings, storageReady, store]);

  return { store, setStore, storageReady };
}
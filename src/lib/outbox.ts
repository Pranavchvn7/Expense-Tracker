/**
 * Browser-only queue (IndexedDB) for expenses and income added while offline. Entries hold only the
 * form fields the person typed plus a random reference that makes a re-send harmless. Nothing here
 * is trusted: the server validates every entry again when it syncs. Cleared on sign-out.
 */
export type OutboxKind = "expense" | "income";
export type OutboxItem = {
  id: string; // also sent as clientRef
  kind: OutboxKind;
  fields: Record<string, string>;
  createdAt: number;
  error?: string;
};

const DB = "et-outbox";
const STORE = "items";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

const notify = () => {
  try {
    window.dispatchEvent(new Event("outbox-changed"));
  } catch {
    /* ignore */
  }
};

export async function enqueue(kind: OutboxKind, id: string, fields: Record<string, string>): Promise<void> {
  await run("readwrite", (s) => s.put({ id, kind, fields, createdAt: Date.now() } satisfies OutboxItem));
  notify();
}

export async function listOutbox(): Promise<OutboxItem[]> {
  const all = await run<OutboxItem[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function markFailed(id: string, error: string): Promise<void> {
  const item = await run<OutboxItem | undefined>("readonly", (s) => s.get(id));
  if (item) await run("readwrite", (s) => s.put({ ...item, error }));
  notify();
}

export async function clearError(id: string): Promise<void> {
  const item = await run<OutboxItem | undefined>("readonly", (s) => s.get(id));
  if (item) {
    const { error: _e, ...rest } = item;
    void _e;
    await run("readwrite", (s) => s.put(rest));
  }
}

export async function removeItem(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
  notify();
}

export async function clearOutbox(): Promise<void> {
  await run("readwrite", (s) => s.clear());
  notify();
}

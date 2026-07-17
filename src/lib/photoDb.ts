import { openDB, type IDBPDatabase } from "idb";
import type { PhotoRecord, TaskType } from "@/types";

const DB_NAME = "examshot-db";
const DB_VERSION = 1;
const STORE_NAME = "photos";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("by-meta", ["meta.sessionId", "meta.candidateId", "meta.caseIndex", "meta.taskType"], {
            unique: true,
          });
        }
      },
    });
  }
  return dbPromise;
}

export async function savePhoto(record: PhotoRecord): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, record);
}

export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function getPhotoByMeta(
  sessionId: string,
  candidateId: string,
  caseIndex: number,
  taskType: TaskType,
): Promise<PhotoRecord | undefined> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const idx = tx.store.index("by-meta");
  return idx.get([sessionId, candidateId, caseIndex, taskType]);
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/** 估算 IndexedDB 已用字节（异步遍历所有 blob 求和） */
export async function estimateUsageBytes(): Promise<number> {
  try {
    const db = await getDB();
    let total = 0;
    let cursor = await db.transaction(STORE_NAME, "readonly").store.openCursor();
    while (cursor) {
      const rec = cursor.value as PhotoRecord;
      total += rec.blob?.size ?? 0;
      cursor = await cursor.continue();
    }
    return total;
  } catch {
    return 0;
  }
}

/** 把 Blob 转成 object URL（用于 <img> 显示），调用方负责 revoke */
export function blobToObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}

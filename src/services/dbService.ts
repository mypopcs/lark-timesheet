import type { LogEntry } from "../types";
import { DB_CONFIG } from "../config/constants";

let db: IDBDatabase | null = null;

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const request = indexedDB.open(DB_CONFIG.dbName, DB_CONFIG.dbVersion);
    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(DB_CONFIG.storeName)) {
        const objectStore = dbInstance.createObjectStore(DB_CONFIG.storeName, {
          keyPath: "id",
        });
        objectStore.createIndex("date", "date", { unique: false });
        objectStore.createIndex("type", "type", { unique: false });
        objectStore.createIndex("syncStatus", "syncStatus", { unique: false });
      }
    };
  });
}

async function getAllLogs(): Promise<LogEntry[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.storeName, "readonly");
    const store = transaction.objectStore(DB_CONFIG.storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function saveLog(log: LogEntry): Promise<IDBValidKey> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.storeName, "readwrite");
    const store = transaction.objectStore(DB_CONFIG.storeName);
    const request = store.put(log);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function deleteLogDB(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_CONFIG.storeName, "readwrite");
    const store = transaction.objectStore(DB_CONFIG.storeName);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export const dbService = {
  getAllLogs,
  saveLog,
  deleteLogDB,
};

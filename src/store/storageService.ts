import { openDB, type IDBPDatabase } from "idb";
import { environment } from "../environment";
import { AppConstants } from "../app-constants";

/* Same schema you used in Angular */
export interface IndexedDBStorage {
  localStorage: {
    key: string;
    value: string;
  };
}

export class StorageService {
  private dbPromise: Promise<IDBPDatabase<IndexedDBStorage>>;
  private sessionStorage: Storage = typeof window !== "undefined" ? window.sessionStorage : ({} as Storage);

  constructor() {
    if (typeof window !== "undefined") {
      this.dbPromise = this.openIndexedDB();
    } else {
      this.dbPromise = Promise.reject(new Error("IndexedDB not available on server"));
    }
  }

  // ─────────────────────────────────────────────────────────────

  private async openIndexedDB(): Promise<IDBPDatabase<IndexedDBStorage>> {
    return openDB<IndexedDBStorage>(
      environment.indexedDBName,
      environment.indexedDBVersion,
      {
        upgrade(db: any) {
          if (!db.objectStoreNames.contains("localStorage")) {
            db.createObjectStore("localStorage");
          }
        },
      }
    );
  }

  // ─────────────────────────────────────────────────────────────
  // IndexedDB (Persistent)
  // ─────────────────────────────────────────────────────────────

  async getFromStorage(key: string): Promise<any> {
    const db = await this.dbPromise;

    const encrypted = (await db.get("localStorage", key)) as string;
    if (!encrypted) return null;

    const decrypted = await this.decrypt(encrypted);
    return this.parseValue(decrypted);
  }

  async saveToStorage(key: string, value: any): Promise<void> {
    const db = await this.dbPromise;

    const raw = typeof value === "string" ? value : JSON.stringify(value);
    const encrypted = await this.encrypt(raw);

    await db.put("localStorage", encrypted, key);
  }

  async removeFromStorage(key: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("localStorage", key);
  }

  async clearStorage(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear("localStorage");
  }

  // ─────────────────────────────────────────────────────────────
  // Session Storage (Temporary)
  // ─────────────────────────────────────────────────────────────

  async saveToSessionStorage(key: string, value: any): Promise<void> {
    const raw = typeof value === "string" ? value : JSON.stringify(value);
    const encrypted = await this.encrypt(raw);

    this.sessionStorage.setItem(key, encrypted);
  }

  async getFromSessionStorage(key: string): Promise<any> {
    const encrypted = this.sessionStorage.getItem(key);
    if (!encrypted) return null;

    const decrypted = await this.decrypt(encrypted);
    return this.parseValue(decrypted);
  }

  async removeFromSessionStorage(key: string): Promise<void> {
    this.sessionStorage.removeItem(key);
  }

  async clearSessionStorage(): Promise<void> {
    this.sessionStorage.clear();
  }

  // ─────────────────────────────────────────────────────────────
  // Mixed Storage Logic (Remember Me)
  // ─────────────────────────────────────────────────────────────

  async getDataFromAnyStorage(key: string): Promise<any> {
    const remember = await this.getFromStorage(
      AppConstants.DATABASE_KEYS.REMEMBER_PWD
    );

    if (remember) {
      return this.getFromStorage(key);
    } else {
      return this.getFromSessionStorage(key);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────────────────────

  private parseValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  // Replace these with your real crypto from BaseService
  private async encrypt(data: string): Promise<string> {
    return btoa(data);
  }

  private async decrypt(data: string): Promise<string> {
    return atob(data);
  }
}

/* Singleton – just like Angular providedIn:root */
export const storageService = new StorageService();

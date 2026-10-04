export interface LocalAttemptState {
  attemptId: string;
  examId: string;
  currentIndex: number;
  answers: Record<string, string>;
  flagged: string[];
  revision: number;
  lastSyncAt?: string;
  updatedAt: string;
}

const DB_NAME = 'suka-olimpiade-fisika-exam';
const DB_VERSION = 1;
const STORE = 'attempts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB tidak tersedia.'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'attemptId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Gagal membuka IndexedDB.'));
  });
}

export async function saveLocalAttempt(state: LocalAttemptState): Promise<{ ok: boolean; quotaExceeded?: boolean }> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(state);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    return { ok: true };
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    return { ok: false, quotaExceeded: name === 'QuotaExceededError' };
  }
}

export async function getLocalAttempt(attemptId: string): Promise<LocalAttemptState | null> {
  try {
    const db = await openDb();
    const result = await new Promise<LocalAttemptState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(attemptId);
      request.onsuccess = () => resolve(request.result as LocalAttemptState | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result || null;
  } catch {
    return null;
  }
}

export async function findLocalAttemptByExam(examId: string): Promise<LocalAttemptState | null> {
  try {
    const db = await openDb();
    const result = await new Promise<LocalAttemptState | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as LocalAttemptState[]).find((item) => item.examId === examId) || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function deleteLocalAttempt(attemptId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(attemptId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Best effort only.
  }
}

export async function checkStorageReadiness(): Promise<{ indexedDbAvailable: boolean; storageAvailable: boolean; quotaBytes?: number; usageBytes?: number; message?: string }> {
  let indexedDbAvailable = false;
  try {
    const db = await openDb();
    indexedDbAvailable = true;
    db.close();
  } catch {
    indexedDbAvailable = false;
  }

  let quotaBytes: number | undefined;
  let usageBytes: number | undefined;
  try {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota;
      usageBytes = estimate.usage;
    }
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => false);
  } catch {
    // StorageManager bersifat enhancement, bukan kebutuhan mutlak.
  }

  return {
    indexedDbAvailable,
    storageAvailable: indexedDbAvailable,
    quotaBytes,
    usageBytes,
    message: indexedDbAvailable ? undefined : 'Penyimpanan lokal tidak tersedia. Jawaban akan mengandalkan memori dan sinkronisasi server.',
  };
}

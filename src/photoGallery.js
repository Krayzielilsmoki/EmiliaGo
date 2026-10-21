// Persistent Silly Poses Photo Gallery for EmiliaGO
// Uses IndexedDB with automatic LocalStorage fallback to reliably store
// funny snaps across launches on NVIDIA Shield TV and Web.

const DB_NAME = 'emiliago_gallery_db';
const DB_VERSION = 1;
const STORE_NAME = 'silly_photos';
const LOCAL_STORAGE_KEY = 'emiliago_gallery_backup';

class PhotoGalleryManager {
  constructor() {
    this.db = null;
    this._initPromise = this._initDB();
  }

  async _initDB() {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }

  async savePhoto({ poseName, dataUrl, stars = 3 }) {
    await this._initPromise;
    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const photo = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      dateStr,
      poseName: poseName || 'Silly Pose',
      dataUrl,
      stars,
    };

    if (this.db) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(photo);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        return photo;
      } catch (err) {
        console.warn('IndexedDB save failed, falling back to localStorage:', err);
      }
    }

    // LocalStorage fallback (keep latest 15 photos)
    try {
      const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      existing.unshift(photo);
      if (existing.length > 15) existing.pop();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
    return photo;
  }

  async getPhotos() {
    await this._initPromise;
    if (this.db) {
      try {
        const photos = await new Promise((resolve, reject) => {
          const tx = this.db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        photos.sort((a, b) => b.timestamp - a.timestamp);
        return photos;
      } catch (err) {
        console.warn('IndexedDB getAll failed, falling back to localStorage:', err);
      }
    }

    try {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  async deletePhoto(id) {
    await this._initPromise;
    if (this.db) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (e) {
        console.warn('IndexedDB delete failed:', e);
      }
    }

    try {
      let existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      existing = existing.filter((p) => p.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn('LocalStorage delete failed:', e);
    }
  }

  async clearAll() {
    await this._initPromise;
    if (this.db) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (e) {
        console.warn('IndexedDB clear failed:', e);
      }
    }
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
  }
}

export const photoGallery = new PhotoGalleryManager();

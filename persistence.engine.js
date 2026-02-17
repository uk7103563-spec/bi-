/**
 * PERSISTENCE ENGINE MODULE (v21.0)
 * Responsibilities: IndexedDB lifecycle, Dataset persistence, Audit history storage, Retrieval.
 * TECHNOLOGY: Browser-Native IndexedDB (No External Dependencies).
 */

const PersistenceEngine = (() => {
    const DB_NAME = 'BI_AGENTIC';
    const DB_VERSION = 2;
    const STORES = {
        DATASETS: 'datasets',
        AUDITS: 'audits',
        CONFIG: 'config'
    };

    let db = null;

    async function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORES.DATASETS)) {
                    db.createObjectStore(STORES.DATASETS, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.AUDITS)) {
                    db.createObjectStore(STORES.AUDITS, { keyPath: 'timestamp' });
                }
                if (!db.objectStoreNames.contains(STORES.CONFIG)) {
                    db.createObjectStore(STORES.CONFIG, { keyPath: 'key' });
                }
            };

            request.onsuccess = (e) => {
                db = e.target.result;
                resolve(db);
            };

            request.onerror = (e) => reject(e.target.error);
        });
    }

    async function saveDataset(dataset) {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.DATASETS, 'readwrite');
            const store = tx.objectStore(STORES.DATASETS);
            // We store the serialized data if needed, but here we store it as a structured object
            const request = store.put(dataset);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function getAllDatasets() {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.DATASETS, 'readonly');
            const store = tx.objectStore(STORES.DATASETS);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function deleteDataset(id) {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.DATASETS, 'readwrite');
            const store = tx.objectStore(STORES.DATASETS);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function saveAudit(audit) {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.AUDITS, 'readwrite');
            const store = tx.objectStore(STORES.AUDITS);
            // Ensure timestamp is present as key
            if (!audit.timestamp) audit.timestamp = new Date().toISOString();
            const request = store.put(audit);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function getAuditHistory() {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.AUDITS, 'readonly');
            const store = tx.objectStore(STORES.AUDITS);
            const request = store.getAll();
            request.onsuccess = () => {
                // Return sorted by timestamp descending
                const results = request.result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async function clearAll() {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(Object.values(STORES), 'readwrite');
            Object.values(STORES).forEach(s => tx.objectStore(s).clear());
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    return {
        init,
        saveDataset,
        getAllDatasets,
        deleteDataset,
        saveAudit,
        getAuditHistory,
        clearAll
    };
})();

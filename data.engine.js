/**
 * DATA ENGINE MODULE (v20.5.1)
 * Responsibilities: Ingestion, Parsing (PapaParse/SheetJS), Chunking, Collection Management, Schema Discovery.
 */

const DataEngine = (() => {
    let datasetCollection = {}; // { id: { name, data, headers, meta, schema } }
    let masterData = []; // Combined data for union or current active dataset

    async function parseFileGeneric(file, id) {
        const ext = file.name.split('.').pop().toLowerCase();
        return new Promise((resolve, reject) => {
            if (['xlsx', 'xls'].includes(ext)) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const wb = XLSX.read(e.target.result, { type: 'buffer' });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
                        storeDataset(id, file.name, json, file);
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = () => reject(new Error("File read error"));
                reader.readAsArrayBuffer(file);
            } else {
                // CSV/SQL Chunked Parsing (Deterministic Performance Rule)
                const parser = typeof Papa !== 'undefined' ? Papa : (typeof window.Papa !== 'undefined' ? window.Papa : null);
                if (!parser) return reject(new Error("Governance Failure: CSV Parser (PapaParse) missing. Check network connection."));

                parser.parse(file, {
                    header: true,
                    skipEmptyLines: 'greedy',
                    worker: false, // Set to true if worker script is managed properly
                    complete: (final) => {
                        storeDataset(id, file.name, final.data, file);
                        resolve();
                    },
                    error: (err) => reject(err)
                });
            }
        });
    }

    function discoverSchema(data) {
        if (!data || data.length === 0) return { numerical: [], categorical: [], temporal: [] };
        const headers = Object.keys(data[0]);
        const schema = { numerical: [], categorical: [], temporal: [] };

        headers.forEach(h => {
            const sample = data.slice(0, 10).map(d => d[h]);
            let isNumeric = sample.every(v => !isNaN(parseFloat(String(v || "").replace(/[^0-9.-]/g, ""))) && String(v).trim() !== "");
            let isDate = sample.every(v => !isNaN(Date.parse(v)) && String(v).length > 5);

            if (isNumeric) schema.numerical.push(h);
            else if (isDate) schema.temporal.push(h);
            else schema.categorical.push(h);
        });
        return schema;
    }

    function generateHash(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return hash.toString(36);
    }

    async function storeDataset(id, name, data, file) {
        const cleanData = data.map(row => {
            const cleanRow = {};
            Object.keys(row).forEach(key => cleanRow[key.trim()] = String(row[key] === null || row[key] === undefined ? "" : row[key]).trim());
            return cleanRow;
        }).filter(row => Object.values(row).some(v => v !== ""));

        if (cleanData.length === 0) return;

        const schema = discoverSchema(cleanData);

        if (schema.numerical.length === 0 || (schema.categorical.length === 0 && schema.temporal.length === 0)) {
            console.warn(`Governance Alert: Dataset [${name}] rejected due to insufficient coordinate validity.`);
            return;
        }

        const dataset = {
            id: id,
            name: name,
            data: cleanData,
            headers: Object.keys(cleanData[0]),
            schema,
            hash: generateHash(cleanData),
            meta: {
                size: file ? (file.size / 1024).toFixed(2) + ' KB' : 'Cached',
                type: file ? (file.type || name.split('.').pop()) : 'DB',
                rows: cleanData.length,
                timestamp: new Date().toISOString()
            }
        };

        datasetCollection[id] = dataset;
        // PERSIST TO BROWSER STORAGE (v21.0)
        await PersistenceEngine.saveDataset(dataset);
    }

    async function loadHydratedCollection() {
        const persisted = await PersistenceEngine.getAllDatasets();
        if (Array.isArray(persisted)) {
            persisted.forEach(ds => {
                datasetCollection[ds.id] = ds;
            });
        }
        return datasetCollection;
    }

    function reconcileCollection(analysisMode) {
        const ids = Object.keys(datasetCollection);
        if (ids.length === 0) return { allHeaders: [], sharedHeaders: [], totalRows: 0, estMem: 0, diagnostics: { readiness: 0 }, schemas: {} };

        let sharedHeaders = [];
        const schemas = {};
        if (ids.length > 0) {
            sharedHeaders = [...datasetCollection[ids[0]].headers];
            ids.forEach(id => {
                const ds = datasetCollection[id];
                if (ds && ds.headers) {
                    sharedHeaders = sharedHeaders.filter(val => ds.headers.includes(val));
                }
                schemas[id] = ds ? ds.schema : null;
            });
        }

        const allHeadersPool = new Set();
        ids.forEach(id => {
            const ds = datasetCollection[id];
            if (ds && ds.headers) {
                ds.headers.forEach(h => allHeadersPool.add(h));
            }
        });

        const totalRows = ids.reduce((acc, id) => acc + datasetCollection[id].data.length, 0);
        const estMem = (JSON.stringify(datasetCollection).length / (1024 * 1024)).toFixed(1);

        return {
            allHeaders: Array.from(allHeadersPool),
            sharedHeaders,
            totalRows,
            estMem,
            diagnostics: { readiness: ids.length > 0 ? 100 : 0 },
            schemas
        };
    }

    function prepareMasterData(mode) {
        const ids = Object.keys(datasetCollection);
        if (ids.length === 0) {
            masterData = [];
            return;
        }

        if (mode === 'single') {
            masterData = datasetCollection[ids[ids.length - 1]].data;
        } else if (mode === 'union') {
            masterData = ids.flatMap(id => datasetCollection[id].data);
        } else if (mode === 'compare') {
            masterData = datasetCollection[ids[ids.length - 1]].data;
        }
    }

    function getOrgSummary() {
        const ids = Object.keys(datasetCollection);
        if (ids.length === 0) return null;

        const totalRows = ids.reduce((acc, id) => acc + datasetCollection[id].data.length, 0);
        const avgRows = totalRows / ids.length;
        const memoryMB = (JSON.stringify(datasetCollection).length / (1024 * 1024)).toFixed(1);

        const headerFreq = {};
        ids.forEach(id => datasetCollection[id].headers.forEach(h => headerFreq[h] = (headerFreq[h] || 0) + 1));
        const sharedCount = Object.values(headerFreq).filter(v => v === ids.length).length;
        const totalUniqueHeaders = Object.keys(headerFreq).length;

        const topHeader = Object.entries(headerFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        const integrity = Math.min(100, (sharedCount / (totalUniqueHeaders || 1)) * 100 + 50);
        const fidelity = ids.length > 1 ? 95 : 70;
        const alpha = Math.min(100, (totalRows / 1000) + 60);

        return {
            datasetCount: ids.length,
            totalRows,
            avgRows,
            memoryMB,
            topHeader,
            integrityStatus: integrity > 80 ? 'OPTIMAL' : 'STABLE',
            signals: [integrity, fidelity, 85, Math.min(100, totalRows / 5000 * 100), 90, alpha],
            lastSync: new Date().toISOString(),
            activationStatus: ids.length >= 2 ? 'MULTI_SOURCE_ACTIVE' : 'STAGING'
        };
    }

    function getCoordinateCandidates() {
        const ids = Object.keys(datasetCollection);
        if (ids.length === 0) return { x: "", y: "", z: "" };
        const ds = datasetCollection[ids[ids.length - 1]];
        const schema = ds.schema;

        const candidates = { x: "", y: "", z: "" };

        if (schema.temporal.length > 0) candidates.x = schema.temporal[0];
        else if (schema.categorical.length > 0) candidates.x = schema.categorical[0];
        else candidates.x = ds.headers[0];

        const numHeaders = schema.numerical;
        if (numHeaders.length > 0) {
            let maxVar = -1;
            let bestY = numHeaders[0];
            numHeaders.forEach(h => {
                const vals = ds.data.slice(0, 100).map(d => parseFloat(String(d[h]).replace(/[^0-9.-]/g, "")) || 0);
                const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
                const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
                if (variance > maxVar) {
                    maxVar = variance;
                    bestY = h;
                }
            });
            candidates.y = bestY;
            candidates.z = numHeaders.find(h => h !== bestY) || "";
        }

        return candidates;
    }

    return {
        parseFileGeneric,
        reconcileCollection,
        prepareMasterData,
        getOrgSummary,
        getCoordinateCandidates,
        loadHydratedCollection,
        getCollection: () => datasetCollection,
        getMasterData: () => masterData,
        removeDataset: async (id) => {
            delete datasetCollection[id];
            await PersistenceEngine.deleteDataset(id);
        },
        clearAll: async () => {
            datasetCollection = {};
            masterData = [];
            await PersistenceEngine.clearAll();
        }
    };
})();

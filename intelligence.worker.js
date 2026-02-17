/**
 * INTELLIGENCE WORKER (v21.0)
 * Responsibilities: Off-thread computation of Strategic Audits, Delta-hashing, Heuristic logic execution.
 */

// Helper: Deterministic Hashing for Delta Detection
function generateHash(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(36);
}

const cleanLabel = (label) => {
    if (!label) return "N/A";
    let cleaned = label.replace(/[_-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/Id$|Key$|Dataset$|Value$/i, '')
        .trim();
    return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const parseVal = (v) => {
    if (typeof v === 'number') return v;
    return parseFloat(String(v || "").replace(/[^0-9.-]/g, "")) || 0;
};

const getStats = (data, x, y) => {
    const nums = data.map(d => parseVal(d[y]));
    if (!nums.length) return { sum: 0, avg: 0, max: 0, topCat: "N/A", sorted: [] };

    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / (nums.length || 1);
    const max = Math.max(...nums) || 0;
    const freq = {};
    data.forEach(d => {
        const k = d[x] || 'N/A';
        freq[k] = (freq[k] || 0) + parseVal(d[y]);
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return { sum, avg, max, topCat: sorted[0] ? sorted[0][0] : "N/A", sorted };
};

self.onmessage = function (e) {
    const { action, payload } = e.data;

    if (action === 'EXECUTE_AUDIT') {
        const { x, y, mode, collection, masterData, history, lastHash } = payload;

        // 1. Delta Detection
        const currentHash = generateHash(masterData);
        const isDelta = currentHash !== lastHash;

        // 2. Perform Analysis
        const ids = Object.keys(collection);
        const rowCount = masterData.length;
        const datasetCount = ids.length;
        const intelligenceDepth = rowCount > 10000 ? 5 : (rowCount > 1000 ? 3 : 2);

        const mainStats = getStats(masterData, x, y);
        const isTemporal = x.toLowerCase().includes('date') || x.toLowerCase().includes('month') || x.toLowerCase().includes('year');

        const analysisResults = {
            version: "v21.0",
            timestamp: new Date().toISOString(),
            hash: currentHash,
            depth: intelligenceDepth,
            isTemporal,
            mainStats,
            labels: { x: cleanLabel(x), y: cleanLabel(y) },
            ingressAudit: [],
            reasoningTrace: [],
            recommendations: [],
            reportSections: [],
            governanceAlerts: [],
            riskIndicators: [],
            opportunitySignals: [],
            isDelta
        };

        // Heuristic Nodes (v21 Evolution)
        if (ids.length > 1) {
            analysisResults.ingressAudit.push(`Multi-Dataset Alignment: ${datasetCount} active sets synthesized.`);
        } else {
            analysisResults.ingressAudit.push(`Single Source Synthesized: ${rowCount.toLocaleString()} nodes.`);
        }

        // Memory Layer: Compare with previous audit if exists
        if (history && history.length > 0) {
            const prev = history[0]; // Most recent
            if (prev.mainStats) {
                const volChange = (((mainStats.sum - prev.mainStats.sum) / (prev.mainStats.sum || 1)) * 100).toFixed(1);
                analysisResults.reasoningTrace.push({
                    text: `Memory Layer Pulse: Strategic Volume shifted by <b>${volChange}%</b> since last audit.`,
                    isHtml: true,
                    status: Math.abs(volChange) > 20 ? 'warning' : 'success'
                });
            }
        }

        const alphaMagnitude = ((mainStats.max / mainStats.avg || 1)).toFixed(2);
        analysisResults.reasoningTrace.push({
            text: `High Alpha Node: <b>${mainStats.topCat}</b> (Alpha: ${alphaMagnitude}x).`,
            isHtml: true
        });

        // Dynamic Strategic Sections
        analysisResults.reportSections = [
            {
                title: "1. Executive Overview",
                content: `Synthesis of ${rowCount.toLocaleString()} data points. Alpha bias detected at ${alphaMagnitude}x.`
            },
            {
                title: "2. Strategic Implications",
                content: `Reliance on ${mainStats.topCat} constitutes ${((mainStats.max / (mainStats.sum || 1)) * 100).toFixed(1)}% of system load.`
            }
        ];

        self.postMessage({ status: 'COMPLETE', results: analysisResults });
    }
};

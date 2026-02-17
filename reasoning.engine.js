/**
 * REASONING ENGINE MODULE (v22.0 Gold - Statistical Intelligence Recovery)
 * Responsibilities: Intelligence orchestration, Delta detection, Business Intelligence Interpretation.
 * UPGRADE: Directive 1 (Full Data Model Statistical Analysis).
 */

const ReasoningEngine = (() => {
    let worker = null;
    let auditHistory = [];
    let lastAnalysisHash = null;
    let workerInitializationFailed = false;

    const generateHash = (data) => {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return hash.toString(36);
    };

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

    /**
     * DIRECTIVE 1: FULL DATA MODEL STATISTICAL ANALYSIS
     */
    const computeFullStats = (data, field) => {
        const nums = data.map(d => parseVal(d[field])).filter(n => !isNaN(n));
        const count = nums.length;
        if (count === 0) return null;

        const sum = nums.reduce((a, b) => a + b, 0);
        const avg = sum / count;
        const sorted = [...nums].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[count - 1];
        const median = count % 2 !== 0 ? sorted[Math.floor(count / 2)] : (sorted[count / 2 - 1] + sorted[count / 2]) / 2;

        const variance = nums.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / count;
        const stdDev = Math.sqrt(variance);

        return {
            mean: avg,
            median,
            variance,
            stdDev,
            min,
            max,
            range: max - min,
            peak: max,
            lowPoint: min,
            sum,
            count
        };
    };

    const computeCorrelation = (data, x, y) => {
        const xVals = data.map(d => parseVal(d[x]));
        const yVals = data.map(d => parseVal(d[y]));
        const n = xVals.length;
        if (n < 2) return 0;
        const sumX = xVals.reduce((a, b) => a + b, 0);
        const sumY = yVals.reduce((a, b) => a + b, 0);
        const sumXY = xVals.reduce((a, v, i) => a + (v * yVals[i]), 0);
        const sumX2 = xVals.reduce((a, v) => a + (v * v), 0);
        const sumY2 = yVals.reduce((a, v) => a + (v * v), 0);
        const numerator = (n * sumXY) - (sumX * sumY);
        const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
        return denominator === 0 ? 0 : numerator / denominator;
    };

    const getCategoricalStats = (data, x, y) => {
        const freq = {};
        data.forEach(d => {
            const k = String(d[x] || 'N/A').trim();
            if (!k || k.toLowerCase() === 'null') return;
            freq[k] = (freq[k] || 0) + parseVal(d[y]);
        });
        let sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        return sorted;
    };

    const biAnalystBrain = (stats, shifts, correlation, xLabel, yLabel, dominantContributor) => {
        const concentration = (stats.max / (stats.sum || 1)) * 100;
        const varianceInterpretation = stats.stdDev / (stats.mean || 1) > 0.5 ? "High Variance (Skewed)" : "Stable Distribution (Balanced)";

        const biInterpretation = {
            operationalState: concentration > 50 ? "Highly Concentrated (Siloed)" : "Balanced (Distributed)",
            concentrationRisk: concentration > 40 ? "Critical Alpha Dependency" : "Stable Diversification",
            stabilityAssessment: Math.abs(shifts.volShift) < 10 ? "Steady-State Operational" : "Volatile Flow Change",
            efficiencyObservation: stats.mean > 0 && stats.stdDev / stats.mean < 0.5 ? "High Precision Flow" : "Dispersed Intensity",
            varianceStatus: varianceInterpretation
        };

        const impactMatrix = [
            {
                label: "Alpha Node Leverage",
                category: stats.max > (stats.mean * 5) ? "High Impact" : "Medium Impact",
                detail: `Dominant contributor [${dominantContributor}] controls ${(concentration).toFixed(1)}% of total volume.`,
                threshold: "Concentration > 40% triggers dependency risk."
            },
            {
                label: "Distribution Stability",
                category: Math.abs(stats.stdDev / (stats.mean || 1)) > 0.8 ? "Critical Risk" : "Stable",
                detail: `Variance measured at ${(stats.variance).toFixed(1)} with a StdDev of ${(stats.stdDev).toFixed(1)}.`,
                threshold: "Variance within operational stability threshold."
            },
            {
                label: "Temporal/Relational Lock",
                category: Math.abs(correlation) > 0.7 ? "Operationally Critical" : "Weak Correlation",
                detail: `${yLabel} shows a ${Math.abs(correlation).toFixed(2)} correlation strength with ${xLabel}.`,
                threshold: "Correlation > 0.7 indicates direct operational dependency."
            }
        ];

        const advisory = [];
        if (concentration > 40) {
            advisory.push({
                action: "DIVERSIFY",
                metric: "Concentration",
                context: `Reduce dependency on dominant nodes ([${dominantContributor}]). High concentration (${concentration.toFixed(1)}%) creates single-point failure risks. Actions should focus on redistributing volume to secondary nodes.`
            });
        }
        if (Math.abs(shifts.volShift) > 15) {
            advisory.push({
                action: "MONITOR",
                metric: "Volatility",
                context: `Significant volume shift detected (${shifts.volShift}%). Validate input integrity and peak stability. Distribution change exceeds the 15% threshold for standard operations.`
            });
        }
        if (stats.stdDev / (stats.mean || 1) > 1.2) {
            advisory.push({
                action: "REDUCE",
                metric: "Dispersion",
                context: `High data variance detected. Streamline operational nodes to improve flow consistency. Targeted stabilization of high-variance segments is recommended.`
            });
        }
        if (advisory.length === 0) {
            advisory.push({
                action: "MAINTAIN",
                metric: "Baseline",
                context: "System operating within balanced parameters. Continue standard monitoring protocol as variance and concentration remain within optimal thresholds."
            });
        }

        return { biInterpretation, impactMatrix, advisory };
    };

    const runAuditLogic = (payload) => {
        const { x, y, mode, collection, masterData, history, lastHash } = payload;
        const currentHash = generateHash(masterData);
        const isDelta = currentHash !== lastHash;

        const firstRow = masterData[0] || {};
        const numericFields = Object.keys(firstRow).filter(k => {
            const v = parseVal(firstRow[k]);
            return !isNaN(v) && typeof firstRow[k] !== 'boolean';
        });

        const statisticsModel = {};
        numericFields.forEach(field => {
            const stats = computeFullStats(masterData, field);
            if (stats) statisticsModel[field] = stats;
        });

        const mainStats = statisticsModel[y] || computeFullStats(masterData, y);
        const correlation = computeCorrelation(masterData, x, y);
        const categorical = getCategoricalStats(masterData, x, y);

        const shifts = { volShift: 0, peakShift: 0 };
        if (history && history.length > 0 && history[0].metrics) {
            const prev = history[0].metrics;
            shifts.volShift = parseFloat((((mainStats.sum - prev.totalVolume) / (prev.totalVolume || 1)) * 100).toFixed(1));
            shifts.peakShift = parseFloat((((mainStats.max - prev.peakMagnitude) / (prev.peakMagnitude || 1)) * 100).toFixed(1));
        }

        const xLab = cleanLabel(x);
        const yLab = cleanLabel(y);
        const dominantContributor = categorical[0] ? categorical[0][0] : "N/A";

        const brain = biAnalystBrain(mainStats, shifts, correlation, xLab, yLab, dominantContributor);

        // Directive 1: Executive Summary Correction
        const concentration = (mainStats.max / (mainStats.sum || 1)) * 100;
        const execSummary = `Dataset identifies a ${brain.biInterpretation.operationalState} state across ${mainStats.count.toLocaleString()} nodes. Main contributor [${dominantContributor}] accounts for ${concentration.toFixed(1)}% of total volume. Operational variance is ${mainStats.stdDev > mainStats.mean ? 'high' : 'stable'}, indicating a ${brain.biInterpretation.efficiencyObservation.toLowerCase()} baseline.`;

        return {
            version: "v22.0",
            timestamp: new Date().toISOString(),
            trackId: 'TRK_' + Math.random().toString(36).substr(2, 5).toUpperCase(),
            hash: currentHash,
            labels: { x: xLab, y: yLab },
            statisticsModel,
            mainStats,
            metrics: {
                totalVolume: mainStats.sum,
                averageIntensity: mainStats.mean,
                peakMagnitude: mainStats.max,
                nodeCount: mainStats.count,
                volShift: shifts.volShift,
                peakShift: shifts.peakShift,
                correlation
            },
            statistics: mainStats,
            interpretation: brain.biInterpretation,
            biInterpretation: brain.biInterpretation,
            impactMatrix: brain.impactMatrix,
            advisory: brain.advisory,
            peaks: {
                point: dominantContributor,
                value: mainStats.max,
                intensity: (mainStats.max / (mainStats.mean || 1)).toFixed(2) + "x"
            },
            ranges: {
                operational: `${mainStats.min.toLocaleString()} → ${mainStats.max.toLocaleString()}`,
                stability: `${(mainStats.mean - mainStats.stdDev).toFixed(2)} → ${(mainStats.mean + mainStats.stdDev).toFixed(2)}`
            },
            dominantDrivers: categorical.slice(0, 5).map(e => ({
                name: e[0],
                value: e[1],
                concentration: ((e[1] / mainStats.sum) * 100).toFixed(1) + "%"
            })),
            distributions: categorical,
            isDelta,
            reportSections: [
                { title: "Executive Summary", content: execSummary },
                { title: "Relational Analysis", content: `A ${Math.abs(correlation) > 0.7 ? 'strong' : (Math.abs(correlation) > 0.4 ? 'moderate' : 'weak')} correlation (${correlation.toFixed(2)}) exists between ${xLab} and ${yLab}.` }
            ]
        };
    };

    function getWorker() {
        if (workerInitializationFailed) return null;
        if (!worker) {
            try {
                const workerCode = `
                    const generateHash = ${generateHash.toString()};
                    const cleanLabel = ${cleanLabel.toString()};
                    const parseVal = ${parseVal.toString()};
                    const computeFullStats = ${computeFullStats.toString()};
                    const computeCorrelation = ${computeCorrelation.toString()};
                    const getCategoricalStats = ${getCategoricalStats.toString()};
                    const biAnalystBrain = ${biAnalystBrain.toString()};
                    const runAuditLogic = ${runAuditLogic.toString()};

                    self.onmessage = function (e) {
                        const { type, payload } = e.data;
                        if (type === 'STAT_AUDIT') {
                            const result = runAuditLogic(payload);
                            self.postMessage({ type: 'STAT_AUDIT_RESULT', result });
                        }
                    };
                `;
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                worker = new Worker(URL.createObjectURL(blob));
                worker.onerror = () => workerInitializationFailed = true;
            } catch (err) {
                workerInitializationFailed = true;
            }
        }
        return worker;
    }

    async function executeAnalysis(x, y, mode, collection, masterData) {
        if (auditHistory.length === 0) {
            const history = await PersistenceEngine.getAuditHistory();
            auditHistory = Array.isArray(history) ? history : [];
        }
        const currentHash = generateHash(masterData);
        const auditConfig = { x, y, mode, collection, masterData, history: auditHistory.slice(0, 5), lastHash: lastAnalysisHash };

        const w = getWorker();
        if (w && !workerInitializationFailed) {
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.warn("Worker Timeout - Falling back to main thread.");
                    resolve(finishAnalysis(runAuditLogic(auditConfig)));
                }, 10000);

                // Directive 4: UI (ReasoningEngine) must listen for STAT_AUDIT_RESULT
                w.onmessage = (e) => {
                    if (e.data.type === 'STAT_AUDIT_RESULT') {
                        clearTimeout(timeout);
                        resolve(finishAnalysis(e.data.result));
                    }
                };

                w.onerror = (err) => {
                    clearTimeout(timeout);
                    console.error("Worker Error", err);
                    workerInitializationFailed = true;
                    resolve(finishAnalysis(runAuditLogic(auditConfig)));
                };

                // Directive 1: Execute immediate trigger
                w.postMessage({ type: 'STAT_AUDIT', payload: auditConfig });
            });
        }
        return finishAnalysis(runAuditLogic(auditConfig));
    }

    function finishAnalysis(results) {
        lastAnalysisHash = results.hash;
        PersistenceEngine.saveAudit(results);
        if (!auditHistory[0] || auditHistory[0].timestamp !== results.timestamp) {
            auditHistory.unshift(results);
        }
        return results;
    }

    async function getHistory() {
        if (auditHistory.length === 0) {
            const history = await PersistenceEngine.getAuditHistory();
            auditHistory = Array.isArray(history) ? history : [];
        }
        return auditHistory;
    }

    return {
        executeAnalysis,
        cleanLabel,
        getHistory,
        clearHistory: () => { auditHistory = []; lastAnalysisHash = null; }
    };
})();

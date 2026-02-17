/**
 * UI RENDERER MODULE (v22.0 Gold - Report Visualization Fix)
 * Responsibilities: DOM updates, Chart generation, Table rendering, Report Assembly.
 * UPGRADE: Directive 1 (Synchronization), Directive 2 (Graphical Embedding), Directive 5 (Completeness).
 */

const UIRenderer = (() => {
    let chartInstance = null;
    let reportChartInstance = null;
    let chartSnapshots = {};

    const formatValue = (val) => {
        if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
        if (Math.abs(val) >= 1000) return (val / 1000).toFixed(1) + 'K';
        return Number.isInteger(val) ? val.toString() : val.toFixed(2);
    };

    const createStat = (l, v) => `
        <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; text-align: center; border: 1px solid rgba(255,255,255,0.02);">
            <div style="font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase;">${l}</div>
            <div style="font-size: 0.85rem; font-weight: 800; color: var(--accent-primary); margin-top: 2px;">${v}</div>
        </div>
    `;

    function safeText(node, value) {
        const el = document.createElement(node);
        el.textContent = value === undefined || value === null ? '' : String(value);
        return el;
    }

    function resetDashboard() {
        document.getElementById('idle-state').style.display = 'flex';
        document.getElementById('dashboard').classList.remove('active');
        document.getElementById('view-title').innerText = "Authority Standby";
        document.getElementById('sync-dot').style.backgroundColor = 'var(--text-muted)';
        document.getElementById('sync-text').innerText = "SYSTEM_READY";
        document.getElementById('dataset-manifest').style.display = 'none';
        if (chartInstance) chartInstance.destroy();
        if (reportChartInstance) reportChartInstance.destroy();
        chartSnapshots = {};
    }

    function updateDatasetManifest(collection, onRemove) {
        const list = document.getElementById('file-list');
        const manifest = document.getElementById('dataset-manifest');
        list.textContent = '';
        const ids = Object.keys(collection);
        if (ids.length === 0) { manifest.style.display = 'none'; return; }
        manifest.style.display = 'flex';
        ids.forEach(id => {
            const ds = collection[id];
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; color: var(--text-main); background: rgba(255,255,255,0.01); padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border);';
            const name = document.createElement('span');
            name.textContent = ds.name.length > 20 ? ds.name.substring(0, 17) + '...' : ds.name;
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '×';
            removeBtn.style.cssText = 'background: none; border: none; color: var(--danger); font-size: 1rem; cursor: pointer; padding: 0 4px;';
            removeBtn.onclick = (e) => { e.stopPropagation(); onRemove(id); };
            item.appendChild(name);
            item.appendChild(removeBtn);
            list.appendChild(item);
        });
    }

    function populateSelectors(allHeaders, sharedHeaders, mode) {
        const x = document.getElementById('x-axis');
        const y = document.getElementById('y-axis');
        const currentX = x.value;
        const currentY = y.value;
        const state = DataEngine.reconcileCollection(mode);
        const schemas = state.schemas || {};
        const firstId = Object.keys(schemas)[0];
        const schema = firstId ? schemas[firstId] : { numerical: [], categorical: [], temporal: [] };
        x.textContent = y.textContent = '';
        const targetHeaders = mode === 'single' ? allHeaders : sharedHeaders;
        targetHeaders.forEach(h => {
            const isNumeric = schema.numerical.includes(h);
            const isTemporal = schema.temporal.includes(h);
            const optX = safeText('option', h + (isTemporal ? ' (T)' : ''));
            optX.value = h;
            x.appendChild(optX);
            const optY = safeText('option', h + (isNumeric ? ' (N)' : ''));
            optY.value = h;
            y.appendChild(optY);
        });
        if (currentX && targetHeaders.includes(currentX)) x.value = currentX;
        else if (schema.categorical.length > 0) x.value = schema.categorical[0];
        if (currentY && targetHeaders.includes(currentY)) y.value = currentY;
        else if (schema.numerical.length > 0) y.value = schema.numerical[0];
    }

    function renderKPIs(role, data, yCol, mode, datasetCount) {
        const row = document.getElementById('kpi-out');
        row.textContent = '';
        const results = window.lastAnalysisResults;
        const parseVal = (v) => parseFloat(String(v || "").replace(/[^0-9.-]/g, "")) || 0;
        const nums = data.map(d => parseVal(d[yCol]));
        const sum = nums.reduce((a, b) => a + b, 0);
        const cert = AdminConsole.verifyCertification(results);

        let displayStats = [];
        if (role === 'admin') {
            displayStats = [
                ['Execution Integrity', cert.certified ? 'VERIFIED' : 'UNVERIFIED'],
                ['Trace ID', results?.trackId || 'N/A'],
                ['Enclave State', results ? 'STABLE' : 'WAITING'],
                ['Certification', cert.certified ? 'CERTIFIED' : 'PARTIAL']
            ];
        } else if (role === 'executive') {
            displayStats = [
                ['System Authority Magnitude', formatValue(sum), results?.metrics?.volShift],
                ['Operational Authority State', results?.interpretation?.operationalState || 'Syncing'],
                ['Authority Data Sources', datasetCount],
                ['System Governance Status', cert.certified ? 'VERIFIED' : 'PENDING']
            ];
        } else {
            displayStats = [
                ['BI Pulse ID', results?.trackId || 'v22.0'],
                ['Peak Influence', results?.peaks?.intensity || '0x'],
                ['Relational Sync', (results?.metrics?.correlation || 0).toFixed(2)],
                ['Impact Level', results?.impactMatrix?.[0]?.category || 'Stable']
            ];
        }

        displayStats.forEach(([l, v, shift]) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.appendChild(safeText('p', l)).className = 'kpi-h';
            const valWrap = document.createElement('div');
            valWrap.style.cssText = 'display: flex; align-items: baseline; gap: 8px;';
            const valEl = safeText('span', v);
            valEl.className = 'kpi-v';
            valWrap.appendChild(valEl);
            if (shift !== undefined && shift !== 0) {
                const shiftEl = safeText('span', (shift > 0 ? '↗' : '↘') + ' ' + Math.abs(shift) + '%');
                shiftEl.style.cssText = `font-size: 0.7rem; font-weight: 800; color: var(--${shift > 0 ? 'success' : 'danger'})`;
                valWrap.appendChild(shiftEl);
            }
            card.appendChild(valWrap);
            row.appendChild(card);
        });
    }

    function renderChart(type, xCol, yCol, mode, collection, masterData) {
        if (chartInstance) chartInstance.destroy();
        const results = window.lastAnalysisResults;
        if (!results || !results.distributions) return;
        let agg = results.distributions.filter(e => e[0] && e[0] !== 'N/A' && e[0] !== 'null');
        if (agg.length < 1) return;
        if (agg.length > 20) {
            const top = agg.slice(0, 15);
            const others = agg.slice(15).reduce((acc, e) => acc + e[1], 0);
            top.push(["[Other Clusters]", others]);
            agg = top;
        }
        if (agg.length === 1) agg.push(["Reference Baseline", agg[0][1] * 0.05]);
        const premiumColors = ['#0ea5e9', '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
        const isRadial = ['pie', 'doughnut', 'polarArea', 'radar'].includes(type);
        const chartData = {
            labels: agg.map(e => e[0]),
            datasets: [{
                label: `BI Magnitude: ${yCol}`,
                data: agg.map(e => e[1]),
                backgroundColor: isRadial ? premiumColors : agg.map((e, i) => i === 0 ? '#0ea5e9' : '#0ea5e966'),
                borderColor: '#0ea5e9',
                borderWidth: 1.5,
                borderRadius: 4
            }]
        };
        const maxVal = Math.max(...agg.map(e => e[1]));
        const axisMax = maxVal * 1.15;
        window.requestAnimationFrame(() => {
            const canvas = document.getElementById('canvas');
            chartInstance = new Chart(canvas.getContext('2d'), {
                type: type,
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        onComplete: () => {
                            chartSnapshots.mainEffect = canvas.toDataURL("image/png");
                        }
                    },
                    plugins: {
                        legend: { display: isRadial, position: 'right', labels: { color: '#94a3b8', font: { size: 10 } } },
                        tooltip: { callbacks: { label: (c) => `Value: ${formatValue(c.raw)}` } }
                    },
                    scales: isRadial ? {} : {
                        y: { max: axisMax, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', callback: (v) => formatValue(v) } },
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 }, maxRotation: 45 } }
                    }
                }
            });
        });
    }

    /**
     * DIRECTIVE 1, 2, 3, 5 & 6: REPORT ASSEMBLY & BI INTERPRETATION
     */
    function renderAnalysis(results) {
        const reportText = document.getElementById('report-text');
        reportText.textContent = '';
        const cert = AdminConsole.verifyCertification(results);

        // Directive 6: Completeness Validation
        const validateBICompleteness = (res) => {
            const checks = [
                !!res.reportSections?.[0], // Exec Summary
                !!res.statisticsModel,     // Stats present
                !!res.distributions,       // Graph data present
                !!res.impactMatrix,        // Impact justified
                !!res.advisory             // Advisory generated
            ];
            return checks.every(c => c === true);
        };

        const isComplete = validateBICompleteness(results);

        // Certification Badge (Directive 4: System Authority Alignment)
        const certBadge = document.createElement('div');
        certBadge.style.cssText = `display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 25px; padding: 12px; border-radius: 8px; background: ${cert.certified && isComplete ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; border: 1px solid ${cert.certified && isComplete ? 'var(--success)' : 'var(--accent-secondary)'};`;
        certBadge.innerHTML = `
            <i data-lucide="${cert.certified && isComplete ? 'shield-check' : 'shield-alert'}" color="${cert.certified && isComplete ? 'var(--success)' : 'var(--accent-secondary)'}" size="20"></i>
            <span style="font-weight: 800; font-size: 0.8rem; color: ${cert.certified && isComplete ? 'var(--success)' : 'var(--accent-secondary)'}; letter-spacing: 0.1em; text-transform: uppercase;">
                CERTIFIED BY SYSTEM AUTHORITY — ${isComplete ? (cert.certified ? 'DETERMINISTIC_INTEL_VERIFIED' : 'PARTIAL_AUTHORITY_SYNC') : 'ANALYTICALLY_INCOMPLETE'}
            </span>
        `;
        reportText.appendChild(certBadge);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // 1. Executive Summary (Directive 1)
        const summary = document.createElement('div');
        summary.className = 'section';
        summary.innerHTML = `
            <div style="font-size: 0.65rem; color: var(--accent-primary); font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">1. Executive Summary</div>
            <p style="font-size: 0.95rem; line-height: 1.6; color: white; background: rgba(56,189,248,0.05); padding: 15px; border-radius: 8px; border-left: 3px solid var(--accent-primary);">
                ${results.reportSections[0].content}
            </p>
        `;
        reportText.appendChild(summary);

        // 2. Full Statistical Visibility (Directive 2: System Authority Statistics)
        const statsBox = document.createElement('div');
        statsBox.style.cssText = "margin-top: 25px; background: rgba(15,23,42,0.4); padding: 20px; border-radius: 12px; border: 1px solid var(--border);";
        const s = results.statistics;
        const vRatio = s.stdDev / (s.mean || 1);
        statsBox.innerHTML = `
            <div style="font-size: 0.65rem; color: var(--accent-primary); font-weight: 900; text-transform: uppercase; margin-bottom: 15px;">2. System Authority — Deterministic Statistics</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                ${createStat('Mean Value', formatValue(s.mean))}
                ${createStat('Median Value', formatValue(s.median))}
                ${createStat('Standard Dev', formatValue(s.stdDev))}
                ${createStat('Minimum', formatValue(s.min))}
                ${createStat('Maximum', formatValue(s.max))}
                ${createStat('Operational Range', s.range.toLocaleString())}
                ${createStat('Peak Contributor', results.peaks.point)}
                ${createStat('Intensity Bias', results.peaks.intensity)}
                ${createStat('Stability Threshold', vRatio.toFixed(2))}
            </div>
            <div style="margin-top: 15px; font-size: 0.8rem; color: #94a3b8; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05);">
                <strong>Statistical Interpretation:</strong> ${vRatio > 0.8 ? 'High variance indicates uneven distribution across nodes.' : 'Variance within operational stability threshold, indicating balanced flow.'} ${s.max > s.mean * 3 ? 'Significant alpha Bias detected in peak segments.' : 'Distribution shows no extreme single-node dominance.'}
            </div>
        `;
        reportText.appendChild(statsBox);

        // 3. Impact Classification Matrix (Directive 4)
        const matrixHeader = document.createElement('div');
        matrixHeader.innerHTML = `<div style="font-size: 0.65rem; color: var(--accent-primary); font-weight: 900; text-transform: uppercase; margin-top: 25px; margin-bottom: 12px;">3. Impact Classification & Justification</div>`;
        reportText.appendChild(matrixHeader);

        const matrixGrid = document.createElement('div');
        matrixGrid.style.cssText = "display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;";
        results.impactMatrix.forEach(item => {
            const card = document.createElement('div');
            const color = item.category.includes('High') || item.category.includes('Critical') ? 'var(--danger)' : (item.category.includes('Medium') ? 'var(--accent-secondary)' : 'var(--success)');
            card.style.cssText = `background: rgba(15,23,42,0.4); padding: 12px; border-radius: 8px; border: 1px solid var(--border); border-top: 3px solid ${color}; display: flex; flex-direction: column; gap: 8px;`;
            card.innerHTML = `
                <div>
                    <div style="font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase;">Condition: ${item.label}</div>
                    <div style="font-size: 0.8rem; font-weight: 800; color: ${color}; margin-top: 2px;">${item.category}</div>
                </div>
                <div style="font-size: 0.75rem; color: #f1f5f9; line-height: 1.4;">${item.detail}</div>
                <div style="font-size: 0.6rem; color: var(--text-muted); font-style: italic; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px;">Trigger: ${item.threshold}</div>
            `;
            matrixGrid.appendChild(card);
        });
        reportText.appendChild(matrixGrid);

        // 4. Graphical Evidence Interpretation (Directive 1, 2, 3 Stability)
        const distributionBox = document.createElement('div');
        distributionBox.style.cssText = "margin-top: 35px; display: flex; flex-direction: column; gap: 20px;";

        const concentration = (results.statistics.max / (results.statistics.sum || 1)) * 100;
        const graphInterpretation = `The distribution chart highlights ${concentration > 30 ? 'strong dominance' : 'balanced participation'} in cluster [${results.peaks.point}]. Total volume flows primarily through top ${results.dominantDrivers.length} nodes, with ${concentration.toFixed(1)}% concentration in the primary coordinate. ${results.statistics.stdDev > results.statistics.mean ? 'Significant imbalance detected across the operational tail.' : 'Distribution participation remains stable across lower-tier clusters.'}`;

        distributionBox.innerHTML = `
            <div style="font-size: 0.65rem; color: var(--accent-primary); font-weight: 900; text-transform: uppercase;">4. Graphical Evidence & Distribution Interpretation</div>
            <div style="background: rgba(15,23,42,0.4); padding: 25px; border-radius: 12px; border: 1px solid var(--border); min-height: 320px; width: 100%; display: block; position: relative;">
                <canvas id="bi-report-canvas" style="display: block; width: 100%; height: 270px;"></canvas>
            </div>
            <div style="background: rgba(56, 189, 248, 0.03); border: 1px dashed var(--accent-primary); padding: 18px; border-radius: 8px; font-size: 0.85rem; color: #cbd5e1; line-height: 1.6; display: block; width: 100%; word-wrap: break-word; box-sizing: border-box;">
                <strong style="display: block; margin-bottom: 6px; color: var(--accent-primary);">Visual Interpretation:</strong> ${graphInterpretation}
            </div>
        `;

        const driversGrid = document.createElement('div');
        driversGrid.style.cssText = "display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;";
        results.dominantDrivers.forEach(d => {
            const div = document.createElement('div');
            div.style.cssText = "padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid rgba(255,255,255,0.02); text-align: center;";
            div.innerHTML = `<div style="font-size: 0.5rem; color: var(--text-muted); text-transform: uppercase;">${d.name}</div><div style="font-size: 0.8rem; font-weight: 800; color: #38bdf8; margin-top: 2px;">${d.concentration}</div>`;
            driversGrid.appendChild(div);
        });
        distributionBox.appendChild(driversGrid);
        reportText.appendChild(distributionBox);

        // 5. Business Intelligence Advisory (Directive 5)
        const advisoryHeader = document.createElement('div');
        advisoryHeader.innerHTML = `<div style="font-size: 0.65rem; color: var(--accent-primary); font-weight: 900; text-transform: uppercase; margin-top: 25px; margin-bottom: 12px;">5. Business Intelligence Strategic Advisory</div>`;
        reportText.appendChild(advisoryHeader);

        const advisoryList = document.createElement('div');
        advisoryList.style.cssText = "display: flex; flex-direction: column; gap: 12px;";
        results.advisory.forEach(item => {
            const isCritical = item.action === 'DIVERSIFY' || item.action === 'REDUCE';
            const div = document.createElement('div');
            div.style.cssText = `padding: 15px; background: ${isCritical ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)'}; border-left: 4px solid ${isCritical ? 'var(--danger)' : 'var(--success)'}; border-radius: 8px; font-size: 0.9rem;`;
            div.innerHTML = `
                <div style="font-weight: 800; color: ${isCritical ? 'var(--danger)' : 'var(--success)'}; text-transform: uppercase; font-size: 0.75rem; margin-bottom: 5px;">${item.action} : ${item.metric}</div>
                <div style="color: #cbd5e1; line-height: 1.6;">${item.context}</div>
            `;
            advisoryList.appendChild(div);
        });
        reportText.appendChild(advisoryList);

        // Report Chart Render
        setTimeout(() => {
            const rCanvas = document.getElementById('bi-report-canvas');
            const rCtx = rCanvas?.getContext('2d');
            if (rCtx) {
                if (reportChartInstance) reportChartInstance.destroy();
                const distData = results.distributions.slice(0, 10);
                reportChartInstance = new Chart(rCtx, {
                    type: 'bar',
                    data: {
                        labels: distData.map(d => d[0]),
                        datasets: [{ label: 'Intensity', data: distData.map(d => d[1]), backgroundColor: distData.map((d, i) => i === 0 ? '#38bdf8' : '#38bdf844'), borderRadius: 4 }]
                    },
                    options: {
                        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                        animation: {
                            onComplete: () => {
                                chartSnapshots.reportChart = rCanvas.toDataURL("image/png");
                            }
                        },
                        plugins: { legend: { display: false } },
                        scales: { x: { display: false }, y: { grid: { display: false }, ticks: { color: 'white', font: { size: 9 } } } }
                    }
                });
            }
        }, 50);

        // Sidebar update
        const integrity = document.getElementById('audit-integrity');
        const leaks = document.getElementById('audit-leaks');
        const upgrades = document.getElementById('audit-upgrades');
        if (integrity && leaks && upgrades) {
            integrity.innerHTML = `<li><span style="color:var(--accent-primary)">State:</span> ${results.interpretation.operationalState}</li><li><span style="color:var(--text-muted)">Stability:</span> ${results.interpretation.varianceStatus}</li>`;
            leaks.innerHTML = results.impactMatrix.filter(m => m.category.includes('High') || m.category.includes('Critical')).map(m => `<li style="color:var(--danger)">[${m.category.toUpperCase()}] ${m.label}</li>`).join('') || '<li>Balanced Distribution.</li>';
            upgrades.innerHTML = results.advisory.map(a => `<li style="color:var(--success)">[${a.action}] ${a.metric}</li>`).join('');
        }
    }

    function renderTable(data) {
        const table = document.getElementById('data-table');
        if (!data || data.length === 0) return;
        table.textContent = '';
        const headers = Object.keys(data[0]);
        const thead = document.createElement('thead');
        const trH = document.createElement('tr');
        headers.forEach(h => {
            const th = safeText('th', h);
            th.style.cssText = "padding: 12px 15px; border-bottom: 2px solid var(--border); color: #38bdf8; text-transform: uppercase; font-size: 0.65rem; font-weight: 900;";
            trH.appendChild(th);
        });
        thead.appendChild(trH);
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        data.slice(0, 50).forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(h => tr.appendChild(safeText('td', row[h] || '-')).style.padding = "10px 15px");
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
    }

    return {
        safeText, resetDashboard, updateDatasetManifest, populateSelectors,
        renderKPIs, renderChart, renderTable, renderAnalysis,
        getSnapshots: () => chartSnapshots
    };
})();

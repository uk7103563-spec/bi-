/**
 * APP CORE MODULE (v22.0 Gold - Report Visualization Fix)
 * Responsibilities: Application bootstrap, Event routing, Report Export Logic.
 * UPGRADE: Directive 3 (Sequencing), Directive 4 (PDF Correction), Directive 5 (Completeness Validation).
 */

const AppCore = (() => {

    let refreshTimer;

    async function init() {
        if (typeof lucide !== 'undefined') lucide.createIcons();
        setupEventListeners();

        await PersistenceEngine.init();
        await DataEngine.loadHydratedCollection();

        // Restore analysis history and current result (Directive 4 & 5 Restoration)
        const history = await ReasoningEngine.getHistory();
        if (history && history.length > 0) {
            window.lastAnalysisResults = history[0];
            AdminConsole.logActivity("Session Restored: Previous analytics recovered.");
        }

        if (Object.keys(DataEngine.getCollection()).length > 0) {
            DataEngine.prepareMasterData('single');
            syncState();
        }

        restoreSession();

        startRefreshMonitor();
        AdminConsole.logActivity("v22.0 Gold Governance Authority Unit Active.");
    }

    function setupEventListeners() {
        document.addEventListener('mousemove', () => {
            const roleEl = document.getElementById('role');
            if (roleEl && roleEl.value === 'admin') AdminConsole.startSecurityTimer();
        });
        document.addEventListener('keypress', () => {
            const roleEl = document.getElementById('role');
            if (roleEl && roleEl.value === 'admin') AdminConsole.startSecurityTimer();
        });
    }

    async function handleIngress(input) {
        const files = Array.from(input.files);
        if (files.length === 0) return;

        AdminConsole.logActivity(`Ingress Triggered: ${files.length} sources identified.`);
        showLoader("ANALYSIS RUNNING...");

        try {
            for (const file of files) {
                const id = 'ds_' + Math.random().toString(36).substr(2, 9);
                await DataEngine.parseFileGeneric(file, id);
            }

            AdminConsole.logActivity("Ingress Complete: Enclave collection synchronized.");
            syncState();
            await autoTrigger();
        } catch (err) {
            AdminConsole.logActivity(`Critical Error: ${err.message}`);
            alert(`Governance Alert: ${err.message}.`);
        } finally {
            hideLoader();
        }
    }

    function syncState() {
        const mode = 'single';
        const state = DataEngine.reconcileCollection(mode);

        UIRenderer.updateDatasetManifest(DataEngine.getCollection(), async (id) => {
            await DataEngine.removeDataset(id);
            syncState();
        });

        const candidates = DataEngine.getCoordinateCandidates();
        const x = document.getElementById('x-axis');
        const y = document.getElementById('y-axis');

        UIRenderer.populateSelectors(state.allHeaders, state.sharedHeaders, mode);

        if (!x.value && candidates.x) x.value = candidates.x;
        if (!y.value && candidates.y) y.value = candidates.y;

        document.getElementById('mem-indicator').style.display = 'block';
        document.getElementById('mem-val').textContent = state.estMem;
        document.getElementById('timer').innerText = `Authority Ready | v22.0 | ${new Date().toLocaleTimeString()}`;

        if (document.getElementById('admin-readiness')) {
            document.getElementById('admin-axis').innerText = x.value && y.value ? "MAPPED" : "DISCOVERY";
            document.getElementById('admin-axis').style.color = x.value && y.value ? "var(--success)" : "var(--accent-secondary)";
        }
    }

    async function autoTrigger() {
        const x = document.getElementById('x-axis').value;
        const y = document.getElementById('y-axis').value;

        // Ensure master data is prepared before checking (Directive 1 Restoration)
        DataEngine.prepareMasterData('single');
        const masterData = DataEngine.getMasterData();

        if (x && y && masterData && masterData.length > 0) {
            await triggerAudit(true);
        } else {
            finalizeView();
        }
    }

    async function activateAnalytics() {
        await autoTrigger();
    }

    function finalizeView(showReportIfAvailable = true) {
        const masterData = DataEngine.getMasterData();
        const collection = DataEngine.getCollection();

        if (!masterData || masterData.length === 0) {
            UIRenderer.resetDashboard();
            return;
        }

        saveConfig();
        const role = document.getElementById('role').value;
        const xVal = document.getElementById('x-axis').value;
        const yVal = document.getElementById('y-axis').value;
        const gType = document.getElementById('graph').value;

        document.getElementById('idle-state').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');

        const headers = {
            'executive': ['Executive Intelligence Cockpit', 'System Authority strategic insight and operational summaries.'],
            'analyst': ['Strategic BI Interpretation Unit', 'Human-in-the-loop interpretation of System Authority Analysis.'],
            'admin': ['Governance Observability Console', 'System Authority verification and integrity monitoring.']
        };

        const h = headers[role] || headers['analyst'];
        document.getElementById('view-title').innerText = h[0];
        document.getElementById('view-desc').innerText = h[1];

        // Directive 5: Fix report visibility logic
        const hasResults = !!(window.lastAnalysisResults && window.lastAnalysisResults.distributions);
        document.getElementById('analyst-view').style.display = (role === 'analyst' && hasResults && showReportIfAvailable) ? 'flex' : 'none';
        document.getElementById('admin-view').style.display = role === 'admin' ? 'block' : 'none';

        UIRenderer.renderKPIs(role, masterData, yVal, 'single', Object.keys(collection).length);
        UIRenderer.renderChart(gType, xVal, yVal, 'single', collection, masterData);

        if (role === 'executive') {
            document.getElementById('executive-data-view').style.display = 'flex';
            UIRenderer.renderTable(masterData);
        } else {
            document.getElementById('executive-data-view').style.display = 'none';
        }

        if (role === 'admin') {
            AdminConsole.renderTrace();
            AdminConsole.startSecurityTimer();
            if (hasResults) {
                UIRenderer.renderAnalysis(window.lastAnalysisResults);
                AdminConsole.auditPersistence(masterData);
            }
        }

        if (hasResults && role === 'analyst') {
            UIRenderer.renderAnalysis(window.lastAnalysisResults);
        }

        const state = DataEngine.reconcileCollection('single');
        document.getElementById('sync-text').innerText = state.diagnostics.readiness === 100 ? "AUTHORITY_VERIFIED" : "SYNC_ACTIVE";
        document.getElementById('sync-dot').style.backgroundColor = 'var(--success)';

        if (document.getElementById('admin-readiness')) {
            const res = window.lastAnalysisResults;
            const cert = AdminConsole.verifyCertification(res);
            document.getElementById('admin-readiness').innerText = cert.status;
            document.getElementById('admin-readiness').style.color = cert.certified ? 'var(--success)' : 'var(--accent-secondary)';
            document.getElementById('admin-comp').innerText = res ? "100%" : (state.diagnostics.readiness + "%");
        }
    }

    /**
     * DIRECTIVE 3: SEQUENTIAL EXECUTION ENFORCEMENT
     */
    async function triggerAudit(isAuto = false) {
        // Validation (Directive 2)
        const xVal = document.getElementById('x-axis').value;
        const yVal = document.getElementById('y-axis').value;
        const collection = DataEngine.getCollection();
        const datasetLoaded = Object.keys(collection).length > 0;

        if (!datasetLoaded) {
            AdminConsole.logActivity("Audit Blocked: Dataset not loaded.");
            if (!isAuto) alert("Dataset not loaded");
            return;
        }
        if (!xVal) {
            AdminConsole.logActivity("Audit Blocked: X-Axis missing.");
            if (!isAuto) alert("Select Coordinate Mapping");
            return;
        }
        if (!yVal) {
            AdminConsole.logActivity("Audit Blocked: Y-Axis missing.");
            if (!isAuto) alert("Select Target Metric");
            return;
        }

        // Ensure master data is prepared (Directive 1 Restoration)
        DataEngine.prepareMasterData('single');
        const masterData = DataEngine.getMasterData();

        if (!masterData || masterData.length === 0) {
            AdminConsole.logActivity("Audit Blocked: Empty Enclave.");
            return;
        }

        AdminConsole.logActivity(`Audit Cycle Initiated: MAP_${xVal}_${yVal}`);

        // Directive 3: Execution State Handling
        const btn = document.querySelector('.btn-activate');
        if (btn) btn.disabled = true;
        if (!isAuto) showLoader("ANALYSIS RUNNING...");

        try {
            // STEP 1: Worker Analysis (Directive 1: worker.postMessage handled via ReasoningEngine)
            const results = await ReasoningEngine.executeAnalysis(xVal, yVal, 'single', collection, masterData);
            window.lastAnalysisResults = results;

            // STEP 2: UI Rendering (Directive 4: UI confirms result received)
            UIRenderer.renderAnalysis(results);

            // STEP 3: Finalize & Enable Reporting (Directive 5)
            finalizeView(true);

            AdminConsole.logActivity(`Intelligence Cycle Synchronized: ${results.trackId}`);
        } catch (err) {
            AdminConsole.logActivity(`Audit Exception: ${err.message}`);
            console.error("Audit Fail", err);
        } finally {
            if (btn) btn.disabled = false;
            if (!isAuto) hideLoader();
        }
    }

    function saveConfig() {
        const cfg = {
            role: document.getElementById('role').value,
            x: document.getElementById('x-axis').value,
            y: document.getElementById('y-axis').value,
            graph: document.getElementById('graph').value
        };
        sessionStorage.setItem('bi_state_config', JSON.stringify(cfg));
    }

    function restoreSession() {
        const urlParams = new URLSearchParams(window.location.search);
        const roleParam = urlParams.get('role');

        let cfg = {};
        const state = sessionStorage.getItem('bi_state_config');
        if (state) {
            try {
                cfg = JSON.parse(state);
            } catch (e) { }
        }

        // URL parameter takes precedence for role (e.g. from admin.html)
        if (roleParam) cfg.role = roleParam;

        if (cfg.role === 'admin' && sessionStorage.getItem('admin_auth') !== 'true') {
            cfg.role = 'analyst';
        }

        if (document.getElementById('role')) document.getElementById('role').value = cfg.role || 'analyst';
        if (document.getElementById('graph')) document.getElementById('graph').value = cfg.graph || 'bar';

        // Finalize UI if results exist (Directive 5)
        if (window.lastAnalysisResults) {
            finalizeView(true);
        } else {
            UIRenderer.resetDashboard();
        }
    }

    function showLoader(msg) {
        const l = document.getElementById('loader');
        l.style.display = 'flex';
        l.querySelector('p').textContent = msg;
    }

    function hideLoader() {
        document.getElementById('loader').style.display = 'none';
    }

    async function handleRoleChange() {
        const role = document.getElementById('role').value;
        if (role === 'admin' && sessionStorage.getItem('admin_auth') !== 'true') {
            window.location.href = 'admin.html';
            return;
        }
        AdminConsole.logActivity(`Perspective Shift: ${role.toUpperCase()}`);
        UIRenderer.resetDashboard();
        if (Object.keys(DataEngine.getCollection()).length > 0) await autoTrigger();
    }

    /**
     * DIRECTIVE 4 & 5: REPORT COMPLETENESS VALIDATION & PDF EXPORT
     */
    function validateReportCompleteness(results, snapshots) {
        const checks = {
            summary: !!results.reportSections?.[0],
            stats: !!results.statisticsModel,
            graph: !!snapshots.reportChart,
            peaks: !!results.peaks,
            advisory: results.advisory?.length > 0
        };
        return Object.values(checks).every(v => v === true);
    }

    function exportReport() {
        const results = window.lastAnalysisResults;
        const snapshots = UIRenderer.getSnapshots();
        if (!results) return;

        if (!validateReportCompleteness(results, snapshots)) {
            alert("REPORT STATUS: INCOMPLETE — EXPORT BLOCKED. Please wait for graph rendering to complete.");
            AdminConsole.logActivity("Export Blocked: Incomplete Intelligence Artifact.");
            return;
        }

        const cert = AdminConsole.verifyCertification(results);
        const reportContent = document.getElementById('report-text').cloneNode(true);

        // Replace canvas with image snapshot for PDF compatibility (Directive 2)
        const reportCanvas = reportContent.querySelector('#bi-report-canvas');
        if (reportCanvas && snapshots.reportChart) {
            const img = document.createElement('img');
            img.src = snapshots.reportChart;
            img.style.width = "100%";
            img.style.borderRadius = "8px";
            img.style.display = "block";
            const parent = reportCanvas.parentElement;
            parent.innerHTML = '';
            parent.appendChild(img);
        }

        // Add missing CSS variables and robust print styling (Directive 4 Correction)
        let reportHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>STRATEGIC BI REPORT | ${results.trackId}</title>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
                <style>
                    :root { 
                        --bg-primary: #020617;
                        --bg-secondary: #0f172a;
                        --accent-primary: #38bdf8; 
                        --accent-secondary: #818cf8;
                        --border: #1e293b; 
                        --success: #10b981; 
                        --danger: #ef4444; 
                        --text-main: #f8fafc;
                        --text-muted: #64748b;
                    }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Outfit', sans-serif; 
                        background: #070b14; 
                        color: var(--text-main); 
                        padding: 40px; 
                        line-height: 1.6; 
                        -webkit-print-color-adjust: exact;
                    }
                    .header { 
                        border-bottom: 2px solid var(--accent-primary); 
                        padding-bottom: 20px; 
                        margin-bottom: 30px; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-end; 
                    }
                    .h1 { font-weight: 800; font-size: 1.8rem; color: var(--accent-primary); margin: 0; }
                    .cert-badge { 
                        color: ${cert.certified ? 'var(--success)' : '#f59e0b'}; 
                        font-weight: 800; 
                        font-size: 0.7rem; 
                        border: 1px solid; 
                        padding: 6px 16px; 
                        border-radius: 6px; 
                        text-transform: uppercase; 
                        letter-spacing: 0.1em;
                    }
                    .report-body-container { 
                        background: rgba(15,23,42,0.8); 
                        border: 1px solid var(--border); 
                        padding: 30px; 
                        border-radius: 16px; 
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                        display: flex;
                        flex-direction: column;
                        gap: 25px;
                    }
                    .section { margin-bottom: 35px; display: block; width: 100%; }
                    img { max-width: 100%; height: auto; display: block; margin: 15px 0; border-radius: 8px; }
                    @media print { 
                        body { padding: 20px; background: #070b14 !important; } 
                        .report-body-container { border: none; box-shadow: none; background: transparent !important; gap: 40px; }
                        .section { page-break-inside: avoid; margin-bottom: 50px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="h1">OFFICIAL STRATEGIC BI REPORT</div>
                        <div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 8px;">
                            ID: ${results.trackId} | v22.0 | ${new Date().toLocaleString()}
                        </div>
                    </div>
                    <div class="cert-badge">${cert.certified ? 'GOVERNANCE_CERTIFIED' : 'PARTIAL_VERIFICATION'}</div>
                </div>
                <div class="report-body-container">
                    ${reportContent.innerHTML}
                </div>
                <footer style="margin-top: 40px; border-top: 1px solid var(--border); padding-top: 20px; color: var(--text-muted); font-size: 0.7rem; text-align: center;">
                    DETERMINISTIC_INTELLIGENCE_ENCLAVE | INDIA-HQ_STATION | REPRO_HASH: ${results.hash}
                </footer>
                <script>
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                            // Optional: window.close() after printing, but let's keep it open for verification
                        }, 1000);
                    };
                </script>
            </body>
            </html>
        `;

        // Modern Export Pipeline (Directive 4 Improvement)
        // Using Blob URL is more robust against 'about:blank' blocking and local file protocol limits
        try {
            const blob = new Blob([reportHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const reportWindow = window.open(url, '_blank');

            if (!reportWindow) {
                alert("POPUP BLOCKED: Please allow popups to export the report.");
                AdminConsole.logActivity("Export Failed: Popup Blocked.");
            } else {
                AdminConsole.logActivity(`Report Exported: ${results.trackId}`);
            }
        } catch (err) {
            console.error("Export Error:", err);
            AdminConsole.logActivity("Export Error: Critical Pipeline Exception.");
        }
    }

    function startRefreshMonitor() {
        if (refreshTimer) clearInterval(refreshTimer);
        const interval = 60000;
        refreshTimer = setInterval(() => triggerLiveRefresh(true), interval);
    }

    async function triggerLiveRefresh(isAuto = false) {
        try {
            const xVal = document.getElementById('x-axis').value;
            const yVal = document.getElementById('y-axis').value;
            const masterData = DataEngine.getMasterData();

            if (xVal && yVal && masterData && masterData.length > 0) {
                const results = await ReasoningEngine.executeAnalysis(xVal, yVal, 'single', DataEngine.getCollection(), masterData);
                window.lastAnalysisResults = results;
                UIRenderer.renderAnalysis(results);
                AdminConsole.logActivity("Silent Pulse: Integrity Cycle Sync Complete.");
                finalizeView(true);
            }
        } catch (err) { console.error("Silent Sync Error", err); }
    }

    return {
        init, handleIngress, activateAnalytics, triggerAudit, handleRoleChange,
        autoTrigger, triggerLiveRefresh, startRefreshMonitor, lockSystem: AdminConsole.lockSystem,
        auditPersistence: () => AdminConsole.auditPersistence(DataEngine.getMasterData()),
        finalizeUI: (show = true) => finalizeView(show), exportReport
    };
})();

window.onload = AppCore.init;

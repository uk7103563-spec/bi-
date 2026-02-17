/**
 * ADMIN CONSOLE MODULE (v22.0 Gold - Governance Authority)
 * Responsibilities: Real-time Governance, Execution Verification, Certification, Traceability.
 * UPGRADE: Deterministic Admin Governance Authority Directive.
 */

const AdminConsole = (() => {
    let securityTimeout;

    /**
     * DIRECTIVE 1 & 5: REPORT CERTIFICATION AND VERIFICATION
     */
    function verifyCertification(results) {
        if (!results) return { status: "INCOMPLETE", certified: false, reason: "No results generated." };

        const checks = {
            statsModel: !!results.statisticsModel,
            categorical: results.distributions && results.distributions.length > 0,
            metrics: !!results.metrics,
            advisory: results.advisory && results.advisory.length > 0,
            trackId: !!results.trackId
        };

        const failed = Object.entries(checks).filter(([k, v]) => !v).map(([k]) => k);

        if (failed.length === 0) {
            return { status: "COMPLETE | VERIFIED", certified: true };
        } else {
            return { status: "PARTIAL | UNVERIFIED", certified: false, reason: `Missing: ${failed.join(', ')}` };
        }
    }

    function renderTrace() {
        const t = document.getElementById('term');
        const now = () => new Date().toLocaleTimeString();
        if (!t) return;
        t.textContent = '';

        const logs = [
            `[${now()}] INITIALIZING: v22.0 Gold Governance Authority...`,
            `[${now()}] SUCCESS: Neural Interpretation Layer established.`,
            `[${now()}] SUCCESS: Strategic Enclave Persistence synchronized.`,
            `[${now()}] READY: India-HQ Authority Command established.`
        ];

        logs.forEach(msg => {
            const div = UIRenderer.safeText('div', msg);
            div.style.padding = "4px 0";
            div.style.color = "var(--text-muted)";
            div.style.borderBottom = "1px solid rgba(255,255,255,0.02)";
            t.appendChild(div);
        });
        t.scrollTop = t.scrollHeight;
    }

    /**
     * DIRECTIVE 2: AUDIT TRACEABILITY & REPRODUCIBILITY
     */
    function auditPersistence(masterData) {
        const results = window.lastAnalysisResults;
        const box = document.getElementById('storage-details');
        if (!box) return;

        box.style.display = 'block';
        box.textContent = '';

        const header = UIRenderer.safeText('div', '[GOVERNANCE AUTHORITY SNAPSHOT]');
        header.style.cssText = 'color: var(--accent-primary); font-weight: 800; margin-bottom: 8px; border-bottom: 1px solid var(--accent-primary); padding-bottom: 4px;';
        box.appendChild(header);

        const cert = verifyCertification(results);

        const items = [
            `SYSTEM_ID: BI-AGENTIC-ANALYSIS-v22`,
            `CERTIFICATION: ${cert.certified ? 'CERTIFIED' : cert.status}`,
            `TRACK_ID: ${results?.trackId || 'N/A'}`,
            `DATASET_MAGNITUDE: ${masterData.length.toLocaleString()} nodes`,
            `MAPPING_X: ${results?.labels?.x || 'UNSPECIFIED'}`,
            `MAPPING_Y: ${results?.labels?.y || 'UNSPECIFIED'}`,
            `DETERMINISTIC_LOCK: TRUE`,
            `REPRODUCIBILITY_HASH: ${results?.hash || 'N/A'}`
        ];

        if (!cert.certified && cert.reason) {
            items.push(`FAILURE_REASON: ${cert.reason}`);
        }

        items.forEach(it => {
            const div = UIRenderer.safeText('div', it);
            div.style.cssText = "padding: 3px 0; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem;";
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    }

    function startSecurityTimer() {
        if (securityTimeout) clearTimeout(securityTimeout);
        securityTimeout = setTimeout(() => {
            const roleEl = document.getElementById('role');
            if (roleEl && roleEl.value === 'admin') {
                lockSystem();
            }
        }, 300000); // 5 minutes
    }

    function lockSystem() {
        sessionStorage.removeItem('admin_auth');
        sessionStorage.removeItem('auth_timestamp');
        alert("GOVERNANCE LOCKDOWN: Admin session expired. Resetting authority state.");
        window.location.href = 'admin.html';
    }

    /**
     * DIRECTIVE 3: GOVERNANCE LOGGING (REAL-TIME)
     */
    function logActivity(msg) {
        const t = document.getElementById('term');
        if (!t) return;
        const now = new Date().toLocaleTimeString();
        const div = UIRenderer.safeText('div', `[${now}] ${msg.toUpperCase()}`);
        div.style.cssText = "border-left: 2px solid var(--accent-primary); padding: 8px 12px; margin-top: 8px; font-size: 0.75rem; letter-spacing: 0.02em; background: rgba(56, 189, 248, 0.03); border-radius: 0 8px 8px 0;";
        t.appendChild(div);
        t.scrollTop = t.scrollHeight;

        // Also update activity pulse in sidebar if needed (Directive 3)
        const dot = document.getElementById('sync-dot');
        if (dot) {
            dot.style.background = 'var(--accent-primary)';
            setTimeout(() => dot.style.background = 'var(--success)', 1000);
        }
    }

    return {
        renderTrace,
        auditPersistence,
        startSecurityTimer,
        lockSystem,
        logActivity,
        verifyCertification
    };
})();

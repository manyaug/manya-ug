/**
 * MANYA TELEMETRY SERVICE  (Backend Layer)
 * ==========================================
 * Real-time "Brain Data" syncing.
 * Aggregates frustration, hesitation, confidence during gameplay.
 * Android: writes to emotional_metrics SQLite table.
 */

import { syncService } from '../sync/syncService.js';
import { calculateFrustration } from '../../domain/psych/psychTracker.js';

class TelemetryService {
    constructor() {
        this.activeSessionId = null;
        this.lastHeartbeatAt = 0;
        this.heartbeatInterval = 10000;
    }

    setSessionId(sessionId) { this.activeSessionId = sessionId; }

    /**
     * Push a real-time emotional heartbeat.
     * Android: INSERT into emotional_metrics SQLite table.
     */
    async pushHeartbeat(subject, sessionData) {
        const now = Date.now();
        if (now - this.lastHeartbeatAt < this.heartbeatInterval) return;

        const frustration = calculateFrustration(sessionData);
        const metrics = {
            subject, sessionId: this.activeSessionId,
            frustrationLevel: frustration.score,
            confidenceLevel: sessionData.confidence || 70,
            consecutiveWrong: sessionData.consecutiveWrong || 0,
            timestamp: new Date().toISOString()
        };
        this.lastHeartbeatAt = now;
        try {
            await syncService.pushEmotionalMetrics(this.activeSessionId, metrics);
        } catch (err) {
            console.warn('⚠️ [Telemetry] Heartbeat sync failed:', err.message);
        }
    }

    /**
     * Track a specific interaction event (TAB_SWITCH, RAPID_CLICK, etc.).
     */
    async trackInteraction(subject, type, data) {
        const payload = {
            ...data, subject, interactionType: type,
            sessionId: this.activeSessionId,
            timestamp: new Date().toISOString()
        };
        if (type !== 'ANSWER') {
            try {
                await syncService.pushEmotionalMetrics(this.activeSessionId, {
                    ...payload, emotion: type === 'FRUSTRATION_CLICK' ? 'frustrated' : 'active'
                });
            } catch (err) {
                console.warn('⚠️ [Telemetry] Interaction sync failed:', err.message);
            }
        }
    }
}

export const telemetryService = new TelemetryService();

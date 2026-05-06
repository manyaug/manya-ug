/**
 * MANYA TELEMETRY SERVICE
 * =======================
 * Manages real-time "Brain Data" synchronization.
 * Aggregates frustration, hesitation, and confidence metrics during gameplay.
 */

import { syncService } from '../sync/syncService';
import { calculateFrustration } from '../../domain/psych/psychTracker';

class TelemetryService {
    constructor() {
        this.activeSessionId = null;
        this.lastHeartbeatAt = 0;
        this.heartbeatInterval = 10000; // 10 seconds
    }

    setSessionId(sessionId) {
        this.activeSessionId = sessionId;
    }

    /**
     * Pushes a real-time emotional heartbeat to the database.
     * Used for mid-simulation or mid-quest tracking.
     */
    async pushHeartbeat(subject, sessionData) {
        const now = Date.now();
        if (now - this.lastHeartbeatAt < this.heartbeatInterval) return;

        const frustration = calculateFrustration(sessionData);
        
        const metrics = {
            subject,
            sessionId: this.activeSessionId,
            frustrationLevel: frustration.score,
            confidenceLevel: sessionData.confidence || 70,
            consecutiveWrong: sessionData.consecutiveWrong || 0,
            timestamp: new Date().toISOString()
        };

        this.lastHeartbeatAt = now;

        try {
            await syncService.pushEmotionalMetrics(this.activeSessionId, metrics);
            console.log(`🧠 [Telemetry] Heartbeat synced: Frustration=${metrics.frustrationLevel}`);
        } catch (err) {
            console.warn('⚠️ [Telemetry] Heartbeat sync failed:', err.message);
        }
    }

    /**
     * Tracks a specific interaction (e.g., answer submitted, hint used).
     */
    async trackInteraction(subject, type, data) {
        const payload = {
            ...data,
            subject,
            interactionType: type,
            sessionId: this.activeSessionId,
            timestamp: new Date().toISOString()
        };

        // Standard answer tracking is handled by syncService.pushAnswer
        // This is for other "Brain" events like TAB_SWITCH, RAPID_CLICK, etc.
        if (type !== 'ANSWER') {
            try {
                // Future: Add pushGenericTelemetry to syncService
                // For now, we use pushEmotionalMetrics as a proxy for all brain data
                await syncService.pushEmotionalMetrics(this.activeSessionId, {
                    ...payload,
                    emotion: type === 'FRUSTRATION_CLICK' ? 'frustrated' : 'active'
                });
            } catch (err) {
                console.warn('⚠️ [Telemetry] Interaction sync failed:', err.message);
            }
        }
    }
}

export const telemetryService = new TelemetryService();

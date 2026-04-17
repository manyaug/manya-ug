import { z } from 'zod';

// We allow any string for engineType initially, and let the Registry validate existence, 
// because content JSON might have arbitrary strings that get mapped.
export const QuestStepSchema = z.object({
    engineType: z.string().optional(),
    engine: z.string().optional(), // Legacy support
    data: z.any().optional(),
    id: z.string().optional(),
    qid: z.string().optional(),
    file: z.string().optional(),
    mode: z.string().optional(),
    isStudySim: z.boolean().optional(),
    item_type: z.string().optional(),
    topic: z.string().optional(),
}).passthrough(); // Allow unknown keys so we don't drop data from legacy json

export type ParsedQuestStep = z.infer<typeof QuestStepSchema>;

/**
 * Validates a step, logging an error and returning a fallback if completely malformed.
 */
export function validateAndNormalizeStep(raw: unknown, originUrl: string | null = null): any {
    const result = QuestStepSchema.safeParse(raw);
    
    if (!result.success) {
        console.warn('[Validation] Malformed quest step found. Attempting fallback.', result.error.format());
        return {
            engineType: 'UNKNOWN',
            data: { _originUrl: originUrl, _error: 'Malformed data' }
        };
    }

    const data = result.data;
    let engineType = data.engineType || data.engine;

    // Legacy heuristics mapping (from questLoader)
    if (!engineType) {
        if (data.mode === 'note_explorer' || data.study_notes) {
            engineType = 'NOTE_EXPLORER';
        } else if (data.mode === 'recap' || data.recap_facts || data.sections) {
            engineType = 'READER_STUDY';
        } else if (data.cases) {
            engineType = 'GLOBE_TIME_ENGINE'; // Note: mapping might need adjustment in Registry
        } else {
            engineType = 'UNKNOWN';
        }
    }

    return {
        ...data,
        engineType: typeof engineType === 'string' ? engineType.toUpperCase() : 'UNKNOWN',
        data: {
            ...(data.data || data),
            _originUrl: originUrl
        }
    };
}

export const VaultRowSchema = z.object({
    qid: z.string().min(1),
    subject: z.string(),
    topic: z.string().optional().nullable(),
    subtopic: z.string().optional().nullable(),
    cdn_url: z.string().optional().nullable(),
    item_type: z.string().optional().nullable(),
});

export type VaultRow = z.infer<typeof VaultRowSchema>;

/**
 * Validates a vault row, returning null if invalid (log and ignore pattern)
 */
export function validateVaultRow(row: unknown, index: number): VaultRow | null {
    const result = VaultRowSchema.safeParse(row);
    if (!result.success) {
        console.warn(`[Validation] Vault row ${index} invalid, skipping:`, result.error.format(), row);
        return null;
    }
    return result.data;
}

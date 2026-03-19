import { lazy } from 'react';

/**
 * Manya Engine Router (React-Native)
 * ---------------------------------
 * Maps engine types to React components or Legacy JS paths.
 */
export const ENGINE_REGISTRY = {
    // React-Native Engines (Migrated)
    'GALLERY_STUDY': {
        type: 'react',
        component: lazy(() => import('../engines/GalleryStudyEngine.jsx'))
    },

    // Legacy Engines (Still in Public/Legacy)
    // These will be handled by the legacy loading path in QuestRunner
    'SET_THEORY': { type: 'legacy' },
    'MATH_STUDY': { type: 'legacy' },
    'VENN_PROB_ENGINE': { type: 'legacy' },
    'SUBSET_GAME': { type: 'legacy' },
    'PIZZA_GAME': { type: 'legacy' },
    'BINARY_GAME': { type: 'legacy' },
    'VENN_SPOTLIGHT': { type: 'legacy' },
    'SET_CLASSIFIER': { type: 'legacy' },
    '3D_SKELETON': { type: 'legacy' },
    'PROCEDURAL_CANVAS': { type: 'legacy' },
    '2D_HOTSPOT': { type: 'legacy' },
    'READER_STUDY': { type: 'legacy' },
    'MCQ_STANDALONE': { type: 'legacy' },
    'GLOBE_TIME_ENGINE': { type: 'legacy' },
    'CHAT': { type: 'legacy' },
    'ENGLISH_RULE_MASTER': { type: 'legacy' },
    'SYNTAX_ARCHITECT': { type: 'legacy' },
    'HARVEST_GAME': { type: 'legacy' },
    'MEMORY_MATCH': { type: 'legacy' },
    'GRAMMAR_MAZE': { type: 'legacy' },
    'HANGMAN_GAME': { type: 'legacy' },
    'SENTENCE_TRAIN': { type: 'legacy' },
    'WORDGRID_ENGINE': { type: 'legacy' },
    'MORPH_GAME': { type: 'legacy' },
    'DEEP_READER': { type: 'legacy' },
    'FUNCTIONAL_COMPOSER': { type: 'legacy' },
    'HANGMAN_ENGINE': { type: 'legacy' }
};

export const getEngineMetadata = (engineType) => {
    return ENGINE_REGISTRY[engineType] || { type: 'legacy' };
};

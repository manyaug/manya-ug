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
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/shared-engines/GalleryStudyEngine.jsx'))
    },
    'IMAGE_HOTSPOTS': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/shared-engines/ImageHotspotsEngine.jsx'))
    },
    'GLOBE_TIME_ENGINE': {
        type: 'react',
        hideGlobalFooter: true,
        floatingFooter: true,
        component: lazy(() => import('../engines/shared-engines/UniversalGlobeEngine.jsx'))
    },
    'READER_STUDY': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/shared-engines/ReaderStudyEngine.jsx'))
    },

    // Legacy Engines (Still in Public/Legacy)
    // These will be handled by the legacy loading path in QuestRunner
    'SET_THEORY': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/math/SetTheoryEngine.jsx'))
    },
    'MATH_STUDY': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/math/SetStudyEngine.jsx'))
    },
    'VENN_PROB_ENGINE': { type: 'legacy' },
    'SUBSET_GAME': { type: 'legacy' },
    'PIZZA_GAME': { type: 'legacy' },
    'BINARY_GAME': { type: 'legacy' },
    'VENN_SPOTLIGHT': { type: 'legacy' },
    'SET_CLASSIFIER': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/math/SetClassifierEngine.jsx'))
    },
    '3D_SKELETON': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/shared-engines/ThreeDStudyEngine.jsx'))
    },
    'PROCEDURAL_CANVAS': { type: 'legacy' },
    'MCQ_STANDALONE': { type: 'legacy' },
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

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
    'ENGLISH_FETCHER': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/shared-engines/EnglishFetcherEngine.jsx'))
    },
    'SST_FETCHER': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/sst/SSTFetcherEngine.jsx'))
    },
    'MATH_FETCHER': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/math/MathFetcherEngine.jsx'))
    },
    'SCIENCE_FETCHER': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/science/ScienceFetcherEngine.jsx'))
    },
    'NOTE_EXPLORER': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/shared-engines/NoteExplorerEngine.jsx'))
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
    'VENN_PROB_ENGINE': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/math/VennProbEngine.jsx'))
    },
    'SUBSET_GAME': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/math/SubsetGameEngine.jsx'))
    },
    'PIZZA_GAME': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/math/PizzaGameEngine.jsx'))
    },
    'BINARY_GAME': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/math/BinaryGameEngine.jsx'))
    },
    'VENN_SPOTLIGHT': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/math/VennSpotlightEngine.jsx'))
    },
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
    'HANGMAN_GAME': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/HangmanEngine.jsx'))
    },
    'HANGMAN_ENGINE': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/HangmanEngine.jsx'))
    },
    'MEMORY_MATCH': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/MemoryMatchEngine.jsx'))
    },
    'WORDGRID_ENGINE': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/WordGridEngine.jsx'))
    },
    'SENTENCE_TRAIN': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/SentenceTrainEngine.jsx'))
    },
    'HARVEST_GAME': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/HarvestEngine.jsx'))
    },
    'GRAMMAR_MAZE': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/GrammarMazeEngine.jsx'))
    },
    'MORPH_GAME': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/MorphGameEngine.jsx'))
    },

    // ── Grammar Simulation Engines (Primary Education) ──────────────────────
    'SENTENCE_BLOCKS': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../components/simulations/SyntaxArchitect.jsx'))
    },
    'GARDEN_GUARD': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../components/simulations/GrammarGuard.jsx'))
    },
    'PUNCTUATION_STICKERS': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../components/simulations/PunctuationPortal.jsx'))
    },
    'TENSE_TREEHOUSE': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../components/simulations/TenseTransformer.jsx'))
    },
    'DEEP_READER': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/DeepReaderEngine.jsx'))
    },
    'ENGLISH_RULE_MASTER': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/EnglishRuleMasterEngine.jsx'))
    },
    'SYNTAX_ARCHITECT': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/SyntaxArchitectEngine.jsx'))
    },
    'CHAT': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/ChatEngine.jsx'))
    },
    'FUNCTIONAL_COMPOSER': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/FunctionalComposerEngine.jsx'))
    },
    'MCQ_STANDALONE': {
        type: 'react',
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/shared-engines/MCQStandaloneEngine.jsx'))
    },
};

export const getEngineMetadata = (engineType) => {
    return ENGINE_REGISTRY[engineType] || { type: 'legacy' };
};

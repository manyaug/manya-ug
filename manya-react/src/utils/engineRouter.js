import { lazy } from 'react';

/**
 * Manya Engine Router (React-Native)
 * ---------------------------------
 * Maps engine types to React components or Legacy JS paths.
 */
export const ENGINE_REGISTRY = {
    // ── Shared Content Engines ──────────────────────────────────────────────
    'GALLERY_STUDY': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/shared-engines/GalleryStudyEngine.jsx'))
    },
    'IMAGE_HOTSPOTS': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/shared-engines/ImageHotspotsEngine.jsx'))
    },
    'READER_STUDY': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/shared-engines/ReaderStudyEngine.jsx'))
    },
    'NOTE_EXPLORER': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/shared-engines/NoteExplorerEngine.jsx'))
    },
    'MCQ_STANDALONE': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/shared-engines/MCQStandaloneEngine.jsx'))
    },

    // ── Global & Map Engines ────────────────────────────────────────────────
    'UNIVERSAL_GLOBE': {
        type: 'react',
        isImmersive: true,
        floatingFooter: true,
        component: lazy(() => import('../engines/sst/UniversalGlobeEngine.jsx'))
    },
    'GLOBE_ENGINE': { // Alias
        type: 'react',
        isImmersive: true,
        floatingFooter: true,
        component: lazy(() => import('../engines/sst/UniversalGlobeEngine.jsx'))
    },
    'SST_FETCHER': {
        type: 'react',
        component: lazy(() => import('../engines/sst/SSTFetcherEngine.jsx'))
    },
    'SST_STUDY': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/sst/SSTStudyEngine.jsx'))
    },

    // ── Math Logic & Simulations ────────────────────────────────────────────
    'SET_THEORY': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/math/SetTheoryEngine.jsx'))
    },
    'MATH_FETCHER': {
        type: 'react',
        component: lazy(() => import('../engines/math/MathFetcherEngine.jsx'))
    },
    'SUBSET_GAME': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/math/SubsetGameEngine.jsx'))
    },
    'PIZZA_GAME': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/math/PizzaGameEngine.jsx'))
    },
    'BINARY_GAME': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/math/BinaryGameEngine.jsx'))
    },
    'VENN_SPOTLIGHT': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/math/VennSpotlightEngine.jsx'))
    },
    'VENN_PROB': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/math/VennProbEngine.jsx'))
    },
    'SET_CLASSIFIER': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/math/SetClassifierEngine.jsx'))
    },
    'SET_STUDY': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/math/SetStudyEngine.jsx'))
    },

    // ── English & Literacy Simulations ──────────────────────────────────────
    'ENGLISH_FETCHER': {
        type: 'react',
        component: lazy(() => import('../engines/english/EnglishFetcherEngine.jsx'))
    },
    'SENTENCE_BLOCKS': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/SentenceBlocksEngine.jsx'))
    },
    'GARDEN_GUARD': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/GardenGuardEngine.jsx'))
    },
    'PUNCTUATION_STICKERS': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/PunctuationPortalEngine.jsx'))
    },
    'PUNCTUATION_PORTAL': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/PunctuationPortalEngine.jsx'))
    },
    'TENSE_TREEHOUSE': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/TenseTreehouseEngine.jsx'))
    },
    'WORDGRID_ENGINE': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/WordGridEngine.jsx'))
    },
    'HARVEST_GAME': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/HarvestEngine.jsx'))
    },
    'MORPH_GAME': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/MorphGameEngine.jsx'))
    },
    'SENTENCE_TRAIN': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/SentenceTrainEngine.jsx'))
    },
    'GRAMMAR_MAZE': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/GrammarMazeEngine.jsx'))
    },
    'HANGMAN_GAME': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/HangmanEngine.jsx'))
    },
    'MEMORY_MATCH': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/MemoryMatchEngine.jsx'))
    },
    'SYNTAX_ARCHITECT': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/SyntaxArchitectEngine.jsx'))
    },
    'DEEP_READER': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/DeepReaderEngine.jsx'))
    },
    'FUNCTIONAL_COMPOSER': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/english/FunctionalComposerEngine.jsx'))
    },
    'CHAT': {
        type: 'react',
        isWait: true,
        component: lazy(() => import('../engines/english/ChatEngine.jsx'))
    },
    'ENGLISH_RULE_MASTER': {
        type: 'react',
        isWait: true,
        component: lazy(() => import('../engines/english/EnglishRuleMasterEngine.jsx'))
    },

    // ── Science & 3D Interactive ────────────────────────────────────────────
    'SCIENCE_FETCHER': {
        type: 'react',
        component: lazy(() => import('../engines/science/ScienceFetcherEngine.jsx'))
    },
    '3D_SKELETON': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/shared-engines/ThreeDStudyEngine.jsx'))
    },

    // ── Standalone Simulations (Legacy SimulationRegistry merge) ────────────
    'WATER_CYCLE_SIM': {
        id: 'WaterCycleSim',
        name: 'The Water Cycle',
        description: 'Atmospheric physics & hydration transfer loops.',
        category: 'Science',
        difficulty: 'Intermediate',
        tags: ['Nature', 'Interactive', 'Hydrology'],
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../components/simulations/WaterCycleSim.jsx'))
    },
    'MUSCLE_SIM': {
        id: 'MuscleSim',
        name: 'Muscular System',
        description: 'Biochemical contraction & skeletal alignment.',
        category: 'Biology',
        difficulty: 'Advanced',
        tags: ['Anatomy', 'Kinetic', 'Biology'],
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../components/simulations/MuscleSim.jsx'))
    }
};

export const getEngineMetadata = (engineType) => {
    return ENGINE_REGISTRY[engineType] || { type: 'legacy' };
};

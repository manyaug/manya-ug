import { lazy } from 'react';
import type { EngineRegistryEntry } from '../domain/types/engine.types';

/**
 * Manya Engine Router (React-Native)
 * ---------------------------------
 * Maps engine types to React components.
 * This is strongly typed and validated. Unknown engines will throw explicitly.
 */
export const ENGINE_REGISTRY: Record<string, EngineRegistryEntry> = {
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
    // We removed GLOBE_ENGINE alias and update the parser to return UNIVERSAL_GLOBE if needed mappings occur.
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
    'BINARY_GENERATOR': {
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
    'VENN_PROB_ENGINE': {
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
    'MATH_STUDY': {
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
        isGamified: true,
        label: "Sentence Blocks",
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/SentenceBlocksEngine.jsx'))
    },
    'GARDEN_GUARD': {
        type: 'react',
        isImmersive: true,
        isGamified: true,
        label: "Garden Guard",
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/GardenGuardEngine.jsx'))
    },
    'PUNCTUATION_STICKERS': {
        type: 'react',
        isImmersive: true,
        isGamified: true,
        label: "Punctuation Portal",
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/PunctuationPortalEngine.jsx'))
    },
    'TENSE_TREEHOUSE': {
        type: 'react',
        isImmersive: true,
        isGamified: true,
        label: "Tense Treehouse",
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/TenseTreehouseEngine.jsx'))
    },
    'WORDGRID_ENGINE': {
        type: 'react',
        isImmersive: true,
        isGamified: true,
        label: "Word Grid",
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/WordGridEngine.jsx'))
    },
    'HARVEST_GAME': {
        type: 'react',
        isImmersive: true,
        isGamified: true,
        label: "Harvest Game",
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/HarvestEngine.jsx'))
    },
    'MEMORY_MATCH': {
        type: 'react',
        isImmersive: true,
        isGamified: true,
        label: "Memory Match",
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/MemoryMatchEngine.jsx'))
    },
    'SENTENCE_TRAIN': {
        type: 'react',
        isImmersive: true,
        isGamified: true,
        label: "Sentence Train",
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/SentenceTrainEngine.jsx'))
    },
    'HANGMAN_ENGINE': {
        type: 'react',
        isImmersive: true,
        isGamified: true,
        label: "Hangman",
        component: lazy(() => import('../engines/english/HangmanEngine.jsx'))
    },
    'MORPH_GAME': {
        type: 'react',
        isImmersive: true,
        isGamified: true,
        label: "Morph Game",
        component: lazy(() => import('../engines/english/MorphGameEngine.jsx'))
    },
    'DEEP_READER': {
        type: 'react',
        isImmersive: true,
        label: "Deep Reader",
        component: lazy(() => import('../engines/english/DeepReaderEngine.jsx'))
    },
    'GRAMMAR_MAZE': {
        type: 'react',
        isImmersive: true,
        isGamified: true,
        label: "Grammar Maze",
        component: lazy(() => import('../engines/english/GrammarMazeEngine.jsx'))
    },
    'CHAT': {
        type: 'react',
        isWait: true,
        hideGlobalFooter: true,
        component: lazy(() => import('../engines/english/ChatEngine.jsx'))
    },
    'ENGLISH_RULE_MASTER': {
        type: 'react',
        isWait: true,
        hideGlobalFooter: true,
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
    'THREE_D_STUDY': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../engines/shared-engines/ThreeDStudyEngine.jsx'))
    },

    // ── Standalone Simulations (Legacy SimulationRegistry merge) ────────────
    'WATER_CYCLE_SIM': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../components/simulations/WaterCycleSim.jsx'))
    },
    'MUSCLE_SIM': {
        type: 'react',
        isImmersive: true,
        component: lazy(() => import('../components/simulations/MuscleSim.jsx'))
    }
};

/**
 * getEngine — Strict lookup. Throws on unknown engine to enforce consistency.
 */
export function getEngine(engineType: string): EngineRegistryEntry {
    let resolvedType = engineType;
    // Map the old alias if content hasn't been fully updated yet.
    if (resolvedType === 'GLOBE_ENGINE') {
        resolvedType = 'UNIVERSAL_GLOBE';
    } 
    // Handle mapping from the normaliser for GLOBE_TIME_ENGINE
    else if (resolvedType === 'GLOBE_TIME_ENGINE') {
        resolvedType = 'UNIVERSAL_GLOBE';
    }

    const entry = ENGINE_REGISTRY[resolvedType];
    
    if (!entry) {
        console.warn(`[EngineRegistry] Unknown engine type: "${engineType}". Proceeding with no component.`);
        // We throw so the boundary catches it or the caller handles it, rather than silently failing.
        throw new Error(`[EngineRegistry] Unknown engine type: "${engineType}". Register it in src/config/engineRegistry.ts`);
    }
    
    if (entry.isWait && entry.isImmersive) {
        console.warn(`[EngineRegistry] Engine "${engineType}" is both isWait and isImmersive. Ignoring isWait.`);
    }

    return entry;
}

export const REGISTERED_ENGINES = Object.keys(ENGINE_REGISTRY) as const;

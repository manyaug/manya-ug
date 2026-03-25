/**
 * Simulation Registry
 * Central source of truth for all simulation metadata.
 * The SimulationEngine uses the 'id' to lazy-load the corresponding component.
 */
export const AVAILABLE_SIMULATIONS = [
    {
        id: 'WaterCycleSim',
        name: 'The Water Cycle',
        description: 'Discover how water moves through our environment using advanced physics.',
        difficulty: 'Primary 5',
        category: 'Science',
        tags: ['Physics', 'Environment', 'Hydrology']
    },
    {
        id: 'MuscleSim',
        name: 'Muscular Action',
        description: 'Biceps, triceps, and the mechanics of antagonistic pairs.',
        difficulty: 'Primary 6',
        category: 'Biology',
        tags: ['Anatomy', 'Bones', 'Muscles']
    },
    {
        id: 'PostureSim',
        name: 'Correct Posture',
        description: 'See the impact of neck and shoulder alignment on spine health.',
        difficulty: 'Primary 6',
        category: 'Biology',
        tags: ['Anatomy', 'Bones', 'Spine']
    },
    {
        id: 'SyntaxArchitect',
        name: 'Sentence Blocks',
        category: 'English',
        description: 'Build fun stories by stacking colorful sentence blocks in the right order!',
        difficulty: 'Primary 4',
        tags: ['Building', 'Sentence', 'Logic']
    },
    {
        id: 'GrammarGuard',
        name: 'Garden Guard',
        category: 'English',
        description: 'Help the garden bloom by watering wilting words and fixing their mistakes!',
        difficulty: 'Primary 5',
        tags: ['Nature', 'Correction', 'Healing']
    },
    {
        id: 'PunctuationPortal',
        name: 'Punctuation Stickers',
        category: 'English',
        description: 'Place pretty punctuation stickers into your storybook to make it perfect!',
        difficulty: 'Primary 6',
        tags: ['Stickers', 'Symbols', 'Writing']
    },
    {
        id: 'TenseTransformer',
        name: 'Tense Treehouse',
        category: 'English',
        description: 'Climb the magical treehouse by changing words to match the current season!',
        difficulty: 'Primary 7',
        tags: ['Time', 'Verbs', 'Climbing']
    }
];

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
    }
];

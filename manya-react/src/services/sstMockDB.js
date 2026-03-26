/**
 * MANYA SST MOCK DB
 * -----------------
 * Dynamically loads processed SST question JSONs.
 */

const BASE_URL = '/content/sst/questions/locating_africa/';

// Map subtopic names (from folder) to JSON filenames (from slugify)
const SUBTOPIC_MAP = {
    'quest_1_world_stage': 'world_stage.json',
    'quest_2_grid_master': 'grid_master.json',
    'quest_3_calculating_time': 'calculating_time.json',
    'quest_4_water_bodies': 'water_bodies.json',
    'quest_5_coastal_features': 'coastal_features.json',
    'quest_6_regional_division_capital_cities': 'regional_division_capital_cities.json',
    'quest_7_landlocked_countries': 'landlocked_countries.json'
};

export const fetchSstQuestions = async (topicId) => {
    try {
        const fileName = SUBTOPIC_MAP[topicId] || `${topicId}.json`;
        const response = await fetch(`${BASE_URL}${fileName}`);
        if (!response.ok) throw new Error(`Failed to load ${fileName}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("[SST Mock DB] Error fetching questions:", error);
        return [];
    }
};

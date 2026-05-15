
import { storageFacade } from '../src/infrastructure/storage/storageFacade.js';

async function inspectSst() {
    console.log("--- Inspecting Vault for SST ---");
    try {
        const data = await storageFacade.get('db:/manya_vault?subject=ilike:sst');
        if (!data) {
            console.log("No data found.");
            return;
        }
        
        const engines = [...new Set(data.map(q => q.engine_type))];
        const types = [...new Set(data.map(q => q.item_type))];
        
        console.log("Found Engines:", engines);
        console.log("Found Item Types:", types);
        
        const specialized = data.filter(q => q.engine_type && q.engine_type !== 'null' && q.engine_type !== 'MCQ');
        console.log(`Specialized items count: ${specialized.length}`);
        if (specialized.length > 0) {
            console.log(JSON.stringify(specialized.slice(0, 10).map(q => ({
                qid: q.qid,
                engine_type: q.engine_type,
                item_type: q.item_type,
                subtopic: q.subtopic
            })), null, 2));
        }
    } catch (e) {
        console.error("Execution error:", e);
    }
}

inspectSst();

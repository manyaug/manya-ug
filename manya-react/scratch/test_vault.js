
const { storageFacade } = require('./src/infrastructure/storage/storageFacade.js');

async function test() {
    try {
        const data = await storageFacade.get('db:/manya_vault?subject=ilike:science&engine_type=not.is.null');
        console.log(JSON.stringify(data.map(q => ({ qid: q.qid, item_type: q.item_type, engine_type: q.engine_type })), null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();

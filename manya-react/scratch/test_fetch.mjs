async function run() {
    const url = 'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@v3.0.5/content/english/holidays/quest_06_feeling_and_facts/pq-06-010.json';
    console.log(`Fetching ${url}`);
    
    try {
        const res = await fetch(url);
        console.log("Status:", res.status);
        console.log("Content-Type:", res.headers.get('content-type'));
        
        try {
            const json = await res.json();
            console.log("JSON parsed successfully:", !!json);
        } catch (e) {
            console.error("JSON parse failed:", e.message);
            const text = await res.text();
            console.log("Raw text starts with:", text.substring(0, 50));
        }
    } catch (err) {
        console.error("Network error:", err);
    }
}

run();

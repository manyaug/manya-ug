const urls = [
    'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@v3.0.13/audios/ui-click.mp3',
    'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@v3.0.13/audios/night.mp3',
    'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@v3.0.13/audios/rain.mp3',
    'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@v3.0.13/audios/day.mp3',
    'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@v3.0.13/audios/collect-points.mp3'
];

async function check() {
    for (const url of urls) {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            console.log(`URL: ${url} -> Status: ${res.status} (${res.statusText})`);
        } catch (e) {
            console.log(`URL: ${url} -> Error: ${e.message}`);
        }
    }
}

check();

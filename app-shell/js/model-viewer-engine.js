// app-shell/js/engines/model-viewer-engine.js

export function initArmSimulation(jsonData) {
    const viewer = document.querySelector('model-viewer');
    viewer.src = jsonData.modelUrl;

    // Clear old hotspots
    viewer.querySelectorAll('.hotspot').forEach(h => h.remove());

    // Create new hotspots for each bone
    jsonData.parts.forEach(part => {
        const btn = document.createElement('button');
        
        // Setup hotspot attributes
        btn.slot = `hotspot-${part.id}`;
        btn.classList.add('hotspot-pin');
        btn.dataset.position = part.pos;
        btn.dataset.normal = part.norm;

        // The HTML inside the label
        btn.innerHTML = `
            <div class="label-popup">
                <strong>${part.label}</strong>
                <p class="info-text">${part.info}</p>
            </div>
        `;

        // Click to show/hide info
        btn.onclick = () => {
            // Close others
            document.querySelectorAll('.hotspot-pin').forEach(p => p.classList.remove('active'));
            // Toggle current
            btn.classList.toggle('active');
        };

        viewer.appendChild(btn);
    });
}
/**
 * WATER CYCLE DOMAIN LOGIC
 * Domain logic for atmospheric physics and cycle-state transitions.
 */

/**
 * Initializes simulation state.
 */
export const initializeWaterState = () => ({
    evaporation: [],
    rain: [],
    clouds: [
        { x: 100, y: 100, saturation: 0, scale: 1, isRaining: false },
        { x: 400, y: 80, saturation: 0.3, scale: 0.8, isRaining: false },
        { x: 650, y: 120, saturation: 0.1, scale: 1.1, isRaining: false }
    ],
    lastTime: 0
});

/**
 * Updates simulation physics for a single frame.
 */
export const updatePhysics = (state, dt, sunIntensity, windSpeed) => {
    // 1. Evaporation
    if (sunIntensity > 20 && Math.random() < sunIntensity / 100) {
        state.evaporation.push({
            x: 150 + Math.random() * 500,
            y: 450,
            size: 2 + Math.random() * 4,
            vy: - (20 + (sunIntensity / 2)),
            opacity: 0.8
        });
    }

    // 2. Wind & Cloud Movement
    const windX = (windSpeed / 50) * 100 * dt;
    state.clouds.forEach(c => {
        c.x += windX;
        if (c.x > 900) c.x = -100;
        if (c.x < -100) c.x = 900;
    });

    // 3. Condensation
    state.evaporation = state.evaporation.filter(p => {
        p.y += p.vy * dt;
        p.opacity -= 0.15 * dt;

        if (p.y < 160) {
            const cloud = state.clouds.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
            if (cloud && Math.abs(cloud.x - p.x) < 120) {
                cloud.saturation = Math.min(cloud.saturation + 0.008, 1.5);
                cloud.scale = 0.8 + (cloud.saturation * 0.6);
            }
            return false;
        }
        return p.opacity > 0;
    });

    // 4. Precipitation
    let isRainingGlobal = false;
    state.clouds.forEach(c => {
        if (c.saturation > 0.7) c.isRaining = true;

        if (c.isRaining) {
            isRainingGlobal = true;
            if (Math.random() < 0.6) {
                state.rain.push({
                    x: c.x + (Math.random() * 100 * c.scale - 50 * c.scale),
                    y: c.y + 20,
                    dx: (windSpeed / 100) * 8, 
                    dy: 400 + Math.random() * 100
                });
            }
            c.saturation = Math.max(0, c.saturation - 0.005 * dt * 25); 
            c.scale = 0.8 + (c.saturation * 0.6);
            if (c.saturation < 0.15) c.isRaining = false;
        }
    });

    state.rain = state.rain.filter(p => {
        p.y += p.dy * dt;
        p.x += p.dx;
        return p.y < 450;
    });

    return isRainingGlobal;
};

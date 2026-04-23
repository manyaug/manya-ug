/**
 * useCoinAnimation — React hook
 * ================================
 * Ported from: manya_logic/public/js/components/coinAnimation.js
 * 
 * Exposes:
 *   - displayCoins: the currently displayed (possibly animating) coin count
 *   - triggerFlyingCoin(sourceRef, amount): launches a coin flying toward the HUD
 *   - triggerFloatCoin(amount): floats coins up from the HUD without a source
 */
import { useState, useEffect, useRef, useCallback } from 'react';

// easeOutCubic: matches the original plain-JS implementation
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Smoothly animates a number from `from` to `to` over `durationMs`.
 * Calls `onTick(currentValue)` on every RAF frame, then `onDone()`.
 */
function animateCount(from, to, durationMs, onTick, onDone) {
    const startTime = performance.now();
    function tick(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / durationMs, 1);
        const value = Math.round(from + (to - from) * easeOutCubic(t));
        onTick(value);
        if (t < 1) {
            requestAnimationFrame(tick);
        } else {
            onTick(to);
            onDone?.();
        }
    }
    requestAnimationFrame(tick);
}

export function useCoinAnimation(realCoins) {
    const [displayCoins, setDisplayCoins] = useState(realCoins || 0);
    const prevCoins = useRef(realCoins || 0);

    // Whenever Redux coins change, animate the counter
    useEffect(() => {
        const from = prevCoins.current;
        const to = realCoins || 0;
        if (from === to) return;

        const duration = to > from ? 800 : 600;
        animateCount(from, to, duration, setDisplayCoins, () => {
            prevCoins.current = to;
        });
    }, [realCoins]);

    /**
     * Spawns a coin emoji that flies from sourceRef element to the HUD coin pill.
     * targetRef must be the coin HUD element.
     */
    const triggerFlyingCoin = useCallback((sourceRef, targetRef, amount) => {
        if (!sourceRef?.current || !targetRef?.current) return;
        const srcRect  = sourceRef.current.getBoundingClientRect();
        const destRect = targetRef.current.getBoundingClientRect();

        const coin = document.createElement('div');
        coin.textContent = '🪙';
        coin.style.cssText = `
            position: fixed;
            left: ${srcRect.left + srcRect.width / 2}px;
            top:  ${srcRect.top  + srcRect.height / 2}px;
            font-size: 28px;
            z-index: 20000;
            pointer-events: none;
            transition: left 0.6s cubic-bezier(0.34,1.2,0.64,1),
                        top  0.6s cubic-bezier(0.34,1.2,0.64,1),
                        transform 0.6s ease,
                        opacity 0.6s ease;
        `;
        document.body.appendChild(coin);

        // Value bubble
        const label = document.createElement('div');
        label.textContent = `+${amount}`;
        label.style.cssText = `
            position: fixed;
            left: ${srcRect.left + srcRect.width / 2}px;
            top:  ${srcRect.top  + srcRect.height / 2 - 20}px;
            font-size: 18px; font-weight: 800;
            color: gold; z-index: 20001;
            pointer-events: none;
            animation: manya-coin-float 0.8s ease-out forwards;
        `;
        document.body.appendChild(label);

        // Start flight on next frame
        requestAnimationFrame(() => {
            coin.style.left      = `${destRect.left + destRect.width / 2}px`;
            coin.style.top       = `${destRect.top  + destRect.height / 2}px`;
            coin.style.transform = 'rotate(720deg) scale(0.5)';
            coin.style.opacity   = '0.8';
        });

        setTimeout(() => {
            coin.remove();
            label.remove();
            // Shake the target HUD pill
            targetRef.current?.classList.add('coin-hud-shake');
            setTimeout(() => targetRef.current?.classList.remove('coin-hud-shake'), 350);
        }, 650);
    }, []);

    /**
     * Floats 3 coins up from the HUD pill (no source element).
     */
    const triggerFloatCoin = useCallback((targetRef, amount) => {
        if (!targetRef?.current) return;
        const rect = targetRef.current.getBoundingClientRect();

        for (let i = 0; i < 3; i++) {
            const coin = document.createElement('div');
            coin.textContent = '🪙';
            const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 50;
            const size = 18 + Math.random() * 14;
            coin.style.cssText = `
                position: fixed;
                left: ${x}px; top: ${rect.top - 10}px;
                font-size: ${size}px;
                z-index: 20000; pointer-events: none;
                animation: manya-coin-float-up ${0.5 + Math.random() * 0.4}s ease-out ${i * 80}ms forwards;
            `;
            document.body.appendChild(coin);
            setTimeout(() => coin.remove(), 1100);
        }

        const label = document.createElement('div');
        label.textContent = `+${amount}`;
        label.style.cssText = `
            position: fixed;
            left: ${rect.left + rect.width / 2}px;
            top: ${rect.top - 5}px;
            font-size: 20px; font-weight: 800;
            color: gold; z-index: 20001; pointer-events: none;
            animation: manya-coin-rise 0.85s ease-out forwards;
        `;
        document.body.appendChild(label);
        setTimeout(() => label.remove(), 900);
    }, []);

    return { displayCoins, triggerFlyingCoin, triggerFloatCoin };
}

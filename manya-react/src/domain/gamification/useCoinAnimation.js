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
import { getGem } from '../../config/assetUrls.js';
import { audioService } from '../../infrastructure/audio/audioService.js';

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
    const triggerFlyingCoin = useCallback((sourceRef, targetRef, amount, type = 'coin') => {
        if (!sourceRef?.current || !targetRef?.current) return;
        const srcRect  = sourceRef.current.getBoundingClientRect();
        const destRect = targetRef.current.getBoundingClientRect();

        const coin = document.createElement('img');
        coin.src = type === 'gem' ? getGem('math_gem.svg') : getGem('coin.svg');
        coin.style.cssText = `
            position: fixed;
            left: ${srcRect.left + srcRect.width / 2}px;
            top:  ${srcRect.top  + srcRect.height / 2}px;
            width: 32px;
            height: 32px;
            object-fit: contain;
            z-index: 20000;
            pointer-events: none;
            transition: left 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                        top  0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                        transform 0.7s ease,
                        opacity 0.7s ease;
            filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
        `;
        document.body.appendChild(coin);

        // Value bubble (optional/staggered)
        if (amount > 1) {
            const label = document.createElement('div');
            label.textContent = `+${amount}`;
            label.style.cssText = `
                position: fixed;
                left: ${srcRect.left + srcRect.width / 2}px;
                top:  ${srcRect.top  + srcRect.height / 2 - 20}px;
                font-size: 20px; font-weight: 1000;
                color: #fbbf24; z-index: 20001;
                pointer-events: none;
                text-shadow: 0 0 10px rgba(0,0,0,0.5);
                animation: manya-coin-float 0.8s ease-out forwards;
            `;
            document.body.appendChild(label);
            setTimeout(() => label.remove(), 800);
        }

        // Add some "jitter" for a richer burst
        const jitterX = (Math.random() - 0.5) * 60;
        const jitterY = (Math.random() - 0.5) * 60;

        // Start flight on next frame
        requestAnimationFrame(() => {
            coin.style.left      = `${destRect.left + destRect.width / 2 + jitterX}px`;
            coin.style.top       = `${destRect.top  + destRect.height / 2 + jitterY}px`;
            coin.style.transform = `rotate(${360 + Math.random() * 720}deg) scale(0.6)`;
            coin.style.opacity   = '0.9';
        });

        setTimeout(() => {
            coin.remove();
            // Shake the target HUD pill
            targetRef.current?.classList.add('coin-hud-shake');
            setTimeout(() => targetRef.current?.classList.remove('coin-hud-shake'), 350);
        }, 750);
    }, []);

    /**
     * Floats 3 coins up from the HUD pill (no source element).
     */
    const triggerFloatCoin = useCallback((targetRef, amount, type = 'coin') => {
        if (!targetRef?.current) return;
        const rect = targetRef.current.getBoundingClientRect();

        for (let i = 0; i < 3; i++) {
            const coin = document.createElement('img');
            coin.src = type === 'gem' ? getGem('math_gem.svg') : getGem('coin.svg');
            const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 50;
            const size = 18 + Math.random() * 14;
            coin.style.cssText = `
                position: fixed;
                left: ${x}px; top: ${rect.top - 10}px;
                width: ${size}px; height: ${size}px;
                object-fit: contain;
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

    /**
     * Spawns a red float-down anim for coin deductions and shakes the HUD.
     */
    const triggerDeductCoin = useCallback((targetRef, amount) => {
        if (!targetRef?.current) return;
        const rect = targetRef.current.getBoundingClientRect();

        // 1. Play coin deduction dropping coin sound
        try {
            audioService.playSFX?.('coin-drop');
        } catch (e) {}

        // 2. Shake HUD pill with negative style
        targetRef.current?.classList.add('coin-hud-deduct-shake');
        setTimeout(() => targetRef.current?.classList.remove('coin-hud-deduct-shake'), 400);

        // 3. Drop "-50" label below the coin pill
        const label = document.createElement('div');
        label.textContent = `-${amount}`;
        label.style.cssText = `
            position: fixed;
            left: ${rect.left + rect.width / 2}px;
            top: ${rect.top + rect.height + 5}px;
            font-size: 22px; 
            font-weight: 900;
            color: #ef4444; 
            z-index: 20001; 
            pointer-events: none;
            text-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
            animation: manya-coin-deduct 0.85s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
            font-family: 'Sour Gummy', 'Bubblegum Sans', sans-serif;
        `;
        document.body.appendChild(label);
        setTimeout(() => label.remove(), 900);
    }, []);

    return { displayCoins, triggerFlyingCoin, triggerFloatCoin, triggerDeductCoin };
}

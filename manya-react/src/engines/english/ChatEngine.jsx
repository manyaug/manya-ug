import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, ArrowRight, User, Sparkles, Zap } from 'lucide-react';
import { IMAGES, resolveRemoteUrl } from '../../config/assetUrls';

/**
 * MANYA ENGLISH: CHAT ENGINE (React v1.0)
 * --------------------------------------
 * - Cinematic character dialogue with typing effects.
 * - Premium glassmorphic chat bubbles and avatars.
 * - Integrated character mapping (Manya, Polly, Kiki).
 * - Optional image support for visual context.
 */

const ChatEngine = ({ data, onComplete }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [isDark, setIsDark] = useState(false);

    const charMap = {
        manya: { icon: IMAGES.manya_icon, name: "MANYA", color: "text-indigo-500", bg: "bg-indigo-500/10" },
        polly: { icon: IMAGES.polly_icon, name: "POLLY", color: "text-emerald-500", bg: "bg-emerald-500/10" },
        kiki: { icon: IMAGES.kiki_icon, name: "KIKI", color: "text-rose-500", bg: "bg-rose-500/10" }
    };

    const char = charMap[data.speaker] || charMap.manya;
    const fullText = data.text || "";

    // Typing Effect
    useEffect(() => {
        let current = "";
        let i = 0;
        setIsTyping(true);
        window.QuestRunner?.setIsTyping?.(true);
        setDisplayedText('');

        const skip = () => {
            setDisplayedText(fullText);
            setIsTyping(false);
            window.QuestRunner?.setIsTyping?.(false);
        };

        window.addEventListener('stop-typing', skip, { once: true });

        const interval = setInterval(() => {
            if (i < fullText.length) {
                // AUTO-SKIP HTML TAGS (Ensures they render as atomic units)
                if (fullText[i] === '<') {
                    const tagEnd = fullText.indexOf('>', i);
                    if (tagEnd !== -1) {
                        current += fullText.substring(i, tagEnd + 1);
                        i = tagEnd + 1;
                    } else {
                        current += fullText[i];
                        i++;
                    }
                } else {
                    current += fullText[i];
                    i++;
                }
                setDisplayedText(current);
            } else {
                clearInterval(interval);
                setIsTyping(false);
                window.QuestRunner?.setIsTyping?.(false);
                window.removeEventListener('stop-typing', skip);
            }
        }, 30);

        return () => {
            clearInterval(interval);
            window.removeEventListener('stop-typing', skip);
            window.QuestRunner?.setIsTyping?.(false);
        };
    }, [fullText]);

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const skipTyping = () => {
        setDisplayedText(fullText);
        setIsTyping(false);
        window.QuestRunner?.setIsTyping?.(false);
    };

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 overflow-y-auto scrollbar-hide">
                
                {/* 1. Optional Character/Subject Image */}
                {data.image && (
                    <div className="w-full max-w-sm aspect-video rounded-[40px] overflow-hidden shadow-2xl border-4 border-white dark:border-white/10 animate-in zoom-in duration-700 bg-slate-200">
                        <img src={resolveRemoteUrl(data.image)} className="w-full h-full object-cover" alt="Context" />
                    </div>
                )}

                {/* 2. Chat Row */}
                <div className="w-full max-w-xl flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`w-16 h-16 rounded-3xl flex-none overflow-hidden border-4 shadow-xl ${isDark ? 'border-white/10' : 'border-white'} animate-in slide-in-from-left-4 duration-500`}>
                        <img src={char.icon} className="w-full h-full object-cover bg-white" alt={char.name} />
                    </div>

                    {/* Bubble */}
                    <div 
                        onClick={isTyping ? skipTyping : null}
                        className={`flex-1 p-6 rounded-[32px] rounded-tl-none border transition-all animate-in slide-in-from-right-4 duration-500 cursor-pointer ${isDark ? 'bg-white/5 border-white/5 shadow-2xl shadow-indigo-500/5' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-[10px] font-black tracking-widest uppercase ${char.color}`}>{char.name}</span>
                            {isTyping && <div className="flex gap-1"><div className="w-1 h-1 bg-current rounded-full animate-bounce" /><div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.4s]" /></div>}
                        </div>
                        <p 
                            className={`text-base sm:text-lg font-bold leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                            dangerouslySetInnerHTML={{ __html: displayedText }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer Action */}
            <div className={`flex-none p-8 pt-2 transition-opacity duration-500 ${isTyping ? 'opacity-30' : 'opacity-100'}`}>
                <button 
                    onClick={onComplete}
                    disabled={isTyping}
                    className={`w-full h-16 bg-indigo-600 text-white rounded-[24px] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/30 active:scale-95 transition-all`}
                >
                    Continue Conversation <ArrowRight size={18} />
                </button>
            </div>

            {/* Background Sparkles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                <Sparkles className="absolute top-1/4 right-1/4 animate-pulse text-indigo-500" size={40} />
                <Zap className="absolute bottom-1/4 left-1/4 animate-pulse text-amber-500" size={30} />
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

ChatEngine.hideGlobalFooter = true;
export default ChatEngine;

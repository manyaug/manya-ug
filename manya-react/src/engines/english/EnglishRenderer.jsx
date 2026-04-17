import React from 'react';
import { 
    Check, X, Zap, Trophy, Compass, Lightbulb, Sparkles, AlertCircle 
} from 'lucide-react';

/**
 * ENGLISH RENDERER
 * Handles the visual presentation of English MCQ questions, hints, and explanations.
 */
const EnglishRenderer = ({
    currentQ,
    currentIdx,
    totalQuestions,
    nodeType,
    selectedOption,
    isAnswered,
    hintUsed,
    setHintUsed,
    setSelectedOption,
    handleSubmit,
    correctText,
    userWasCorrect,
    frustration,
    questMeta,
    gemsEarned,
    showGemToast
}) => {
    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden relative" style={{ maxHeight: '100%' }}>
            {showGemToast && (
                <div className="absolute top-4 right-4 bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-black animate-bounce z-20 flex items-center gap-1 shadow-xl">
                    <Trophy size={12} /> +{gemsEarned} gems
                </div>
            )}

            <div className="flex-1 flex flex-col px-4 pt-4 overflow-hidden">
                <div className="flex gap-1.5 justify-center mb-5 overflow-x-auto no-scrollbar flex-shrink-0">
                    {Array.from({ length: totalQuestions }).map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 shrink-0 ${i === currentIdx ? 'bg-indigo-600 w-5' : (i < currentIdx ? 'bg-indigo-600 opacity-35 w-1.5' : 'bg-slate-200 w-1.5')}`} />
                    ))}
                </div>

                {currentQ?.isRephrased && (
                    <div className="text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2 font-bold mb-3 text-center flex-shrink-0">
                        🔄 Let's try this rule again with different words
                    </div>
                )}
                {frustration?.level === 'high' && (
                    <div className="text-xs text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2 font-bold mb-3 text-center flex-shrink-0">
                        💡 Tip: Watch the sentence structure closely!
                    </div>
                )}

                {/* QUESTION CARD */}
                <div className="bg-white rounded-[2.5rem] border-[5px] border-slate-100 px-7 py-8 mb-6 shadow-xl flex-shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20" />
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                             <Compass size={14} className="text-indigo-500" />
                             <span className="text-indigo-600 font-black text-[10px] tracking-widest uppercase">
                                {nodeType} Activity · {currentIdx + 1}/{totalQuestions}
                             </span>
                        </div>
                        
                        {!isAnswered && currentQ?.hint && (
                            <div className="relative">
                                <button onClick={() => setHintUsed(!hintUsed)} className={`p-2.5 rounded-2xl transition-all ${hintUsed ? 'bg-pink-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                                    <Lightbulb size={20} />
                                </button>
                                {hintUsed && (
                                    <div className="absolute top-full right-0 mt-3 w-64 p-4 bg-white border-2 border-pink-100 rounded-[2rem] shadow-2xl z-50 text-slate-600 text-xs font-bold leading-relaxed animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2 text-pink-500 mb-2 uppercase text-[10px] font-black"><Sparkles size={12} /> Tutor Hint</div>
                                        {currentQ.hint}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <p className="text-slate-800 font-bold text-xl leading-snug">
                        {currentQ?.question || currentQ?.question_text}
                    </p>
                </div>

                {/* OPTIONS */}
                <div className="flex flex-col gap-3 flex-shrink-0">
                    {currentQ?.options?.map((opt, i) => (
                        <button
                            key={i}
                            disabled={isAnswered}
                            onClick={() => setSelectedOption(opt)}
                            className={`p-5 rounded-[2rem] text-left font-bold text-sm transition-all border-2 flex items-center gap-4 relative overflow-hidden ${
                                isAnswered 
                                ? (opt === correctText ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : (opt === selectedOption ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-transparent opacity-40'))
                                : (opt === selectedOption ? 'bg-indigo-50 border-indigo-500 text-indigo-700 scale-[1.02] shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 shadow-sm')
                            }`}
                        >
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                                isAnswered 
                                ? (opt === correctText ? 'bg-emerald-500 text-white' : (opt === selectedOption ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-400'))
                                : (opt === selectedOption ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400')
                            }`}>
                                {String.fromCharCode(65 + i)}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isAnswered && opt === correctText && <Check size={18} className="text-emerald-500" strokeWidth={4} />}
                            {isAnswered && opt === selectedOption && opt !== correctText && <X size={18} className="text-rose-500" strokeWidth={4} />}
                        </button>
                    ))}
                </div>

                <div className="mt-auto pb-8">
                    {!isAnswered ? (
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedOption}
                            className={`w-full h-14 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden ${
                                selectedOption ? 'bg-[#58cc02] hover:bg-[#46a302] text-white border-b-[4px] border-[#46a302] active:translate-y-1' : 'bg-slate-200 text-slate-400 border-b-[4px] border-slate-300'
                            }`}
                        >
                            <span className="relative z-10 flex items-center gap-2">SUBMIT ANSWER <Zap size={14} fill="currentColor" /></span>
                        </button>
                    ) : (
                        <div className={`w-full h-16 rounded-full flex items-center justify-center gap-3 font-black text-xs tracking-widest uppercase border-2 ${userWasCorrect ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                            {userWasCorrect ? <>Magnificent! Keep going! <Check size={18} /></> : <>Analyzing solution... <AlertCircle size={18} /></>}
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

export default EnglishRenderer;

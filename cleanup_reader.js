const fs = require('fs');
const path = 'd:/manya_app/manya-react/src/engines/shared-engines/ReaderStudyEngine.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove Progress Bar
content = content.replace(
    /\{\/\* PROGRESS BAR \*\/\}[\s\S]*?<\/div>\s*<\/div>/,
    ''
);

// 2. Shrink Header
content = content.replace(
    /\{\/\* HEADER - Responsive Typography \*\/\}[\s\S]*?<\/header>/,
    `{/* HEADER - Responsive Typography */}
                <header className={\`mb-8 transition-all duration-1000 delay-100 \${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}\`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-[10px] bg-[var(--accent-color)] text-white flex items-center justify-center">
                            <BookOpen size={16} />
                        </div>
                        <span className="text-[10px] font-black text-[var(--accent-color)] tracking-[0.2em] uppercase opacity-80">
                            {data.variantTitle || data.subject || 'MASTER CLASS'}
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-[var(--text-main)] leading-tight tracking-tight mb-3">
                        {data.topic || 'Concept Study'}
                    </h1>
                    <p className="text-base text-[var(--text-sub)] font-medium opacity-80 leading-relaxed max-w-[600px]">
                        Dive deep into the core principles of this unit with Manya's premium study guides.
                    </p>
                </header>`
);

// 3. Shrink Flashcards Section Header
content = content.replace(
    /<div className="w-12 h-12 md:w-14 md:h-14 rounded-\[1\.5rem\] bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner mb-2">[\s\S]*?<p className="text-\[10px\] md:text-xs font-bold text-\[var\(--text-muted\)\] uppercase tracking-widest">Tap to flip & test your knowledge<\/p>\s*<\/div>/,
    `<div className="w-10 h-10 rounded-[1rem] bg-amber-100 text-amber-600 flex items-center justify-center mb-1">
                                <Zap size={18} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-[var(--text-main)] tracking-tight">Rapid Recall Cards</h2>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tap to flip & test your knowledge</p>
                        </div>`
);

// 4. Clean up Finish Button
content = content.replace(
    /\{\/\* FINISH ACTIONS \*\/\}[\s\S]*?<\/div>\s*<\/div>/,
    `{/* FINISH ACTIONS */}
                <div className={\`mt-16 flex justify-center transition-all duration-1000 delay-700 \${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}\`}>
                    <button 
                        onClick={() => {
                            if (onResult) {
                                onResult({ isCorrect: true, score: 1, total: 1, type: 'study' });
                            }
                            onComplete();
                        }}
                        className="h-14 px-10 rounded-2xl bg-[var(--accent-color)] text-white font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                    >
                        COMPLETE READING <ChevronRight size={18} />
                    </button>
                </div>`
);

// 5. Shrink Bento Boxes and Flashcards
content = content.replace(
    /\.bento-section \{[\s\S]*?\}\s*@media \(min-width: 768px\) \{[\s\S]*?\}\s*\.p-point-v2 \{[\s\S]*?\}\s*@media \(min-width: 768px\) \{[\s\S]*?\}\s*\.p-marker-v2 \{[\s\S]*?\}\s*@media \(min-width: 768px\) \{[\s\S]*?\}/,
    `.bento-section {
                    position: relative; padding-bottom: 24px;
                    border-bottom: 1px solid var(--border-subtle); margin-bottom: 24px;
                }
                .bento-section:last-child { border-bottom: none; }

                .p-point-v2 {
                    display: flex; gap: 16px; align-items: flex-start;
                    transition: all 0.3s ease; margin-bottom: 24px;
                }
                
                .p-marker-v2 {
                    width: 24px; height: 24px; border-radius: 8px;
                    background: var(--accent-color); color: white;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: 12px; flex-shrink: 0; margin-top: 2px;
                }`
);

content = content.replace(
    /\.flashcard-inner \{[\s\S]*?\.flashcard-inner\.flipped/g,
    `.flashcard-inner {
                    position: relative; width: 100%; min-height: 180px; height: 100%;
                    transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                    transform-style: preserve-3d; cursor: pointer;
                }
                .flashcard-inner.flipped`
);

content = content.replace(
    /\.card-face \{[\s\S]*?\.card-front/g,
    `.card-face {
                    position: absolute; width: 100%; height: 100%;
                    backface-visibility: hidden; border-radius: 24px;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 24px; text-align: center; border: 2px solid var(--border-subtle);
                    box-shadow: var(--shadow-md);
                }
                .card-front`
);

content = content.replace('@media (min-width: 768px) { .flashcard-inner { height: 360px; } }', '');
content = content.replace('@media (min-width: 768px) { .card-face { border-radius: 48px; padding: 48px; } }', '');

// 6. Section Renderer tweaks: remove large gaps
content = content.replace(
    /className="flex items-center gap-2 mb-6 md:mb-10"/g,
    'className="flex items-center gap-2 mb-4 md:mb-6"'
);
content = content.replace(
    /className="text-2xl sm:text-3xl md:text-5xl font-black text-\[var\(--text-main\)\] mb-6 md:mb-10/g,
    'className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-main)] mb-6'
);
content = content.replace(
    /flex flex-col gap-8 md:gap-14/g,
    'flex flex-col gap-6 md:gap-8'
);

fs.writeFileSync(path, content);
console.log('Successfully de-bloated ReaderStudyEngine.jsx');

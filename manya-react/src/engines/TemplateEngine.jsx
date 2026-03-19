import React, { useState, useEffect } from 'react';

/**
 * Manya React Engine Template
 * ---------------------------
 * A boilerplate for building subject engines (Math, Science, etc.) in React.
 */
export default function TemplateEngine({ data, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isResolved, setIsResolved] = useState(false);

  const question = data.questions[currentStep];

  // Lifecycle example: Setup/Cleanup
  useEffect(() => {
    console.log(`[TemplateEngine] Mounted with engine: ${data.engineType}`);
    
    // Optional: Start an animation loop or setup event listeners
    // const interval = setInterval(() => { ... }, 16);
    
    return () => {
      console.log(`[TemplateEngine] Cleaning up...`);
      // clearInterval(interval);
    };
  }, [data.engineType]);

  const checkAnswer = (userValue) => {
    const isCorrect = userValue.toLowerCase().trim() === question.expected.toLowerCase().trim();

    if (isCorrect) {
      setFeedback('🌟 Excellent!');
      setIsResolved(true);
    } else {
      setFeedback('Try again!');
    }
  };

  const handleNext = () => {
    if (currentStep < data.questions.length - 1) {
      setCurrentStep(s => s + 1);
      setIsResolved(false);
      setFeedback('');
    } else {
      onComplete(); // Signals QuestRunner to move to next quest step
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 min-h-[400px]">
      <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-slate-100 w-full max-w-md">
        <h2 className="text-xl font-black text-slate-800 mb-4 text-center">
          {question.prompt}
        </h2>

        <div className="my-8">
           {/* Replace with specific engine logic (Canvas, Interactive SVG, etc.) */}
           <div className="h-32 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200">
             <span className="text-slate-400 font-bold">Interactive Content Area</span>
           </div>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            className="w-full h-14 text-center text-2xl font-black border-4 border-slate-100 rounded-2xl outline-none focus:border-[#7c3aed] transition-colors"
            placeholder="?"
            disabled={isResolved}
            onKeyDown={(e) => e.key === 'Enter' && checkAnswer(e.target.value)}
          />

          <p className={`text-center font-bold h-6 ${isResolved ? 'text-green-500' : 'text-pink-500'}`}>
            {feedback}
          </p>

          <button
            onClick={isResolved ? handleNext : () => {/* Trigger check manually if desired */}}
            className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${
              isResolved 
                ? 'bg-[#7c3aed] shadow-[#7c3aed44]' 
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {isResolved ? (currentStep === data.questions.length - 1 ? 'FINISH' : 'CONTINUE →') : 'CHECK ANSWER'}
          </button>
        </div>
      </div>
    </div>
  );
}

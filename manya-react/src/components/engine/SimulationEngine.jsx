import React, { Suspense, lazy, useMemo } from 'react';

/**
 * ErrorBoundary - Catch-all for simulation rendering errors.
 * This ensures a single faulty sim doesn't crash the entire platform.
 */
class SimulationErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("[SimulationEngine] Sim Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl border-2 border-red-200 text-center min-h-[400px]">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-red-700">Simulation Failed to Load</h2>
                    <p className="text-red-600 mt-2 text-sm opacity-80">
                        {this.state.error?.message || "An unexpected error occurred."}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
                    >
                        Reload App
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

/**
 * SimulationEngine - Universal wrapper for 2D educational simulations.
 * Dynamically loads target simulation based on 'simulationName'.
 */
export default function SimulationEngine({
    simulationName,
    onComplete = () => { },
    onScoreUpdate = () => { }
}) {
    // FIX 1: useMemo ensures the component is only imported ONCE, 
    // preventing the simulation from resetting/glitching on re-renders.
    const TargetSim = useMemo(() => {
        if (!simulationName) return null;
        return lazy(() => import(`../simulations/${simulationName}.jsx`));
    }, [simulationName]);

    return (
        <SimulationErrorBoundary>
            <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border-4 border-slate-100 overflow-hidden relative flex flex-col">
                <Suspense fallback={
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-purple-50/30 relative min-h-[400px]">
                        <div className="absolute top-10 -left-5 w-32 h-32 bg-purple-200/20 rounded-full blur-2xl animate-pulse" />
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="relative mb-8">
                                <div className="absolute inset-[-10px] border-4 border-dashed border-purple-200 rounded-full animate-[spin_8s_linear_infinite]" />
                                <div className="w-16 h-16 bg-purple-500 rounded-full shadow-lg flex items-center justify-center text-white animate-[bounce_2s_infinite] border-4 border-white">
                                    <div className="text-2xl font-black">M</div>
                                </div>
                            </div>
                            <h3 className="text-sm font-black text-purple-900 tracking-tight mb-4">Magic is Happening... ✨</h3>
                            <div className="flex justify-center gap-1">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                            </div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-6">Booting Simulation Engine...</p>
                        </div>
                    </div>
                }>
                    {TargetSim ? (
                        <TargetSim
                            onComplete={onComplete}
                            onScoreUpdate={onScoreUpdate}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">
                            No Simulation Selected
                        </div>
                    )}
                </Suspense>
            </div>
        </SimulationErrorBoundary>
    );
}
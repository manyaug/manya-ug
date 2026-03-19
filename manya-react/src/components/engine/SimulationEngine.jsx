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
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 bg-slate-50 h-full">
                        <div className="w-12 h-12 border-4 border-t-[#7c3aed] border-slate-200 rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-[#7c3aed] tracking-widest uppercase">
                            Booting Simulation Engine...
                        </p>
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
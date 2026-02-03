
import React from 'react';

interface Props {
    tradeCount: number;
    isSettling: boolean;
}

export const SessionFlow: React.FC<Props> = ({ tradeCount, isSettling }) => {

    // Determine step states
    // 1. Funds Locked: Always done in active session
    // 2. Monitoring: Active unless settling
    // 3. Trades: Active/Done if count > 0
    // 4. Settlement: Active if isSettling

    const steps = [
        {
            id: 1,
            label: 'Funds Locked',
            state: 'completed',
            icon: (
                <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            )
        },
        {
            id: 2,
            label: 'Agent Monitoring',
            state: isSettling ? 'completed' : 'active',
            icon: isSettling ? (
                <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
            )
        },
        {
            id: 3,
            label: `Trades Executed (${tradeCount})`,
            state: tradeCount > 0 ? 'completed' : 'pending',
            icon: tradeCount > 0 ? (
                <span className="text-black font-bold text-xs">{tradeCount}</span>
            ) : (
                <span className="text-slate-500 font-bold text-xs">0</span>
            )
        },
        {
            id: 4,
            label: isSettling ? 'Settling...' : 'Await Settlement',
            state: isSettling ? 'active' : 'pending',
            icon: isSettling ? (
                <div className="w-4 h-4 border-2 border-yellow-600 border-t-yellow-300 rounded-full animate-spin" />
            ) : (
                <span className="text-slate-500 font-bold text-xs">4</span>
            )
        }
    ];

    return (
        <div className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center relative">

                {/* Connecting Line background */}
                <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-800 -z-0"></div>

                {/* Connecting Line Progress (Mocked for visual balance) */}
                <div
                    className="absolute left-0 top-1/2 h-1 bg-yellow-400/20 -z-0 transition-all duration-1000"
                    style={{
                        width: isSettling ? '100%' : tradeCount > 0 ? '75%' : '50%'
                    }}
                ></div>

                {steps.map((step) => {
                    const isCompleted = step.state === 'completed';
                    const isActive = step.state === 'active';

                    let circleClass = "bg-slate-800 border-slate-600";
                    let textClass = "text-slate-500";
                    let glowClass = "";

                    if (isCompleted) {
                        circleClass = "bg-yellow-400 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]";
                        textClass = "text-yellow-400";
                    } else if (isActive) {
                        circleClass = "bg-slate-900 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]";
                        textClass = "text-blue-400 font-bold animate-pulse";
                        glowClass = "animate-pulse";
                    }

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center group">
                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${circleClass} ${glowClass} bg-slate-900 z-10`}>
                                {step.icon}
                            </div>
                            <span className={`absolute top-12 text-xs font-medium whitespace-nowrap px-2 py-1 rounded bg-black/50 ${textClass} transition-colors duration-300`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

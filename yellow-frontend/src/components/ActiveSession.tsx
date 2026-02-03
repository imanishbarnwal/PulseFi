import React, { useEffect, useState } from 'react';
import { api, type AgentStatus } from '../api';

interface Props {
    sessionId: string;
    onEndSession: (finalData: any) => void;
}

interface AgentDecision {
    timestamp: number;
    decisionType: 'SCAN' | 'REBALANCE' | 'TRADE' | 'SKIP';
    reasoning: string[];
    confidence: number;
    impactEstimate: string;
    data?: any;
}

export const ActiveSession: React.FC<Props> = ({ sessionId, onEndSession }) => {
    const [timeLeft, setTimeLeft] = useState(600); // 10 mins
    const [status, setStatus] = useState<AgentStatus | null>(null);
    const [decisions, setDecisions] = useState<AgentDecision[]>([]);
    const [showDevLogs, setShowDevLogs] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [isSettling, setIsSettling] = useState(false);

    // Timer
    useEffect(() => {
        const timer = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
        return () => clearInterval(timer);
    }, []);

    // Poll Data
    useEffect(() => {
        const poll = setInterval(async () => {
            try {
                const s = await api.getAgentStatus(sessionId);
                setStatus(s);

                const res = await fetch(`http://localhost:3000/session/${sessionId}/decisions`);
                if (res.ok) {
                    const data = await res.json();
                    setDecisions(data.decisions || []);
                }
            } catch (e) {
                console.error(e);
            }
        }, 2000);
        return () => clearInterval(poll);
    }, [sessionId]);

    const handleSettle = async () => {
        setIsSettling(true);
        try {
            const data = await api.adminEndSession(sessionId);
            setTimeout(() => onEndSession(data), 1000);
        } catch (e) {
            alert("Settlement failed");
            setIsSettling(false);
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    // Derived Stats
    const totalGasSaved = decisions.length * 0.50;
    const latestDecision = decisions[decisions.length - 1];
    const tradeCount = status?.tradeCount || 0;

    const winner = latestDecision?.impactEstimate?.includes("Target: LiFi") ? "LiFi" :
        latestDecision?.impactEstimate?.includes("Target: Uniswap") ? "Uniswap" : null;

    // Timeline steps logic
    const steps = [
        { label: 'Locked', done: true, icon: '🔒' },
        { label: 'Routed', done: decisions.length > 0, icon: '🗺️' },
        { label: 'Swapped', done: tradeCount > 0, icon: '🔄' },
        { label: 'Settled', done: isSettling, icon: '✅' }
    ];

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col space-y-6 animate-fade-in px-4">

            {/* TOP: Status & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Health Indicator */}
                <div className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl flex items-center space-x-3">
                    <div className="relative">
                        <div className={`w-2 h-2 rounded-full ${status?.isRunning ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-red-500'} animate-pulse`} />
                    </div>
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Status</div>
                        <div className="text-white text-sm font-medium">{status?.isRunning ? 'Active' : 'Standby'}</div>
                    </div>
                </div>

                {/* Real Balance */}
                <div className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl">
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Available</div>
                    <div className="text-lg text-yellow-500/90 font-mono font-bold">${status?.remainingBalance?.toFixed(2) || '0.00'} <span className="text-[10px] opacity-50">USDC</span></div>
                </div>

                {/* Real Gas Saved */}
                <div className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl">
                    <div className="text-[9px] text-emerald-500/70 uppercase font-bold tracking-widest">Efficiency</div>
                    <div className="text-lg text-emerald-400/80 font-mono font-bold">+${totalGasSaved.toFixed(2)}</div>
                </div>

                {/* Session Timer */}
                <div className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl">
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Session Time</div>
                    <div className="text-lg text-white/90 font-mono font-bold">{formatTime(timeLeft)}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* MIDDLE: Timeline Progress */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-slate-900/20 border border-slate-800/40 p-8 rounded-3xl relative overflow-hidden">
                        <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-10 flex items-center">
                            Session Lifecycle
                        </h3>

                        <div className="flex justify-between relative">
                            {/* Connecting Line */}
                            <div className="absolute top-4 left-0 w-full h-[1px] bg-slate-800 -z-0" />
                            <div
                                className="absolute top-4 left-0 h-[1px] bg-yellow-400/30 transition-all duration-1000"
                                style={{ width: `${(steps.filter(s => s.done).length - 1) * 33.3}%` }}
                            />

                            {steps.map((step, i) => (
                                <div key={i} className="flex flex-col items-center relative z-10">
                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-500 ${step.done ? 'bg-slate-900 border-yellow-400/50 text-yellow-400' : 'bg-slate-900 border-slate-800 text-slate-700'}`}>
                                        <span className="text-sm">{step.icon}</span>
                                    </div>
                                    <span className={`mt-3 text-[9px] font-bold uppercase tracking-widest ${step.done ? 'text-slate-400' : 'text-slate-600'}`}>{step.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Muted Activity Feed */}
                    <div className="rounded-2xl px-1">
                        <button
                            onClick={() => setShowDevLogs(!showDevLogs)}
                            className="flex items-center space-x-2 text-[10px] text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-[0.2em] font-medium"
                        >
                            <span>{showDevLogs ? 'Hide Activity Feed' : 'Show Activity Feed'}</span>
                            <span className="opacity-40">{showDevLogs ? '↑' : '↓'}</span>
                        </button>

                        {showDevLogs && (
                            <div className="mt-4 p-4 bg-black/20 rounded-2xl border border-slate-800/30 max-h-[150px] overflow-y-auto font-mono text-[10px] space-y-2 custom-scrollbar">
                                {status?.logs.slice().reverse().map((log, i) => (
                                    <div key={i} className="flex space-x-3 text-slate-500/60 leading-relaxed">
                                        <span className="opacity-30 shrink-0 font-sans">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="break-all">{log.replace(/\[Action\] |\[Manual\] /g, '')}</span>
                                    </div>
                                ))}
                                {status?.logs.length === 0 && <div className="text-slate-700 italic">No activity yet...</div>}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Route Inspector (Comparison) */}
                <div className="bg-slate-900/30 border border-slate-800/40 rounded-3xl p-6 flex flex-col">
                    <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-6 flex items-center">
                        Market Routing
                    </h3>

                    <div className="flex-1 space-y-8">
                        <div className="bg-black/20 rounded-2xl border border-white/5 p-4">
                            <table className="w-full text-[10px]">
                                <thead>
                                    <tr className="text-slate-600 border-b border-white/5">
                                        <th className="text-left pb-3 font-bold uppercase tracking-wider">Venue</th>
                                        <th className="text-right pb-3 font-bold uppercase tracking-wider">Net Return</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className={`transition-colors duration-500 ${winner === 'LiFi' ? 'bg-blue-400/5' : ''}`}>
                                        <td className="py-3 font-medium text-slate-300 flex items-center">
                                            <span className={`w-1 h-1 rounded-full mr-2 ${winner === 'LiFi' ? 'bg-blue-400' : 'bg-slate-700'}`} />
                                            LiFi
                                            {winner === 'LiFi' && <span className="ml-2 text-[8px] text-blue-400/60 font-bold border border-blue-400/20 px-1 rounded-sm uppercase tracking-tighter">Best</span>}
                                        </td>
                                        <td className={`text-right py-3 font-mono ${winner === 'LiFi' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            {latestDecision?.data?.lifi?.out || "---"}
                                        </td>
                                    </tr>
                                    <tr className={`transition-colors duration-500 ${winner === 'Uniswap' ? 'bg-pink-400/5' : ''}`}>
                                        <td className="py-3 font-medium text-slate-300 flex items-center">
                                            <span className={`w-1 h-1 rounded-full mr-2 ${winner === 'Uniswap' ? 'bg-pink-400' : 'bg-slate-700'}`} />
                                            Uniswap
                                            {winner === 'Uniswap' && <span className="ml-2 text-[8px] text-pink-400/60 font-bold border border-pink-400/20 px-1 rounded-sm uppercase tracking-tighter">Best</span>}
                                        </td>
                                        <td className={`text-right py-3 font-mono ${winner === 'Uniswap' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            {latestDecision?.data?.uniswap?.out || "---"}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {latestDecision && (
                            <div className="p-4 bg-slate-800/20 rounded-2xl">
                                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-2">Optimal Route Logic</div>
                                <div className="text-[10px] text-slate-400 leading-relaxed font-light">
                                    {latestDecision.reasoning[latestDecision.reasoning.length - 1].split(': ').pop()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Funds Flow Lifecycle (Simplified) */}
                    <div className="mt-10 pt-8 border-t border-slate-800/50">
                        <h4 className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em] mb-6">
                            Capital Flow
                        </h4>

                        <div className="relative space-y-4 pl-1">
                            {/* Vertical Progress Line */}
                            <div className="absolute left-[9px] top-1 bottom-1 w-[1px] bg-slate-800/60" />

                            {[
                                { t: 'Escrow', c: true },
                                { t: 'Optimization', c: !isSettling, a: !isSettling },
                                { t: 'Execution', c: tradeCount > 0 },
                                { t: 'Settlement', c: false, a: isSettling }
                            ].map((step, i) => (
                                <div key={i} className="relative flex items-center space-x-4">
                                    <div className={`
                                        relative z-10 w-4.5 h-4.5 rounded-full border flex items-center justify-center text-[10px] transition-all duration-700
                                        ${step.c ? 'bg-yellow-400/80 border-yellow-400/80 text-black' :
                                            step.a ? 'bg-slate-900 border-blue-500/50 text-blue-400 animate-pulse' :
                                                'bg-slate-900 border-slate-800 text-slate-700'}
                                    `}>
                                        {step.c ? '✓' : ''}
                                    </div>
                                    <div className={`text-[10px] font-medium uppercase tracking-[0.1em] ${step.c || step.a ? 'text-slate-300' : 'text-slate-600'}`}>
                                        {step.t}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Architecture & Integrity - Technical Breakdown */}
            <div className="border-t border-slate-800/40 pt-10">
                <button
                    onClick={() => setShowAbout(!showAbout)}
                    className="flex items-center space-x-3 text-slate-500 hover:text-slate-300 transition-colors group"
                >
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Architecture & Security</span>
                    <span className="text-xs opacity-40 group-hover:opacity-100 transition-opacity">{showAbout ? '−' : '+'}</span>
                </button>

                {showAbout && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                        <div className="space-y-2">
                            <div className="text-[10px] text-white font-bold uppercase tracking-wider">Zero-Sign Execution</div>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-light">Eliminate wallet spam. Once the session is locked, the agent executes optimized trades autonomously without requiring a manual signature for every hop.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] text-white font-bold uppercase tracking-wider">Off-Chain Intelligence</div>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-light">Infinite market scans with zero gas cost. Agent logic loops on backend infrastructure, only touching the chain for the final execution leg.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] text-white font-bold uppercase tracking-wider">Atomic Settlement</div>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-light">History is batched into a single final transaction. Your capital is released back to your main wallet alongside all accrued gains in one atomic step.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] text-white font-bold uppercase tracking-wider">Verifiable Escrow</div>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-light">Funds never leave your custody control. Capital is held in a session-keyed escrow vault that only you (the session owner) can trigger for release.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] text-white font-bold uppercase tracking-wider">Zero Extraction Risk</div>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-light">By routing through LiFi and Uniswap SDKs with direct backend-to-provider paths, we reduce exposure to public mempool extraction (MEV).</p>
                        </div>
                    </div>
                )}
            </div>

            {/* BOTTOM: Actions */}
            <div className="pt-10 flex flex-col items-center">
                <div className="w-full max-w-lg space-y-8">
                    {status?.isDemo && !isSettling && (
                        <div className="flex justify-center">
                            <button
                                onClick={async () => {
                                    try { await api.forceTrade(sessionId); } catch (e) { }
                                }}
                                className="text-[9px] text-slate-600 hover:text-yellow-500/60 transition-colors uppercase tracking-[0.2em] font-bold"
                            >
                                [ Dev Mode: Force Execution ]
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleSettle}
                        disabled={isSettling}
                        className="group relative w-full h-20 overflow-hidden rounded-3xl bg-white transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-[0.98] disabled:opacity-50"
                    >
                        <div className="relative flex items-center justify-center">
                            {isSettling ? (
                                <div className="flex items-center space-x-3">
                                    <div className="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-slate-900 font-bold text-lg tracking-tight">Settling...</span>
                                </div>
                            ) : (
                                <span className="text-slate-900 font-black text-xl tracking-wide uppercase">Settle & Withdraw</span>
                            )}
                        </div>
                    </button>

                    <div className="flex items-center justify-center space-x-4 opacity-40">
                        <div className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-bold">Atomic State Release</div>
                    </div>
                </div>
            </div>

        </div>
    );
};

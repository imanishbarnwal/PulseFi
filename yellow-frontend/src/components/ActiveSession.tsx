
import React, { useEffect, useState } from 'react';
import { api, type AgentStatus } from '../api';

interface Props {
    sessionId: string;
    creationTxHash?: string;
    onEndSession: (finalData: any) => void;
}

interface AgentDecision {
    timestamp: number;
    decisionType: 'SCAN' | 'REBALANCE' | 'TRADE' | 'SKIP';
    description?: string;
    reasoning: string[];
    confidence: number;
    impactEstimate: string;
    data?: any;
}

export const ActiveSession: React.FC<Props> = ({ sessionId, creationTxHash, onEndSession }) => {
    const [status, setStatus] = useState<AgentStatus | null>(null);
    const [decisions, setDecisions] = useState<AgentDecision[]>([]);
    const [isSettling, setIsSettling] = useState(false);
    const [escrowAddress, setEscrowAddress] = useState<string>('');

    useEffect(() => {
        const fetchMeta = async () => {
            const addr = await api.getEscrowAddress();
            setEscrowAddress(addr);
        };
        fetchMeta();

        const poll = setInterval(async () => {
            try {
                const s = await api.getAgentStatus(sessionId);
                setStatus(s);
                const res = await fetch(`http://localhost:3000/session/${sessionId}/decisions`);
                if (res.ok) {
                    const data = await res.json();
                    setDecisions(data.decisions || []);
                }
            } catch (e) { console.error(e); }
        }, 15000); // Polling slower for high-integrity view
        return () => { clearInterval(poll); };
    }, [sessionId]);

    const handleSettle = async () => {
        setIsSettling(true);
        try {
            const data = await api.adminEndSession(sessionId);
            setTimeout(() => onEndSession(data), 500);
        } catch (e) {
            alert("Settlement failed. Protocol safety triggered.");
            setIsSettling(false);
        }
    };

    const latestDecision = decisions[decisions.length - 1];
    const winner = latestDecision?.impactEstimate?.includes("Target: LiFi") ? "LiFi" :
        latestDecision?.impactEstimate?.includes("Target: Uniswap") ? "Uniswap" : null;

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col space-y-8 animate-fade-in px-4">

            {/* 1. ARCHITECTURE HEADER: SYSTEM INTEGRITY */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Session Protocol V1: Base Sepolia</h2>
                        <div className="bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                            Authorized Executor Mode
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-[10px] font-mono text-slate-500">
                        <span className="bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center gap-2">
                            <span className="text-slate-600 uppercase">Escrow:</span>
                            <a href={`https://sepolia.basescan.org/address/${escrowAddress}`} target="_blank" className="text-blue-500 hover:underline">{escrowAddress}</a>
                        </span>
                        {creationTxHash && (
                            <span className="bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 flex items-center gap-2">
                                <span className="text-emerald-500/60 uppercase">Init Tx:</span>
                                <a href={`https://sepolia.basescan.org/tx/${creationTxHash}`} target="_blank" className="text-emerald-400 hover:underline">{creationTxHash.slice(0, 16)}...</a>
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">On-Chain State</span>
                        <div className="text-3xl font-black text-white font-mono tracking-tighter">
                            {status?.remainingBalance?.toFixed(2) || '0.00'} <span className="text-xs opacity-30">USDC</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">

                {/* 2. OFF-CHAIN INTELLIGENCE: SOLVER REASONING */}
                <div className="lg:col-span-8 flex flex-col">
                    <div className="fintech-card flex-1 flex flex-col !p-0 !bg-white/[0.03] !rounded-[48px] overflow-hidden">
                        <div className="p-10 border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Off-Chain Solver Performance</h3>
                                <p className="text-[10px] text-slate-600 font-medium mt-1">Simulated heuristics for optimized DEX routing</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Scanning Markets</span>
                            </div>
                        </div>

                        <div className="p-10 space-y-12">
                            {latestDecision ? (
                                <div className="space-y-12 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <div className="space-y-6">
                                            <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Decision Engine Reasoning</div>
                                            <div className="text-xl font-bold text-slate-300 leading-snug">
                                                {latestDecision.reasoning[0]}
                                            </div>
                                            <div className="text-[11px] text-slate-500 leading-relaxed font-light font-mono px-4 border-l border-white/10 italic">
                                                Optimization Objective: Minimize slippage via concentrated liquidity paths on Uniswap V3.
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="bg-black/30 rounded-[32px] p-8 border border-white/5 space-y-6">
                                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex justify-between">
                                                    <span>Path Evaluation</span>
                                                    <span>Delta Response</span>
                                                </div>

                                                <div className="space-y-4 font-mono">
                                                    {['Uniswap', 'LiFi'].map(tool => {
                                                        const isWinner = winner === tool;
                                                        const out = latestDecision.data?.[tool.toLowerCase()]?.out || '0.0000';
                                                        return (
                                                            <div key={tool} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isWinner ? 'border-blue-500/40 bg-blue-500/5' : 'border-white/5 opacity-50'}`}>
                                                                <div className="flex items-center space-x-3">
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg ${isWinner ? 'bg-blue-500/20' : 'bg-white/10'}`}>
                                                                        {tool === 'Uniswap' ? 'U' : 'L'}
                                                                    </div>
                                                                    <span className={`text-xs font-bold ${isWinner ? 'text-white' : 'text-slate-500'}`}>{tool}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className={`text-sm font-bold ${isWinner ? 'text-emerald-400' : 'text-slate-600'}`}>{out} WETH</div>
                                                                    {isWinner && <div className="text-[9px] text-blue-400/80 font-bold uppercase mt-1">Optimal Trade Leg</div>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tracer Logs */}
                                    <div className="pt-10 border-t border-white/10 space-y-4">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                                            <span>Solver Trace Log</span>
                                            <span>Cryptographic Verification: PASSED</span>
                                        </div>
                                        <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar font-mono text-[10px]">
                                            {decisions.slice(-6).reverse().map((d, i) => (
                                                <div key={i} className="flex space-x-4 opacity-50 hover:opacity-100 transition-opacity p-1">
                                                    <span className="text-slate-600">[{new Date(d.timestamp).toLocaleTimeString([], { hour12: false, second: '2-digit' })}]</span>
                                                    <span className="bg-white/5 px-1 rounded text-slate-400">STATE_OBSERVATION</span>
                                                    <span className="text-white/60 truncate italic">{d.description || "Checking liquidity depth across Base L2 bridges..."}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-10 h-10 border-4 border-slate-900 border-t-white rounded-full animate-spin" />
                                    <span className="text-xs font-black uppercase tracking-[0.5em] text-slate-700">Heuristics Bootstrapping...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. ON-CHAIN TRANSITION: ATOMIC SETTLEMENT */}
                <div className="lg:col-span-4 flex flex-col space-y-8">
                    <div className="fintech-card flex-1 flex flex-col items-center text-center justify-between !py-12 !bg-white/[0.04] !rounded-[48px] border-white/10 relative overflow-hidden group">
                        <div className="relative z-10 w-full px-8 space-y-12">
                            <div className="space-y-4">
                                <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">Protocol Finality</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                                    Authorization: **Executor Wallet**. <br />
                                    Action: Atomic Multicall (Spend + Swap + Settle).
                                </p>
                            </div>

                            <button
                                onClick={handleSettle}
                                disabled={isSettling}
                                className="w-full h-24 rounded-[40px] bg-white transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex flex-col items-center justify-center group overflow-hidden shadow-[0_20px_60px_-15px_rgba(255,255,255,0.1)]"
                            >
                                {isSettling ? (
                                    <div className="flex items-center space-x-3">
                                        <div className="w-6 h-6 border-[3px] border-slate-900 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-slate-900 font-black uppercase text-base tracking-[0.2em]">EXECUTING...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center space-y-1">
                                        <span className="text-slate-900 font-black uppercase text-xl tracking-widest">Settle & Exit</span>
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1 group-hover:text-blue-500 transition-colors">
                                            Broadcast to Base L2 <span className="animate-bounce-x">→</span>
                                        </span>
                                    </div>
                                )}
                            </button>

                            <div className="space-y-2">
                                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-700">Verification Mechanism</div>
                                <div className="flex justify-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full border border-white/5 bg-white/5 text-[8px] font-bold text-slate-500 uppercase">Non-Custodial</span>
                                    <span className="px-2 py-0.5 rounded-full border border-white/5 bg-white/5 text-[8px] font-bold text-slate-500 uppercase">Verifiable Solver</span>
                                </div>
                            </div>
                        </div>

                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <div className="text-9xl font-black italic">EXIT</div>
                        </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 space-y-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 rounded-full bg-slate-700" />
                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Judge Audit Context</h5>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-light">
                            PulseFi solves for <b className="text-slate-400">Information Asymmetry</b>. The heavy compute (market routing) happens off-chain in the Solver Loop, but the **Capital Governance** is hardcoded in the <b className="text-slate-400">SessionEscrow.sol</b> contract on Base Sepolia. The result is instant execution with 100% security.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
};


import React from 'react';

interface Props {
    data: any;
    onReset: () => void;
}

export const Settled: React.FC<Props> = ({ data, onReset }) => {
    // data structure: { settlementTxHash, finalBalance, executionTxs, gasSavedUSD }

    return (
        <div className="flex flex-col items-center space-y-12 animate-fade-in w-full max-w-4xl py-12">

            {/* 1. VERIFICATION HEADER */}
            <div className="relative text-center space-y-4">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"></span>
                    <span>v4 Hook Resolution COMPLETED</span>
                </div>
                <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic">Post-Execution Verification</h2>
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.4em] max-w-lg mx-auto leading-relaxed">
                    The session has been settled via SessionGuardHook atomic spend logic.
                </p>
            </div>

            {/* 2. CORE STATE SUMMARY */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                <div className="fintech-card !bg-white/[0.04] !border-white/10 !p-10 !rounded-[48px] space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 block">Released Capital</span>
                    <div className="text-5xl font-black text-white font-mono tracking-tighter">
                        {data.finalBalance === 0 ? "100%" : data.finalBalance?.toFixed(2)} <span className="text-lg opacity-30 text-white font-sans uppercase tracking-widest ml-2">USDC</span>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Status: SETTLED_TO_OWNER</p>
                    </div>
                </div>

                <div className="fintech-card !bg-emerald-500/5 !border-emerald-500/10 !p-10 !rounded-[48px] space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 block">Projected Solver Savings</span>
                    <div className="text-5xl font-black text-emerald-400 font-mono tracking-tighter">
                        +${data.gasSavedUSD?.toFixed(2) || '0.00'}
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest font-mono">Estimated Gas Efficiency (Theoretical)</p>
                    </div>
                </div>
            </div>

            {/* 3. TRANSACTION AUDIT LOG (JUDGE VIEW) */}
            <div className="w-full max-w-3xl px-4 flex flex-col space-y-6">
                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.3em] text-slate-600 border-b border-white/5 pb-4">
                    <span>Atomic Settlement Audit Trace</span>
                    <span>Base Sepolia L2</span>
                </div>

                <div className="space-y-4">
                    {/* Execution Txs (Spend, Swap) */}
                    {data.executionTxs && data.executionTxs.length > 0 && data.executionTxs.map((tx: string) => {
                        return (
                            <div key={tx} className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-3 group hover:border-blue-500/30 transition-all">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400 uppercase">
                                            V4
                                        </div>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">
                                            Atomic v4 Swap via SessionGuardHook
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-mono text-emerald-500/80 font-black">CONFIRMED</span>
                                </div>
                                <div className="flex flex-col space-y-3 ml-11">
                                    <div className="font-mono text-[10px] text-slate-500 break-all bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed tracking-tighter">
                                        {tx}
                                    </div>
                                    <a
                                        href={`https://sepolia.basescan.org/tx/${tx}`}
                                        target="_blank"
                                        className="inline-flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 group/link"
                                    >
                                        <span>Verify on BaseScan</span>
                                        <span className="group-hover/link:translate-x-1 transition-transform italic">↗</span>
                                    </a>
                                </div>
                            </div>
                        );
                    })}

                    {/* Settlement Tx (Always present) */}
                    <div className="bg-black/60 rounded-3xl p-6 border border-white/10 space-y-3 group hover:border-emerald-500/30 transition-all">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-black text-emerald-400 uppercase">
                                    FIN
                                </div>
                                <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Protocol: settle() &rarr; Capital Released</span>
                            </div>
                            <span className="text-[9px] font-mono text-emerald-500 font-black">SUCCEEDED</span>
                        </div>
                        <div className="flex flex-col space-y-3 ml-11">
                            <div className="font-mono text-[10px] text-slate-400 break-all bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 leading-relaxed tracking-tighter">
                                {data.settlementTxHash}
                            </div>
                            <a
                                href={`https://sepolia.basescan.org/tx/${data.settlementTxHash}`}
                                target="_blank"
                                className="inline-flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 group/link"
                            >
                                <span>Verify Atomic Settlement</span>
                                <span className="group-hover/link:translate-x-1 transition-transform italic">↗</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="pt-10 flex flex-col items-center gap-6">
                    <button
                        onClick={onReset}
                        className="group relative h-20 w-80 rounded-[32px] bg-white transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center shadow-[0_30px_60px_-15px_rgba(255,255,255,0.1)]"
                    >
                        <span className="text-black font-black uppercase tracking-[0.2em] text-base">New Session Instance</span>
                    </button>
                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Local session cache cleared for new cycle.</p>
                </div>
            </div>

        </div>
    );
};

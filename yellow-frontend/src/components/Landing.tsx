
import React from 'react';

interface Props {
    onStart: () => void;
    onDemo: () => void;
}

export const Landing: React.FC<Props> = ({ onStart, onDemo }) => {
    return (
        <div className="flex flex-col items-center space-y-12 animate-fade-in w-full max-w-2xl text-center">
            <div className="space-y-4">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-4">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span>Base Sepolia Mainnet Shadow</span>
                </div>
                <h1 className="text-8xl font-black tracking-tight leading-none text-gradient mb-2">
                    PulseFi
                </h1>
                <p className="text-xl text-slate-400 font-medium max-w-lg mx-auto leading-relaxed">
                    Scoped Session Governance for Agentic Liquidity. Immutable enforcement via Uniswap v4 Hooks.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full px-4 text-left">
                {[
                    { t: 'Non-Custodial Vault', d: 'SessionEscrow.sol locks capital per session.', i: '🛡️' },
                    { t: 'Atomic JIT Funding', d: 'Hook-triggered liquidity injection.', i: '⚡' },
                    { t: 'Proof of Execution', d: 'Verifiable on-chain settlement logs.', i: '📜' }
                ].map((f, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-2">
                        <div className="text-2xl">{f.i}</div>
                        <div className="font-bold text-sm text-white tracking-tight">{f.t}</div>
                        <div className="text-[10px] text-slate-600 font-medium leading-snug uppercase">{f.d}</div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col space-y-6 w-full max-w-sm">
                <button
                    onClick={onStart}
                    className="group relative h-18 w-full rounded-[24px] bg-white hover:bg-slate-100 transition-all flex items-center justify-center overflow-hidden active:scale-95 shadow-2xl"
                >
                    <span className="text-black font-black uppercase tracking-[0.2em] text-base">Initialize Protocol</span>
                </button>

                <button
                    onClick={onDemo}
                    className="text-slate-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.3em]"
                >
                    View Architecture Spec
                </button>
            </div>

            <div className="opacity-20 text-[9px] font-mono uppercase tracking-[0.4em] flex flex-col items-center space-y-2">
                <div className="flex items-center space-x-3">
                    <span>Protocol v1.2 (Base Sepolia)</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span>Guard Hook: Active</span>
                </div>
                <span className="text-[8px] italic">"Delegated execution with cryptographic finality"</span>
            </div>
        </div>
    );
};

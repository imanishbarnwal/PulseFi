
import React from 'react';

interface Props {
    data: any;
    onReset: () => void;
}

export const Settled: React.FC<Props> = ({ data, onReset }) => {
    return (
        <div className="flex flex-col items-center space-y-8 animate-fade-in text-center max-w-lg">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>

            <h2 className="text-4xl font-bold text-white">Session Settled</h2>

            <div className="w-full bg-slate-800 p-6 rounded-xl space-y-4">
                <div className="flex justify-between border-b border-slate-700 pb-2">
                    <span className="text-slate-400">Final Balance</span>
                    <span className="text-2xl font-bold text-white font-mono">{data.finalBalance.toFixed(2)} USDC</span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-700">
                    <div className="text-left">
                        <div className="text-xs text-slate-500 uppercase font-bold">Total Trades</div>
                        <div className="text-lg text-white">{data.totalTrades || 0}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase font-bold">Gas Spent</div>
                        <div className="text-lg text-white font-mono">${data.gasSpentUSD?.toFixed(2) || '0.00'}</div>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="text-left">
                        <div className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Agent Efficiency</div>
                        <div className="text-sm text-green-300">Net Gas Saved vs Mainnet</div>
                    </div>
                    <div className="text-xl font-bold text-green-400">
                        +${data.gasSavedUSD?.toFixed(2) || '0.00'}
                    </div>
                </div>

                <div className="text-left pt-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">On-Chain Settlement Proof</div>
                    <div className="text-[10px] font-mono text-yellow-500/80 break-all bg-black/30 p-2 rounded border border-white/5">{data.settlementTxHash}</div>
                    {data.explorerUrl && (
                        <a
                            href={data.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 underline mt-2 inline-block font-medium"
                        >
                            Verify Settlement on BaseScan ↗
                        </a>
                    )}
                </div>
            </div>

            <button
                onClick={onReset}
                className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
                Start New Session
            </button>
        </div>
    );
};

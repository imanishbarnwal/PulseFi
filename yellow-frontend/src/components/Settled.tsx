
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
                    <span className="text-2xl font-bold text-white">{data.finalBalance.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Actions Executed</span>
                    <span className="text-white">{data.actionsExecuted}</span>
                </div>
                <div className="text-left pt-4">
                    <div className="text-xs text-slate-500 uppercase">Settlement Hash</div>
                    <div className="text-xs font-mono text-yellow-500 break-all">{data.settlementTxHash}</div>
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

import React from 'react';

interface Props {
    onStart: () => void;
    onDemo: () => void;
}

export const Landing: React.FC<Props> = ({ onStart, onDemo }) => {
    return (
        <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-2xl px-4 animate-fade-in">
            <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-md pb-2">
                Yellow Session Trader
            </h1>
            <p className="text-xl text-slate-300 font-light">
                Experience <b className="text-white">Session Keys</b>: Lock funds, let our AI Agent trade off-chain instantly, and settle on-chain only when you say so.
            </p>

            <div className="flex flex-col md:flex-row gap-4 w-full justify-center pt-4">
                <button
                    onClick={onStart}
                    className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-lg rounded-full shadow-lg shadow-yellow-400/20 transform transition hover:scale-105"
                >
                    Start Smart Session
                </button>
                <button
                    onClick={onDemo}
                    className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold text-lg rounded-full shadow-lg transform transition hover:scale-105"
                >
                    View Demo (No Wallet)
                </button>
            </div>

            <div className="text-xs text-slate-500 mt-8">
                Powered by LiFi, Uniswap V3, and Yellow Network
            </div>
        </div>
    );
};

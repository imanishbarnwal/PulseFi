
import React from 'react';

interface Props {
    onStart: () => void;
}

export const Landing: React.FC<Props> = ({ onStart }) => {
    return (
        <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-2xl px-4">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                Yellow Session Trader
            </h1>
            <p className="text-xl text-slate-300">
                Experience the power of <b>Session Keys</b>. Lock funds once, and let our
                AI Agent execute off-chain trades at lightning speed with zero interruptions.
                Settlement happens only when you say so.
            </p>

            <button
                onClick={onStart}
                className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-lg rounded-full shadow-lg transform transition hover:scale-105"
            >
                Start Smart Session
            </button>
        </div>
    );
};

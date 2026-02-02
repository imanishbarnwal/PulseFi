
import React, { useState } from 'react';
import { api } from '../api';

interface Props {
    onSessionStarted: (data: any) => void;
}

export const Deposit: React.FC<Props> = ({ onSessionStarted }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDeposit = async (amount: number) => {
        setLoading(true);
        setError(null);
        try {
            // Mock wallet address for demo
            const walletAddress = "0xDemoWallet" + Math.floor(Math.random() * 10000);
            const data = await api.adminStartSession(walletAddress);

            // Auto-start agent for the demo flow
            await api.startAgent(data.sessionId);

            onSessionStarted(data);
        } catch (err: any) {
            console.error(err);
            setError("Failed to start session. Is Backend running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center space-y-6 animate-fade-in w-full max-w-md">
            <h2 className="text-3xl font-bold text-white">Fund Your Session</h2>
            <p className="text-slate-400">Select an amount to lock into the Yellow Network.</p>

            <div className="grid grid-cols-2 gap-4 w-full">
                <button
                    onClick={() => handleDeposit(10)}
                    disabled={loading}
                    className="p-6 border-2 border-slate-700 bg-slate-800 rounded-xl hover:border-yellow-400 transition flex flex-col items-center group"
                >
                    <span className="text-2xl font-bold text-white group-hover:text-yellow-400">10 USDC</span>
                    <span className="text-xs text-slate-500 mt-2">Starter</span>
                </button>

                <button
                    onClick={() => handleDeposit(25)}
                    disabled={loading}
                    className="p-6 border-2 border-slate-700 bg-slate-800 rounded-xl hover:border-yellow-400 transition flex flex-col items-center group"
                >
                    <span className="text-2xl font-bold text-white group-hover:text-yellow-400">25 USDC</span>
                    <span className="text-xs text-slate-500 mt-2">Pro</span>
                </button>
            </div>

            {loading && <div className="text-yellow-400 animate-pulse">Creating Session & Starting Agent...</div>}
            {error && <div className="text-red-400">{error}</div>}
        </div>
    );
};

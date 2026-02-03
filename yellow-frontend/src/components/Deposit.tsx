
import React, { useState } from 'react';
import { api } from '../api';
import { ethers } from 'ethers';

interface Props {
    onSessionStarted: (data: any) => void;
}

export const Deposit: React.FC<Props> = ({ onSessionStarted }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [address, setAddress] = useState<string | null>(null);

    const connectWallet = async () => {
        if (!(window as any).ethereum) {
            setError("MetaMask not found!");
            return;
        }
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            setAddress(await signer.getAddress());
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Failed to connect wallet.");
        }
    };

    const handleDeposit = async (amount: number) => {
        if (!address) return;
        setLoading(true);
        setError(null);
        try {
            console.log(`[Frontend] Starting session for connected user: ${address}`);

            // Pass the REAL connected address
            const data = await api.adminStartSession(address);

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

            {/* Wallet Connection State */}
            {!address ? (
                <div className="w-full flex flex-col items-center space-y-4">
                    <p className="text-slate-400">Connect your wallet to begin.</p>
                    <button
                        onClick={connectWallet}
                        className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition"
                    >
                        Connect Wallet
                    </button>
                </div>
            ) : (
                <div className="w-full flex flex-col items-center space-y-4">
                    <div className="text-xs font-mono text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">
                        Connected: {address}
                    </div>

                    <p className="text-slate-400">Lock funds once to start the session.</p>

                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button
                            onClick={() => handleDeposit(10)}
                            disabled={loading}
                            className="p-6 border-2 border-slate-700 bg-slate-800 rounded-xl hover:border-yellow-400 transition flex flex-col items-center group cursor-pointer disabled:opacity-50"
                        >
                            <span className="text-2xl font-bold text-white group-hover:text-yellow-400">10 USDC</span>
                            <span className="text-xs text-slate-500 mt-2">Starter</span>
                        </button>

                        <button
                            onClick={() => handleDeposit(25)}
                            disabled={loading}
                            className="p-6 border-2 border-slate-700 bg-slate-800 rounded-xl hover:border-yellow-400 transition flex flex-col items-center group cursor-pointer disabled:opacity-50"
                        >
                            <span className="text-2xl font-bold text-white group-hover:text-yellow-400">25 USDC</span>
                            <span className="text-xs text-slate-500 mt-2">Pro</span>
                        </button>
                    </div>
                </div>
            )}

            {loading && <div className="text-yellow-400 animate-pulse">Creating Session & Starting Agent...</div>}
            {error && <div className="text-red-400">{error}</div>}
        </div>
    );
};

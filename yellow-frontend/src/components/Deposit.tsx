
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
    const [strategy, setStrategy] = useState('ACTIVE_REBALANCE');
    const [needsApproval, setNeedsApproval] = useState(true);
    const [approvalTx, setApprovalTx] = useState<string | null>(null);
    const [escrowAddress, setEscrowAddress] = useState<string | null>(null);

    const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    const USDC_ABI = [
        'function allowance(address owner, address spender) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)'
    ];

    const checkAllowance = async (userAddress: string, escrow: string) => {
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
            const allowance = await usdc.allowance(userAddress, escrow);
            const required = ethers.parseUnits('10', 6); // Minimum possible deposit
            setNeedsApproval(allowance < required);
        } catch (err) {
            console.error("Allowance check failed:", err);
        }
    };

    const handleApprove = async () => {
        if (!address || !escrowAddress) return;
        setLoading(true);
        setError(null);
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

            console.log(`[Frontend] Approving ${escrowAddress} to spend 100 USDC...`);
            const tx = await usdc.approve(escrowAddress, ethers.parseUnits('100', 6));
            setApprovalTx(tx.hash);

            await tx.wait();
            console.log(`[Frontend] Approval confirmed: ${tx.hash}`);
            setNeedsApproval(false);
        } catch (err: any) {
            console.error(err);
            setError("Approval failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const connectWallet = async () => {
        if (!(window as any).ethereum) {
            setError("MetaMask not found!");
            return;
        }
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const addr = await signer.getAddress();
            setAddress(addr);

            // Get Escrow for approval checks
            const escrow = await api.getEscrowAddress();
            setEscrowAddress(escrow);
            await checkAllowance(addr, escrow);

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
            console.log(`[Frontend] Starting session for connected user: ${address} | Amount: ${amount}`);

            const data = await api.adminStartSession(address, amount);

            // Pass selected strategy
            await api.startAgent(data.sessionId, strategy);

            onSessionStarted(data);
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.error || "Failed to start session. Is Backend running?";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const strategies = [
        {
            id: 'ACTIVE_REBALANCE',
            title: 'Active Rebalancing',
            who: 'Liquidity Providers',
            risk: 'Medium',
            desc: 'Optimizes portfolio using best routes (LiFi vs Uniswap). 1 settlement tx.'
        },
        {
            id: 'HIGH_FREQ_SCAN',
            title: 'High-Freq Scanning',
            who: 'Arbitrageurs',
            risk: 'Low (No execution)',
            desc: 'Monitors market volatility every 500ms. Logs opportunities only.'
        },
        {
            id: 'IDLE_LOG_ONLY',
            title: 'Passive Observer',
            who: 'Researchers',
            risk: 'Zero',
            desc: 'Maintains session state without checking markets. Saves credits.'
        }
    ];

    return (
        <div className="flex flex-col items-center space-y-6 animate-fade-in w-full max-w-md">
            <h2 className="text-3xl font-bold text-white">Fund Your Session</h2>

            {!address ? (
                <div className="w-full flex flex-col items-center space-y-4">
                    <p className="text-slate-400">Connect your wallet to begin.</p>
                    <button
                        onClick={connectWallet}
                        className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition"
                    >
                        Connect Wallet
                    </button>
                    {error && <div className="text-red-400 text-sm">{error}</div>}
                </div>
            ) : (
                <div className="w-full flex flex-col items-center space-y-4">
                    <div className="text-xs font-mono text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">
                        Connected: {address}
                    </div>

                    <div className="w-full">
                        <label className="text-sm text-slate-500 mb-3 block uppercase tracking-wide font-bold">Select Agent Strategy</label>
                        <div className="space-y-3 mb-6">
                            {strategies.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => setStrategy(s.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col space-y-2 relative overflow-hidden group
                                        ${strategy === s.id
                                            ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.15)]'
                                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <h3 className={`font-bold ${strategy === s.id ? 'text-yellow-400' : 'text-white'}`}>{s.title}</h3>
                                        <span className="text-[10px] uppercase font-mono bg-black/30 px-2 py-1 rounded text-slate-400 border border-white/5">
                                            {s.who}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400 leading-snug">{s.desc}</p>
                                    <div className="flex items-center space-x-2 pt-1">
                                        <div className={`w-2 h-2 rounded-full ${s.risk === 'Zero' ? 'bg-green-500' : s.risk.includes('Low') ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                                        <span className="text-xs text-slate-500">Risk: <span className="text-slate-300">{s.risk}</span></span>
                                    </div>

                                    {/* Selection Ring */}
                                    {strategy === s.id && (
                                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full border border-yellow-400 bg-yellow-400 flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-slate-400">
                        {needsApproval ? 'Approve USDC to enable session creation.' : 'Lock funds to start the session.'}
                    </p>

                    {needsApproval ? (
                        <div className="w-full flex flex-col items-center space-y-3">
                            <button
                                onClick={handleApprove}
                                disabled={loading}
                                className="w-full p-6 border-2 border-yellow-400 bg-yellow-400/10 rounded-xl hover:bg-yellow-400/20 transition flex flex-col items-center group cursor-pointer disabled:opacity-50"
                            >
                                <span className="text-2xl font-bold text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]">Approve USDC</span>
                                <span className="text-xs text-slate-400 mt-2 font-mono">Setup allowance for Yellow Escrow</span>
                            </button>
                            {approvalTx && (
                                <a
                                    href={`https://sepolia.basescan.org/tx/${approvalTx}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-yellow-500/60 hover:text-yellow-400 font-mono transition-colors"
                                >
                                    Approval TX: {approvalTx.substring(0, 10)}...{approvalTx.substring(54)}
                                </a>
                            )}
                        </div>
                    ) : (
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
                    )}

                    {loading && (
                        <div className="flex flex-col items-center space-y-2">
                            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                            <div className="text-yellow-400 text-xs animate-pulse">
                                {needsApproval ? "Confirming Approval On-chain..." : "Creating Session & Starting Agent..."}
                            </div>
                        </div>
                    )}
                    {error && <div className="text-red-400 text-sm mt-2 p-3 bg-red-400/10 border border-red-400/20 rounded-lg w-full text-center">{error}</div>}
                </div>
            )}
        </div>
    );
};

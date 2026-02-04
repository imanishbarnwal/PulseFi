
import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        if (address && escrowAddress) {
            checkAllowance(address, escrowAddress);
        }
    }, [address, escrowAddress]);

    const checkAllowance = async (userAddress: string, escrow: string) => {
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
            const allowance = await usdc.allowance(userAddress, escrow);
            const required = ethers.parseUnits('10', 6);
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

            console.log(`[Protocol] Requesting USDC Approval for Escrow: ${escrowAddress}`);
            const tx = await usdc.approve(escrowAddress, ethers.parseUnits('100', 6));
            setApprovalTx(tx.hash);
            await tx.wait();
            setNeedsApproval(false);
        } catch (err: any) {
            setError("Approval rejected or failed. Ensure Base Sepolia gas is present.");
        } finally {
            setLoading(false);
        }
    };

    const connectWallet = async () => {
        if (!(window as any).ethereum) {
            setError("Web3 provider missing. Install MetaMask to interact with Base Sepolia.");
            return;
        }
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const addr = await signer.getAddress();
            setAddress(addr);

            const escrow = await api.getEscrowAddress();
            setEscrowAddress(escrow);
            setError(null);
        } catch (err) {
            setError("Wallet connection aborted.");
        }
    };

    const handleVaultConfig = async (amount: number) => {
        if (!address) return;
        setLoading(true);
        setError(null);
        try {
            console.log(`[Protocol] Dispatching createSession(sessionId, amount) to ${escrowAddress}`);
            const data = await api.adminStartSession(address, amount);

            // Step 2: Initialize Agent Solver Off-Chain
            await api.startAgent(data.sessionId, strategy);

            onSessionStarted(data);
        } catch (err: any) {
            setError(err.response?.data?.error || "On-chain vault initialization failed. Verify balance.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center space-y-8 animate-fade-in w-full max-w-xl">
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-black text-white tracking-tight uppercase italic">Provision Session</h2>
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em]">Configuring Scoped v4 Hook Gating</p>
            </div>

            <div className="w-full fintech-card space-y-10 !p-10 !bg-white/[0.03]">
                {/* 1. Wallet Status (Technical) */}
                {!address ? (
                    <button
                        onClick={connectWallet}
                        className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-100 transition shadow-2xl active:scale-[0.98]"
                    >
                        Authorize Ledger Access
                    </button>
                ) : (
                    <div className="flex items-center justify-between px-5 py-4 bg-black/40 rounded-2xl border border-white/5 font-mono">
                        <div className="flex items-center space-x-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Signer</span>
                        </div>
                        <span className="text-[10px] text-white/80">{address}</span>
                    </div>
                )}

                {address && (
                    <>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 block ml-1">Execution Authorization Scoping</label>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { id: 'ACTIVE_REBALANCE', t: 'Atomic Swapping (v4 beforeSwap)', d: 'Authorized to trigger JIT liquidation via SessionGuardHook.' },
                                    { id: 'HIGH_FREQ_SCAN', t: 'Read-Only Heuristics', d: 'Agent discovery without on-chain execution capability.' }
                                ].map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => setStrategy(s.id)}
                                        className={`p-5 rounded-[24px] border cursor-pointer transition-all duration-300 ${strategy === s.id ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.05)]' : 'border-white/5 hover:border-white/10 opacity-60'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-xs font-black uppercase tracking-wide ${strategy === s.id ? 'text-white' : 'text-slate-400'}`}>{s.t}</span>
                                            {strategy === s.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{s.d}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. On-Chain Deposit Leg */}
                        <div className="pt-4 space-y-6">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 ml-1">Vault Authorization Leg</div>

                            {needsApproval ? (
                                <div className="space-y-4">
                                    <button
                                        onClick={handleApprove}
                                        disabled={loading}
                                        className="group relative w-full h-18 rounded-[24px] bg-blue-600 hover:bg-blue-500 transition-all flex flex-col items-center justify-center font-black uppercase tracking-[0.2em] disabled:opacity-50 overflow-hidden"
                                    >
                                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                                            <>
                                                <span className="text-sm">Approve Session Funding</span>
                                                <span className="text-[9px] opacity-60 font-mono mt-1">Escrow: {escrowAddress?.slice(0, 10)}...</span>
                                            </>
                                        )}
                                    </button>
                                    {approvalTx && (
                                        <div className="text-center font-mono p-3 bg-white/5 rounded-xl border border-white/5">
                                            <div className="text-[8px] text-slate-600 uppercase mb-1">Approval Broadast Successful</div>
                                            <a href={`https://sepolia.basescan.org/tx/${approvalTx}`} target="_blank" className="text-[9px] text-blue-400/80 hover:text-blue-400 truncate block">{approvalTx}</a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {[10, 25].map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => handleVaultConfig(amt)}
                                            disabled={loading}
                                            className="h-24 rounded-[32px] border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/[0.02] transition-all flex flex-col items-center justify-center space-y-1 group disabled:opacity-50"
                                        >
                                            <span className="text-2xl font-black text-white">{amt} USDC</span>
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-blue-400 transition">Broadcast Lock</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {error && <div className="w-full bg-red-500/10 border border-red-500/20 p-5 rounded-3xl text-red-500 text-[11px] font-mono text-center animate-fade-in">{error}</div>}

            <div className="flex items-center space-x-6 opacity-40 grayscale">
                <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Atomic Security</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-800" />
                <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Zero Leakage Vault</span>
                </div>
            </div>
        </div>
    );
};

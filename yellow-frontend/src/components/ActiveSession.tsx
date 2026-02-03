
import React, { useEffect, useState } from 'react';
import { api, type AgentStatus } from '../api';

interface Props {
    sessionId: string;
    onEndSession: (finalData: any) => void;
}

export const ActiveSession: React.FC<Props> = ({ sessionId, onEndSession }) => {
    const [timeLeft, setTimeLeft] = useState(600); // 10 mins
    const [status, setStatus] = useState<AgentStatus | null>(null);

    // Timer
    useEffect(() => {
        const timer = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
        return () => clearInterval(timer);
    }, []);

    // Poll Agent Status
    useEffect(() => {
        const poll = setInterval(async () => {
            try {
                const s = await api.getAgentStatus(sessionId);
                setStatus(s);
            } catch (e) {
                console.error(e);
            }
        }, 2000);
        return () => clearInterval(poll);
    }, [sessionId]);

    const handleEnd = async () => {
        try {
            const data = await api.adminEndSession(sessionId);
            onEndSession(data);
        } catch (e) {
            alert("Failed to end session");
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    return (
        <div className="w-full max-w-3xl flex flex-col space-y-6">
            <div className="flex justify-between items-center p-4 bg-slate-800 rounded-lg border border-slate-700">
                <div>
                    <div className="text-sm text-slate-400">Session ID</div>
                    <div className="font-mono text-white">{sessionId.slice(0, 8)}...</div>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-400">Time Remaining</div>
                    <div className="text-2xl font-bold text-yellow-400">{formatTime(timeLeft)}</div>
                </div>
            </div>

            {/* Session Stats Banner */}
            <div className="flex justify-between items-center px-4 py-3 bg-blue-900/30 border border-blue-500/30 rounded-lg text-sm">
                <span className="text-blue-200">
                    <span className="font-bold text-white text-lg mr-1">{status?.tradeCount || 0}</span>
                    off-chain actions
                </span>
                <span className="text-slate-500">→</span>
                <span className="text-green-300">
                    <span className="font-bold text-white text-lg mr-1">1</span>
                    on-chain settlement
                </span>
            </div>

            <div className="bg-black/50 p-6 rounded-lg border border-slate-800 h-64 overflow-y-auto font-mono text-sm">
                <h3 className="text-slate-400 mb-2 border-b border-slate-700 pb-2">Instant Off-chain Agent Actions</h3>
                <div className="space-y-2">
                    {status?.logs.length === 0 ? (
                        <div className="text-slate-600 italic">Waiting for agent activity...</div>
                    ) : (
                        status?.logs.slice().reverse().map((log, i) => {
                            // Attempt to parse structured log: "[Action] Type executed..."
                            // Current backend format: "[Agent] [Action] Name... " or simple strings
                            // We'll clean it up for display:

                            // 1. Timestamp (Local)
                            const time = new Date().toLocaleTimeString();

                            // 2. Identify Type
                            let type = "INFO";
                            let msg = log;

                            if (log.includes("[Action]")) {
                                type = "ACTION";
                                msg = log.replace("[Action]", "").trim();
                            } else if (log.includes("Agent started")) {
                                type = "SYSTEM";
                            }

                            // Remove [Agent] prefix if exists
                            msg = msg.replace("[Agent]", "").trim();

                            return (
                                <div key={i} className="flex items-start space-x-3 text-xs border-b border-slate-800 pb-1">
                                    <span className="text-slate-500 font-mono shrink-0">{time}</span>
                                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] shrink-0 ${type === 'ACTION' ? 'bg-blue-900 text-blue-300' :
                                        type === 'SYSTEM' ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-300'
                                        }`}>
                                        {type}
                                    </span>
                                    <span className="text-slate-300 break-words">{msg}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <button
                onClick={handleEnd}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow transition"
            >
                Trigger Single On-Chain Settlement
            </button>
        </div>
    );
};


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

            <div className="bg-black/50 p-6 rounded-lg border border-slate-800 h-64 overflow-y-auto font-mono text-sm">
                <h3 className="text-slate-400 mb-2 border-b border-slate-700 pb-2">Agent Logs</h3>
                {status?.logs.length === 0 ? (
                    <div className="text-slate-600 italic">Waiting for agent activity...</div>
                ) : (
                    status?.logs.slice().reverse().map((log, i) => (
                        <div key={i} className="mb-1 text-green-400">&gt; {log}</div>
                    ))
                )}
            </div>

            <button
                onClick={handleEnd}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow transition"
            >
                End Session & Settle
            </button>
        </div>
    );
};

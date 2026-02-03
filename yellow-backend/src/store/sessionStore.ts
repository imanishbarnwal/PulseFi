import { SessionState, AgentDecision } from '../types';

// In-memory store
const sessions: Map<string, SessionState> = new Map();

export const SessionStore = {
    create: (session: SessionState) => {
        if (!session.decisions) session.decisions = [];
        sessions.set(session.sessionId, session);
        console.log(`[Storage] Session ${session.sessionId} created.`);
    },

    get: (sessionId: string): SessionState | undefined => {
        return sessions.get(sessionId);
    },

    update: (sessionId: string, updates: Partial<SessionState>) => {
        const session = sessions.get(sessionId);
        if (session) {
            const updatedSession = { ...session, ...updates };
            sessions.set(sessionId, updatedSession);
            // console.log(`[Storage] Session ${sessionId} updated.`);
            return updatedSession;
        }
    },

    addDecision: (sessionId: string, decision: AgentDecision) => {
        const session = sessions.get(sessionId);
        if (session) {
            if (!session.decisions) session.decisions = [];
            session.decisions.push(decision);
            sessions.set(sessionId, session);
            // console.log(`[Storage] Decision added to ${sessionId}`);
        }
    },

    getAll: () => Array.from(sessions.values())
};

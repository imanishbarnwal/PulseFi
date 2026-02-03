import { useState } from 'react';
import { api } from './api';
import { Landing } from './components/Landing';
import { Deposit } from './components/Deposit';
import { ActiveSession } from './components/ActiveSession';
import { Settled } from './components/Settled';
import './index.css'; // Ensure tailwind loads

type Screen = 'landing' | 'deposit' | 'active' | 'settled';

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [sessionData, setSessionData] = useState<any>(null);
  const [settleData, setSettleData] = useState<any>(null);

  const handleDemo = async () => {
    try {
      // Valid Mock Address for Demo
      const demoAddress = "0x1111111111111111111111111111111111111111";
      const data = await api.adminStartSession(demoAddress, 25);

      // Auto-start Agent in Rebalance Mode
      await api.startAgent(data.sessionId, 'ACTIVE_REBALANCE');

      setSessionData(data);
      setScreen('active');

      // Auto-settle after 15s (giving time for a few logs)
      setTimeout(async () => {
        try {
          const final = await api.adminEndSession(data.sessionId);
          setSettleData(final);
          setScreen('settled');
        } catch (e) {
          console.error("Demo auto-settle failed", e);
        }
      }, 15000);

    } catch (e) {
      console.error(e);
      alert("Demo start failed. Ensure backend is running.");
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black opacity-40"></div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {screen === 'landing' && (
          <Landing
            onStart={() => setScreen('deposit')}
            onDemo={handleDemo}
          />
        )}

        {screen === 'deposit' && (
          <Deposit onSessionStarted={(data) => {
            setSessionData(data);
            setScreen('active');
          }} />
        )}

        {screen === 'active' && sessionData && (
          <ActiveSession
            sessionId={sessionData.sessionId}
            creationTxHash={sessionData.txHash}
            onEndSession={(data) => {
              setSettleData(data);
              setScreen('settled');
            }}
          />
        )}

        {screen === 'settled' && settleData && (
          <Settled
            data={settleData}
            onReset={() => {
              setSessionData(null);
              setSettleData(null);
              setScreen('landing');
            }}
          />
        )}
      </div>

      {/* Persistence Hook / Footer Context */}
      <div className="fixed bottom-10 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div className="flex items-center space-x-6 px-6 py-3 bg-white/5 backdrop-blur-md rounded-full border border-white/5 opacity-40">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Base Sepolia</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Verifiable Escrow V1.0</span>
        </div>
      </div>

    </div>
  );
}

export default App;

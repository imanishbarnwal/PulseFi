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
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 font-sans">

      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none z-0"></div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
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

    </div>
  );
}

export default App;

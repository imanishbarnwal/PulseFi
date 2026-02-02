
import { useState } from 'react';
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

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-4">

      {screen === 'landing' && (
        <Landing onStart={() => setScreen('deposit')} />
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
  );
}

export default App;

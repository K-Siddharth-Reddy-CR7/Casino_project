import React, { useState, useEffect, useRef } from 'react';
import { SLOT_SYMBOLS, MIN_BET, MAX_BET } from '../../constants';
import { SlotSymbol } from '../../types';
import confetti from 'canvas-confetti';
import { playSound } from '../../utils/audio';
import { Settings2, StopCircle, PlayCircle, Zap, RotateCcw } from 'lucide-react';

interface SlotMachineProps {
  onGameEnd: (amount: number) => void;
  balance: number;
}

interface AutoBetConfig {
  rounds: number;
  stopProfit: number;
  stopLoss: number;
}

export const SlotMachine: React.FC<SlotMachineProps> = ({ onGameEnd, balance }) => {
  const [reels, setReels] = useState<SlotSymbol[]>([SLOT_SYMBOLS[0], SLOT_SYMBOLS[0], SLOT_SYMBOLS[0]]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [bet, setBet] = useState(10);
  const [message, setMessage] = useState('PULL TO WIN');

  // Auto Bet States
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [showAutoSettings, setShowAutoSettings] = useState(false);
  const [autoConfig, setAutoConfig] = useState<AutoBetConfig>({ rounds: 10, stopProfit: 0, stopLoss: 0 });
  const [autoStats, setAutoStats] = useState({ roundsPlayed: 0, initialBalance: 0, netProfit: 0 });

  // Ref to hold current state for the auto loop
  const autoStateRef = useRef({ isAutoBetting, autoConfig, autoStats, balance });

  useEffect(() => {
    autoStateRef.current = { isAutoBetting, autoConfig, autoStats, balance };
  }, [isAutoBetting, autoConfig, autoStats, balance]);

  const spinReel = () => {
    return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  };

  const handleBetChange = (amount: number) => {
      if (isAutoBetting) return;
      const newBet = Math.min(MAX_BET, Math.max(MIN_BET, bet + amount));
      setBet(newBet);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAutoBetting) return;
    const val = parseInt(e.target.value);
    if (isNaN(val)) {
        setBet(0);
    } else {
        setBet(val);
    }
  };

  const handleInputBlur = () => {
    let newBet = bet;
    if (newBet < MIN_BET) newBet = MIN_BET;
    if (newBet > MAX_BET) newBet = MAX_BET;
    setBet(newBet);
  };

  // --- Auto Bet Logic ---

  const toggleAutoBet = () => {
    if (isAutoBetting) {
        stopAutoBet();
    } else {
        setShowAutoSettings(!showAutoSettings);
    }
  };

  const startAutoBet = () => {
      setShowAutoSettings(false);
      setIsAutoBetting(true);
      setAutoStats({ roundsPlayed: 0, initialBalance: balance, netProfit: 0 });
      handleSpin(true);
  };

  const stopAutoBet = () => {
      setIsAutoBetting(false);
      setMessage("AUTO STOPPED");
  };

  const handleSpin = (isAutoTrigger = false) => {
    if (!isAutoTrigger && isAutoBetting) return; // Prevent manual spin during auto

    if (bet < MIN_BET || bet > MAX_BET) {
        setMessage(`BET MIN: $${MIN_BET}`);
        handleInputBlur();
        if (isAutoTrigger) stopAutoBet();
        return;
    }
    if (balance < bet) {
      setMessage("INSUFFICIENT FUNDS");
      if (isAutoTrigger) stopAutoBet();
      return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setMessage("SPINNING...");
    onGameEnd(-bet); // Deduct bet immediately

    // Simulate spinning delay
    let spins = 0;
    const intervalId = setInterval(() => {
      setReels([spinReel(), spinReel(), spinReel()]);
      spins++;
      // Reel sound on every tick for speed effect
      playSound('slot-reel'); 
      
      if (spins > 20) {
        clearInterval(intervalId);
        finishSpin();
      }
    }, 80); // Faster spin (80ms)
  };

  const finishSpin = () => {
    const finalReels = [spinReel(), spinReel(), spinReel()];
    setReels(finalReels);
    setIsSpinning(false);

    // Calculate winnings
    const [r1, r2, r3] = finalReels;
    let winnings = 0;
    
    if (r1.id === r2.id && r2.id === r3.id) {
      // 3 Match
      winnings = bet * r1.value * 2;
      setMessage(`JACKPOT! +$${winnings}`);
      playSound('jackpot');
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
    } else if (r1.id === r2.id || r2.id === r3.id || r1.id === r3.id) {
       // 2 Match
       const match = r1.id === r2.id ? r1 : r3; // simplified
       winnings = bet * 2;
       setMessage(`NICE MATCH! +$${winnings}`);
       playSound('win');
       confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } else {
      setMessage("TRY AGAIN");
      playSound('loss');
    }

    if (winnings > 0) {
      onGameEnd(winnings + bet); // Return winnings (bet already deducted)
    }

    // --- Auto Bet Loop Continuation ---
    const { isAutoBetting: currentAuto, autoConfig: config, autoStats: stats, balance: currentBalance } = autoStateRef.current;
    
    if (currentAuto) {
        setTimeout(() => {
             // Re-check state after delay (user might have stopped)
             if (!autoStateRef.current.isAutoBetting) return;

             const sessionProfit = (currentBalance + winnings) - stats.initialBalance;
             const nextRound = stats.roundsPlayed + 1;

             setAutoStats(prev => ({
                 ...prev,
                 roundsPlayed: nextRound,
                 netProfit: sessionProfit
             }));

             // Constraints
             if (nextRound >= config.rounds) {
                 stopAutoBet();
                 return;
             }
             if (config.stopProfit > 0 && sessionProfit >= config.stopProfit) {
                 stopAutoBet();
                 return;
             }
             if (config.stopLoss > 0 && -sessionProfit >= config.stopLoss) {
                 stopAutoBet();
                 return;
             }

             // Next Spin
             handleSpin(true);
        }, 1500); // 1.5s delay before next spin
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 dark:bg-gradient-to-b dark:from-navy-900 dark:to-black rounded-[2rem] border-4 border-lavender-500/50 shadow-[0_0_50px_rgba(167,139,250,0.3)] max-w-2xl mx-auto w-full relative overflow-hidden transition-colors duration-300">
      
      {/* Auto Bet Overlay */}
      {isAutoBetting && (
          <div className="absolute top-16 left-4 right-4 bg-amber-500/10 border border-amber-500 rounded-xl p-2 flex justify-between items-center animate-pulse z-30">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                  <Zap size={12} className="fill-current" /> AUTO ON
              </div>
              <div className="text-[10px] font-mono text-gray-300">
                  {autoStats.roundsPlayed}/{autoConfig.rounds} | <span className={autoStats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {autoStats.netProfit >= 0 ? '+' : ''}${autoStats.netProfit}
                  </span>
              </div>
              <button onClick={stopAutoBet} className="bg-red-600 text-white p-1 rounded-full hover:bg-red-500">
                  <StopCircle size={12} />
              </button>
          </div>
      )}

      {/* Decorative Lights */}
      <div className="absolute top-3 w-full flex justify-between px-6">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]"></div>
        <div className="w-3 h-3 rounded-full bg-lavender-400 animate-pulse delay-75 shadow-[0_0_8px_#a78bfa]"></div>
        <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse delay-150 shadow-[0_0_8px_blue]"></div>
        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse delay-300 shadow-[0_0_8px_green]"></div>
      </div>

      <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lavender-300 via-lavender-500 to-indigo-400 mb-6 tracking-tighter drop-shadow-xl mt-2">
        MEGA SLOTS
      </div>

      {/* Reels Container */}
      <div className="flex gap-3 p-4 bg-black rounded-2xl border-4 border-gray-800 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] mb-6">
        {reels.map((symbol, i) => (
          <div key={i} className="w-20 h-32 bg-white rounded-lg flex items-center justify-center text-5xl shadow-[inset_0_0_20px_rgba(0,0,0,0.4)] border border-gray-300 overflow-hidden relative">
             <div className={`transition-all duration-100 ${isSpinning ? 'blur-sm scale-110' : ''}`}>
               {symbol.icon}
             </div>
             {/* Shine effect */}
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent opacity-60 pointer-events-none"></div>
          </div>
        ))}
      </div>

      {/* Status Bar */}
      <div className="w-full max-w-md bg-navy-800 border border-navy-700 p-3 rounded-lg mb-6 text-center shadow-md">
         <p className="text-lavender-400 font-mono font-bold text-xl animate-pulse tracking-widest">{message}</p>
      </div>

      {/* Controls - Compact */}
      <div className="flex flex-col md:flex-row items-center gap-6 w-full justify-center relative">
          
          {/* Auto Bet Config Modal */}
          {showAutoSettings && !isAutoBetting && (
              <div className="absolute bottom-full mb-4 bg-navy-900 border border-amber-500 rounded-xl p-4 shadow-2xl w-64 z-40 animate-in zoom-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-white flex items-center gap-2 text-sm"><Settings2 size={14}/> Auto Spin Config</h4>
                      <button onClick={() => setShowAutoSettings(false)} className="text-gray-400 hover:text-white"><StopCircle size={16}/></button>
                  </div>
                  <div className="space-y-2">
                      <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Spins</label>
                          <input type="number" value={autoConfig.rounds} onChange={(e) => setAutoConfig({...autoConfig, rounds: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white" />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-green-400 uppercase">Stop Profit</label>
                          <input type="number" value={autoConfig.stopProfit} onChange={(e) => setAutoConfig({...autoConfig, stopProfit: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white" />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-red-400 uppercase">Stop Loss</label>
                          <input type="number" value={autoConfig.stopLoss} onChange={(e) => setAutoConfig({...autoConfig, stopLoss: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white" />
                      </div>
                      <button onClick={startAutoBet} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded mt-2 text-xs flex items-center justify-center gap-2">
                          <PlayCircle size={12} /> START AUTO
                      </button>
                  </div>
              </div>
          )}

          <div className="flex flex-col items-center bg-gray-900/50 p-3 rounded-xl border border-white/10 max-w-xs w-full">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Bet Amount</span>
              <div className="flex bg-gray-800 rounded-full p-1.5 gap-2 shadow-inner items-center w-full justify-between">
                 <button onClick={() => handleBetChange(-10)} disabled={isAutoBetting} className="w-8 h-8 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-50">-</button>
                 <div className="relative w-20 flex justify-center">
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">$</span>
                    <input 
                       type="number"
                       value={bet === 0 ? '' : bet}
                       onChange={handleInputChange}
                       onBlur={handleInputBlur}
                       disabled={isAutoBetting}
                       className="w-full bg-transparent text-center font-mono text-lg text-white font-bold text-shadow focus:outline-none pl-3"
                    />
                 </div>
                 <button onClick={() => handleBetChange(10)} disabled={isAutoBetting} className="w-8 h-8 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-50">+</button>
              </div>
              
              {/* Quick Bet Buttons */}
              <div className="flex gap-1.5 mt-3 flex-wrap justify-center">
                  {[5, 10, 25, 50, 100].map((amt) => (
                      <button
                          key={amt}
                          onClick={() => handleBetChange(amt)}
                          disabled={bet + amt > MAX_BET || isAutoBetting}
                          className="px-2 py-1 bg-gray-700 hover:bg-lavender-500 text-gray-300 hover:text-white rounded text-xs font-bold border border-gray-600 transition-colors disabled:opacity-50 min-w-[45px]"
                      >
                          +${amt}
                      </button>
                  ))}
              </div>

              <span className="text-[10px] text-gray-500 mt-2 font-mono">Min ${MIN_BET} - Max ${MAX_BET}</span>
          </div>
          
          <div className="flex gap-3">
            <button 
                onClick={() => handleSpin(false)}
                disabled={isSpinning || isAutoBetting}
                className={`
                    relative w-24 h-24 rounded-full border-4 border-red-800 shadow-[0_5px_15px_rgba(0,0,0,0.5)]
                    flex items-center justify-center font-black text-white text-lg tracking-widest
                    transition-all duration-150 active:scale-95 active:shadow-inner active:border-red-900
                    ${isSpinning || isAutoBetting ? 'bg-red-900 cursor-not-allowed opacity-80' : 'bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 cursor-pointer hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]'}
                `}
            >
                <div className="absolute inset-0 rounded-full border-2 border-white/20"></div>
                SPIN
            </button>
            
            <button 
                onClick={toggleAutoBet}
                className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 transition-all shadow-lg font-bold text-xs leading-tight ${
                    isAutoBetting 
                    ? 'bg-red-500 border-red-400 text-white animate-pulse' 
                    : 'bg-amber-500 border-amber-400 text-white hover:bg-amber-400'
                }`}
                title="Auto Spin"
            >
                {isAutoBetting ? <StopCircle size={28} className="mb-1" /> : <RotateCcw size={28} className="mb-1" />}
                {isAutoBetting ? 'STOP' : 'AUTO'}
            </button>
          </div>
      </div>

      <div className="mt-6 text-center text-xs font-bold text-gray-500 tracking-wider">
        MULTIPLIERS: 🍒 2x | 7️⃣ 20x | 🎰 50x
      </div>
    </div>
  );
};
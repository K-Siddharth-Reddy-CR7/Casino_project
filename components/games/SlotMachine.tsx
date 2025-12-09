import React, { useState, useEffect, useRef } from 'react';
import { SLOT_SYMBOLS, MIN_BET, MAX_BET } from '../../constants';
import { SlotSymbol } from '../../types';
import confetti from 'canvas-confetti';
import { playSound } from '../../utils/audio';

interface SlotMachineProps {
  onGameEnd: (amount: number) => void;
  balance: number;
}

export const SlotMachine: React.FC<SlotMachineProps> = ({ onGameEnd, balance }) => {
  const [reels, setReels] = useState<SlotSymbol[]>([SLOT_SYMBOLS[0], SLOT_SYMBOLS[0], SLOT_SYMBOLS[0]]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [bet, setBet] = useState(10);
  const [message, setMessage] = useState('PULL TO WIN');

  const spinReel = () => {
    return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  };

  const handleBetChange = (amount: number) => {
      const newBet = Math.min(MAX_BET, Math.max(MIN_BET, bet + amount));
      setBet(newBet);
  };

  const handleSpin = () => {
    if (balance < bet) {
      setMessage("INSUFFICIENT FUNDS");
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
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 bg-slate-900 dark:bg-gradient-to-b dark:from-navy-900 dark:to-black rounded-[3rem] border-8 border-lavender-500/50 shadow-[0_0_80px_rgba(167,139,250,0.3)] max-w-4xl mx-auto w-full relative overflow-hidden transition-colors duration-300">
      
      {/* Decorative Lights */}
      <div className="absolute top-3 w-full flex justify-between px-8">
        <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_red]"></div>
        <div className="w-4 h-4 rounded-full bg-lavender-400 animate-pulse delay-75 shadow-[0_0_10px_#a78bfa]"></div>
        <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse delay-150 shadow-[0_0_10px_blue]"></div>
        <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse delay-300 shadow-[0_0_10px_green]"></div>
      </div>

      <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lavender-300 via-lavender-500 to-indigo-400 mb-10 tracking-tighter drop-shadow-2xl">
        MEGA SLOTS
      </div>

      {/* Reels Container */}
      <div className="flex gap-6 p-8 bg-black rounded-3xl border-8 border-gray-800 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] mb-10">
        {reels.map((symbol, i) => (
          <div key={i} className="w-32 h-48 bg-white rounded-xl flex items-center justify-center text-7xl shadow-[inset_0_0_30px_rgba(0,0,0,0.4)] border-2 border-gray-300 overflow-hidden relative">
             <div className={`transition-all duration-100 ${isSpinning ? 'blur-md scale-110' : ''}`}>
               {symbol.icon}
             </div>
             {/* Shine effect */}
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent opacity-60 pointer-events-none"></div>
          </div>
        ))}
      </div>

      {/* Status Bar */}
      <div className="w-full max-w-2xl bg-navy-800 border-2 border-navy-700 p-4 rounded-xl mb-10 text-center shadow-lg">
         <p className="text-lavender-400 font-mono font-bold text-3xl animate-pulse tracking-widest">{message}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center gap-10 w-full justify-center">
          <div className="flex flex-col items-center bg-gray-900/50 p-6 rounded-2xl border border-white/10">
              <span className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-2">Bet Amount</span>
              <div className="flex bg-gray-800 rounded-full p-2 gap-2 shadow-inner">
                 <button onClick={() => handleBetChange(-10)} className="w-12 h-12 rounded-full bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 text-xl font-bold transition-colors" disabled={bet <= MIN_BET}>-</button>
                 <span className="w-24 flex items-center justify-center font-mono text-2xl text-white font-bold text-shadow">${bet}</span>
                 <button onClick={() => handleBetChange(10)} className="w-12 h-12 rounded-full bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 text-xl font-bold transition-colors" disabled={bet >= MAX_BET}>+</button>
              </div>
              <span className="text-xs text-gray-500 mt-2 font-mono">Min ${MIN_BET} - Max ${MAX_BET}</span>
          </div>
          
          <button 
            onClick={handleSpin}
            disabled={isSpinning}
            className={`
                relative w-32 h-32 rounded-full border-8 border-red-800 shadow-[0_10px_20px_rgba(0,0,0,0.5)]
                flex items-center justify-center font-black text-white text-2xl tracking-widest
                transition-all duration-150 active:scale-95 active:shadow-inner active:border-red-900
                ${isSpinning ? 'bg-red-900 cursor-not-allowed opacity-80' : 'bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 cursor-pointer hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]'}
            `}
          >
             <div className="absolute inset-0 rounded-full border-2 border-white/20"></div>
             SPIN
          </button>
      </div>

      <div className="mt-8 text-center text-sm font-bold text-gray-500 tracking-wider">
        MULTIPLIERS: 🍒 2x | 7️⃣ 20x | 🎰 50x
      </div>
    </div>
  );
};
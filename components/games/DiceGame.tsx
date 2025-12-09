import React, { useState } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, RotateCw } from 'lucide-react';
import { sendMessageToPitBoss } from '../../services/geminiService';
import confetti from 'canvas-confetti';
import { playSound } from '../../utils/audio';
import { MIN_BET, MAX_BET } from '../../constants';

interface DiceGameProps {
  onGameEnd: (amount: number) => void;
  balance: number;
}

type BetType = 'under' | 'seven' | 'over';

export const DiceGame: React.FC<DiceGameProps> = ({ onGameEnd, balance }) => {
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(6);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedBet, setSelectedBet] = useState<BetType | null>(null);
  const [betAmount, setBetAmount] = useState(50);
  const [message, setMessage] = useState('Place your bet!');
  const [lastWin, setLastWin] = useState<number | null>(null);

  const rollDice = () => Math.floor(Math.random() * 6) + 1;

  const handleBetChange = (amount: number) => {
    const newBet = Math.min(MAX_BET, Math.max(MIN_BET, betAmount + amount));
    setBetAmount(newBet);
  };

  const handleRoll = async () => {
    if (!selectedBet) {
      setMessage("Please select a prediction!");
      return;
    }
    if (balance < betAmount) {
      setMessage("Insufficient funds!");
      return;
    }
    if (isRolling) return;

    setIsRolling(true);
    setLastWin(null);
    setMessage("Rolling...");
    onGameEnd(-betAmount); // Deduct bet immediately

    let ticks = 0;
    const interval = setInterval(() => {
      setDice1(rollDice());
      setDice2(rollDice());
      ticks++;
      if (ticks % 2 === 0) playSound('dice-shake');

      if (ticks > 10) {
        clearInterval(interval);
        finalizeGame();
      }
    }, 100);
  };

  const finalizeGame = () => {
    const d1 = rollDice();
    const d2 = rollDice();
    setDice1(d1);
    setDice2(d2);
    setIsRolling(false);

    const sum = d1 + d2;
    let won = false;
    let multiplier = 0;

    if (sum < 7 && selectedBet === 'under') {
      won = true;
      multiplier = 2; // 1x payout + bet back
    } else if (sum > 7 && selectedBet === 'over') {
      won = true;
      multiplier = 2; // 1x payout + bet back
    } else if (sum === 7 && selectedBet === 'seven') {
      won = true;
      multiplier = 5; // 4x payout + bet back
    }

    if (won) {
      const winnings = betAmount * multiplier;
      onGameEnd(winnings);
      setLastWin(winnings - betAmount);
      setMessage(`YOU WIN $${winnings - betAmount}!`);
      playSound('win');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      if (multiplier === 5) {
          sendMessageToPitBoss(`Player just hit a Hard 7 payout in Dice! Amount: $${winnings - betAmount}`);
      }
    } else {
      setMessage("House Wins.");
      playSound('loss');
    }
  };

  const renderDie = (value: number) => {
      const DieIcon = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6][value - 1];
      return <DieIcon size={80} className={`text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] ${isRolling ? 'animate-spin' : ''}`} strokeWidth={1.5} />;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto space-y-8 p-8 bg-white dark:bg-navy-800/50 rounded-3xl border border-slate-200 dark:border-white/5 backdrop-blur-sm relative overflow-hidden shadow-xl transition-colors duration-300">
        
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-lavender-500/10 rounded-full blur-[100px]"></div>

        {/* Header */}
        <div className="text-center z-10">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-widest uppercase">Neon Dice</h2>
            <p className="text-slate-500 dark:text-lavender-300 font-mono text-sm">Predict the sum of two dice</p>
        </div>

        {/* Dice Display */}
        <div className="flex gap-12 p-8 bg-slate-900 dark:bg-black/40 rounded-2xl border border-white/10 z-10">
            <div className="bg-gradient-to-br from-indigo-500 to-navy-700 p-4 rounded-xl shadow-lg transform transition-transform hover:scale-105">
                {renderDie(dice1)}
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-navy-700 p-4 rounded-xl shadow-lg transform transition-transform hover:scale-105">
                {renderDie(dice2)}
            </div>
        </div>

        {/* Total Display */}
        <div className="font-mono text-xl text-slate-500 dark:text-white/50 z-10">
            TOTAL: <span className="text-4xl text-slate-900 dark:text-white font-bold ml-2">{dice1 + dice2}</span>
        </div>

        {/* Status Message */}
        <div className="h-8 z-10">
            {message && <div className={`text-xl font-bold uppercase tracking-wider animate-pulse ${message.includes('WIN') ? 'text-green-600 dark:text-green-400' : 'text-lavender-600 dark:text-lavender-400'}`}>{message}</div>}
        </div>

        {/* Betting Board */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-2xl z-10">
            <button 
                onClick={() => { setSelectedBet('under'); }}
                className={`group relative overflow-hidden p-6 rounded-xl border transition-all duration-300 ${
                    selectedBet === 'under' 
                    ? 'bg-blue-100 dark:bg-blue-600/20 border-blue-500 shadow-md' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
            >
                <div className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold mb-1 group-hover:text-slate-900 dark:group-hover:text-white">Under 7</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:scale-110 transition-transform">2 - 6</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-mono">Pays 1x</div>
            </button>

            <button 
                onClick={() => { setSelectedBet('seven'); }}
                className={`group relative overflow-hidden p-6 rounded-xl border transition-all duration-300 ${
                    selectedBet === 'seven' 
                    ? 'bg-lavender-100 dark:bg-lavender-500/20 border-lavender-500 shadow-md' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
            >
                <div className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold mb-1 group-hover:text-slate-900 dark:group-hover:text-white">Exact</div>
                <div className="text-2xl font-black text-lavender-600 dark:text-lavender-400 group-hover:scale-110 transition-transform">7</div>
                <div className="text-xs text-lavender-600 dark:text-lavender-300 mt-2 font-mono">Pays 4x</div>
            </button>

            <button 
                onClick={() => { setSelectedBet('over'); }}
                className={`group relative overflow-hidden p-6 rounded-xl border transition-all duration-300 ${
                    selectedBet === 'over' 
                    ? 'bg-indigo-100 dark:bg-indigo-600/20 border-indigo-500 shadow-md' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
            >
                <div className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold mb-1 group-hover:text-slate-900 dark:group-hover:text-white">Over 7</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:scale-110 transition-transform">8 - 12</div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-mono">Pays 1x</div>
            </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 z-10">
             <div className="flex flex-col items-center">
                 <div className="flex items-center bg-slate-200 dark:bg-black/40 rounded-lg p-1 border border-slate-300 dark:border-white/10">
                    <button onClick={() => handleBetChange(-10)} className="w-10 h-10 flex items-center justify-center text-slate-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded disabled:opacity-50" disabled={betAmount <= MIN_BET}>-</button>
                    <span className="w-20 text-center font-mono text-lavender-600 dark:text-lavender-400 font-bold">${betAmount}</span>
                    <button onClick={() => handleBetChange(10)} className="w-10 h-10 flex items-center justify-center text-slate-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded disabled:opacity-50" disabled={betAmount >= MAX_BET}>+</button>
                 </div>
                 <span className="text-[10px] text-gray-500 mt-1">Min ${MIN_BET} - Max ${MAX_BET}</span>
             </div>

             <button 
                onClick={handleRoll}
                disabled={isRolling || !selectedBet}
                className={`
                    flex items-center gap-2 px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all
                    ${!selectedBet ? 'bg-slate-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 
                      isRolling ? 'bg-slate-400 dark:bg-gray-600 text-gray-300 dark:text-gray-400 cursor-wait' :
                      'bg-lavender-500 hover:bg-lavender-600 hover:scale-105 text-white shadow-lavender-500/30'}
                `}
             >
                <RotateCw className={isRolling ? 'animate-spin' : ''} />
                {isRolling ? 'ROLLING...' : 'ROLL DICE'}
             </button>
        </div>

    </div>
  );
};
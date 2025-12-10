import React, { useState, useEffect, useRef } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, RotateCw, Settings2, PlayCircle, StopCircle, Zap, RotateCcw } from 'lucide-react';
import { sendMessageToPitBoss } from '../../services/geminiService';
import confetti from 'canvas-confetti';
import { playSound } from '../../utils/audio';
import { MIN_BET, MAX_BET } from '../../constants';

interface DiceGameProps {
  onGameEnd: (amount: number) => void;
  balance: number;
}

type BetType = 'under' | 'seven' | 'over';

interface AutoBetConfig {
  rounds: number;
  stopProfit: number;
  stopLoss: number;
}

export const DiceGame: React.FC<DiceGameProps> = ({ onGameEnd, balance }) => {
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(6);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedBet, setSelectedBet] = useState<BetType | null>(null);
  const [betAmount, setBetAmount] = useState(50);
  const [message, setMessage] = useState('Place your bet!');
  const [lastWin, setLastWin] = useState<number | null>(null);

  // Auto Bet States
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [showAutoSettings, setShowAutoSettings] = useState(false);
  const [autoConfig, setAutoConfig] = useState<AutoBetConfig>({ rounds: 10, stopProfit: 0, stopLoss: 0 });
  const [autoStats, setAutoStats] = useState({ roundsPlayed: 0, initialBalance: 0, netProfit: 0 });

  const autoStateRef = useRef({ isAutoBetting, autoConfig, autoStats, balance, selectedBet });

  useEffect(() => {
    autoStateRef.current = { isAutoBetting, autoConfig, autoStats, balance, selectedBet };
  }, [isAutoBetting, autoConfig, autoStats, balance, selectedBet]);

  const rollDice = () => Math.floor(Math.random() * 6) + 1;

  const handleBetChange = (amount: number) => {
    if (isAutoBetting) return;
    const newBet = Math.min(MAX_BET, Math.max(MIN_BET, betAmount + amount));
    setBetAmount(newBet);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAutoBetting) return;
    const val = parseInt(e.target.value);
    if (isNaN(val)) {
        setBetAmount(0);
    } else {
        setBetAmount(val);
    }
  };

  const handleInputBlur = () => {
    let newBet = betAmount;
    if (newBet < MIN_BET) newBet = MIN_BET;
    if (newBet > MAX_BET) newBet = MAX_BET;
    setBetAmount(newBet);
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
      if (!selectedBet) {
          setMessage("Select Over/Under/7 first!");
          return;
      }
      setShowAutoSettings(false);
      setIsAutoBetting(true);
      setAutoStats({ roundsPlayed: 0, initialBalance: balance, netProfit: 0 });
      handleRoll(true);
  };

  const stopAutoBet = () => {
      setIsAutoBetting(false);
      setMessage("Auto Roll Stopped");
  };

  const handleRoll = async (isAutoTrigger = false) => {
    if (!isAutoTrigger && isAutoBetting) return;

    if (betAmount < MIN_BET || betAmount > MAX_BET) {
        setMessage(`Bet must be between $${MIN_BET} and $${MAX_BET}`);
        handleInputBlur();
        if (isAutoTrigger) stopAutoBet();
        return;
    }
    if (!selectedBet) {
      setMessage("Please select a prediction!");
      if (isAutoTrigger) stopAutoBet();
      return;
    }
    if (balance < betAmount) {
      setMessage("Insufficient funds!");
      if (isAutoTrigger) stopAutoBet();
      return;
    }
    if (isRolling) return;

    setIsRolling(true);
    setLastWin(null);
    setMessage(isAutoTrigger ? "Auto Rolling..." : "Rolling...");
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
    // Note: We use the ref's selectedBet if auto betting to ensure closure captures correct bet (though component state should be stable here)
    const currentBet = autoStateRef.current.isAutoBetting ? autoStateRef.current.selectedBet : selectedBet;
    
    let won = false;
    let multiplier = 0;

    if (sum < 7 && currentBet === 'under') {
      won = true;
      multiplier = 2; // 1x payout + bet back
    } else if (sum > 7 && currentBet === 'over') {
      won = true;
      multiplier = 2; // 1x payout + bet back
    } else if (sum === 7 && currentBet === 'seven') {
      won = true;
      multiplier = 5; // 4x payout + bet back
    }

    let winnings = 0;
    if (won) {
      winnings = betAmount * multiplier;
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

    // --- Auto Loop ---
    const { isAutoBetting: currentAuto, autoConfig: config, autoStats: stats, balance: currentBalance } = autoStateRef.current;
    
    if (currentAuto) {
        setTimeout(() => {
             if (!autoStateRef.current.isAutoBetting) return;

             const sessionProfit = (currentBalance + winnings) - stats.initialBalance;
             const nextRound = stats.roundsPlayed + 1;

             setAutoStats(prev => ({
                 ...prev,
                 roundsPlayed: nextRound,
                 netProfit: sessionProfit
             }));

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

             handleRoll(true);
        }, 1500);
    }
  };

  const renderDie = (value: number) => {
      const DieIcon = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6][value - 1];
      return <DieIcon size={80} className={`text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] ${isRolling ? 'animate-spin' : ''}`} strokeWidth={1.5} />;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto space-y-8 p-8 bg-white dark:bg-navy-800/50 rounded-3xl border border-slate-200 dark:border-white/5 backdrop-blur-sm relative overflow-hidden shadow-xl transition-colors duration-300">
        
        {/* Auto Bet Overlay */}
        {isAutoBetting && (
            <div className="absolute top-4 left-4 right-4 bg-amber-500/10 border border-amber-500 rounded-xl p-3 flex justify-between items-center animate-pulse z-30">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                    <Zap size={16} className="fill-current" />
                    AUTO ROLLING ({selectedBet?.toUpperCase()})
                </div>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
                    Rounds: {autoStats.roundsPlayed}/{autoConfig.rounds} | P/L: <span className={autoStats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {autoStats.netProfit >= 0 ? '+' : ''}${autoStats.netProfit}
                    </span>
                </div>
                <button onClick={stopAutoBet} className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors">
                    <StopCircle size={16} />
                </button>
            </div>
        )}

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
                onClick={() => { if(!isAutoBetting) setSelectedBet('under'); }}
                className={`group relative overflow-hidden p-6 rounded-xl border transition-all duration-300 ${
                    selectedBet === 'under' 
                    ? 'bg-blue-100 dark:bg-blue-600/20 border-blue-500 shadow-md' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                } ${isAutoBetting ? 'cursor-not-allowed opacity-80' : ''}`}
            >
                <div className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold mb-1 group-hover:text-slate-900 dark:group-hover:text-white">Under 7</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:scale-110 transition-transform">2 - 6</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-mono">Pays 1x</div>
            </button>

            <button 
                onClick={() => { if(!isAutoBetting) setSelectedBet('seven'); }}
                className={`group relative overflow-hidden p-6 rounded-xl border transition-all duration-300 ${
                    selectedBet === 'seven' 
                    ? 'bg-lavender-100 dark:bg-lavender-500/20 border-lavender-500 shadow-md' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                } ${isAutoBetting ? 'cursor-not-allowed opacity-80' : ''}`}
            >
                <div className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold mb-1 group-hover:text-slate-900 dark:group-hover:text-white">Exact</div>
                <div className="text-2xl font-black text-lavender-600 dark:text-lavender-400 group-hover:scale-110 transition-transform">7</div>
                <div className="text-xs text-lavender-600 dark:text-lavender-300 mt-2 font-mono">Pays 4x</div>
            </button>

            <button 
                onClick={() => { if(!isAutoBetting) setSelectedBet('over'); }}
                className={`group relative overflow-hidden p-6 rounded-xl border transition-all duration-300 ${
                    selectedBet === 'over' 
                    ? 'bg-indigo-100 dark:bg-indigo-600/20 border-indigo-500 shadow-md' 
                    : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                } ${isAutoBetting ? 'cursor-not-allowed opacity-80' : ''}`}
            >
                <div className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold mb-1 group-hover:text-slate-900 dark:group-hover:text-white">Over 7</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:scale-110 transition-transform">8 - 12</div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-mono">Pays 1x</div>
            </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4 z-10 mt-4 relative w-full">
             
             {/* Auto Config Popover */}
             {showAutoSettings && !isAutoBetting && (
                 <div className="absolute bottom-full mb-4 bg-white dark:bg-navy-900 border border-amber-500 rounded-xl p-4 shadow-2xl w-72 z-40 animate-in zoom-in slide-in-from-bottom-2">
                     <div className="flex justify-between items-center mb-3">
                         <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Settings2 size={16}/> Auto Roll Config</h4>
                         <button onClick={() => setShowAutoSettings(false)} className="text-slate-400 hover:text-slate-600"><StopCircle size={16}/></button>
                     </div>
                     <div className="space-y-3">
                         <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Rounds</label>
                             <input type="number" value={autoConfig.rounds} onChange={(e) => setAutoConfig({...autoConfig, rounds: parseInt(e.target.value) || 0})} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-sm dark:text-white" />
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                             <div>
                                 <label className="text-xs font-bold text-green-500 uppercase">Stop Profit</label>
                                 <input type="number" value={autoConfig.stopProfit} onChange={(e) => setAutoConfig({...autoConfig, stopProfit: parseInt(e.target.value) || 0})} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-sm dark:text-white" />
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-red-500 uppercase">Stop Loss</label>
                                 <input type="number" value={autoConfig.stopLoss} onChange={(e) => setAutoConfig({...autoConfig, stopLoss: parseInt(e.target.value) || 0})} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-sm dark:text-white" />
                             </div>
                         </div>
                         <button onClick={startAutoBet} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg mt-2 flex items-center justify-center gap-2 shadow-lg">
                             <PlayCircle size={16} /> START AUTO
                         </button>
                     </div>
                 </div>
             )}

             <div className="flex flex-col items-center gap-2">
                 <div className="flex items-center bg-slate-200 dark:bg-black/40 rounded-lg p-1 border border-slate-300 dark:border-white/10">
                    <button onClick={() => handleBetChange(-10)} disabled={isAutoBetting} className="w-12 h-10 flex items-center justify-center text-slate-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded text-xl disabled:opacity-50">-</button>
                    <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono">$</span>
                        <input 
                            type="number" 
                            value={betAmount === 0 ? '' : betAmount}
                            onChange={handleInputChange}
                            onBlur={handleInputBlur}
                            disabled={isAutoBetting}
                            className="w-24 bg-transparent text-center font-mono font-bold text-xl text-lavender-600 dark:text-lavender-400 focus:outline-none pl-3 disabled:opacity-50"
                        />
                    </div>
                    <button onClick={() => handleBetChange(10)} disabled={isAutoBetting} className="w-12 h-10 flex items-center justify-center text-slate-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded text-xl disabled:opacity-50">+</button>
                 </div>
                 
                 {/* Quick Bet Buttons - Increased Size */}
                 <div className="flex gap-2 flex-wrap justify-center w-full max-w-[240px]">
                      {[5, 10, 25, 50, 100].map((amt) => (
                          <button
                              key={amt}
                              onClick={() => handleBetChange(amt)}
                              disabled={betAmount + amt > MAX_BET || isAutoBetting}
                              className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-lavender-100 dark:hover:bg-lavender-500/20 text-slate-600 dark:text-gray-300 rounded-lg text-sm font-bold border border-slate-200 dark:border-white/10 transition-colors disabled:opacity-50 min-w-[60px]"
                          >
                              +${amt}
                          </button>
                      ))}
                 </div>
             </div>

             <div className="flex items-center gap-4 mt-2">
                 <button 
                    onClick={() => handleRoll(false)}
                    disabled={isRolling || !selectedBet || isAutoBetting}
                    className={`
                        flex items-center gap-2 px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all
                        ${!selectedBet ? 'bg-slate-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 
                        isRolling || isAutoBetting ? 'bg-slate-400 dark:bg-gray-600 text-gray-300 dark:text-gray-400 cursor-wait' :
                        'bg-lavender-500 hover:bg-lavender-600 hover:scale-105 text-white shadow-lavender-500/30'}
                    `}
                 >
                    <RotateCw className={isRolling ? 'animate-spin' : ''} />
                    {isRolling ? 'ROLLING...' : 'ROLL DICE'}
                 </button>

                 <button 
                    onClick={toggleAutoBet}
                    className={`px-4 py-3 rounded-full shadow-lg transition-all border font-bold flex items-center gap-2 ${
                        isAutoBetting 
                        ? 'bg-red-500 hover:bg-red-600 text-white border-white/20' 
                        : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400'
                    }`}
                    title="Auto Roll"
                 >
                     {isAutoBetting ? <StopCircle size={20} /> : <RotateCcw size={20} />}
                     <span className="text-sm">{isAutoBetting ? 'STOP' : 'AUTO'}</span>
                 </button>
             </div>
        </div>

    </div>
  );
};
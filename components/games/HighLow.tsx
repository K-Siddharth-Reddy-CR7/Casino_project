import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../types';
import { DECK_SUITS, DECK_VALUES, MIN_BET, MAX_BET } from '../../constants';
import { CardDisplay } from '../ui/CardDisplay';
import { ArrowUpCircle, ArrowDownCircle, Trophy, Settings2, PlayCircle, StopCircle, Zap, RotateCcw } from 'lucide-react';
import { sendMessageToPitBoss } from '../../services/geminiService';
import confetti from 'canvas-confetti';
import { playSound } from '../../utils/audio';

interface HighLowProps {
  onGameEnd: (amount: number) => void;
  balance: number;
}

interface AutoBetConfig {
  rounds: number;
  stopProfit: number;
  stopLoss: number;
}

export const HighLow: React.FC<HighLowProps> = ({ onGameEnd, balance }) => {
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bet, setBet] = useState(50);
  const [message, setMessage] = useState('Place your bet to start');
  const [history, setHistory] = useState<Card[]>([]);

  // Auto Bet States
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [showAutoSettings, setShowAutoSettings] = useState(false);
  const [autoConfig, setAutoConfig] = useState<AutoBetConfig>({ rounds: 10, stopProfit: 0, stopLoss: 0 });
  const [autoStats, setAutoStats] = useState({ roundsPlayed: 0, initialBalance: 0, netProfit: 0 });

  const autoStateRef = useRef({ isAutoBetting, autoConfig, autoStats, balance, currentCard });

  useEffect(() => {
    autoStateRef.current = { isAutoBetting, autoConfig, autoStats, balance, currentCard };
  }, [isAutoBetting, autoConfig, autoStats, balance, currentCard]);

  // Poker Ranking helper (Ace High)
  const getRank = (value: string) => {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    return ranks.indexOf(value) + 2; // 2=2, ..., 10=10, J=11, Q=12, K=13, A=14
  };

  const drawCard = (): Card => {
    const suit = DECK_SUITS[Math.floor(Math.random() * DECK_SUITS.length)];
    const value = DECK_VALUES[Math.floor(Math.random() * DECK_VALUES.length)];
    let numericValue = parseInt(value);
    if (['J', 'Q', 'K'].includes(value)) numericValue = 10;
    if (value === 'A') numericValue = 11;
    return { suit, value, numericValue };
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
      startGame(true);
  };

  const stopAutoBet = () => {
      setIsAutoBetting(false);
      setMessage("Auto Stopped");
  };

  // Automated Strategy Logic
  useEffect(() => {
      if (isAutoBetting && isPlaying && currentCard) {
          const timer = setTimeout(() => {
              // Strategy: If rank <= 8 (2-8), guess HIGHER. If rank >= 9 (9-A), guess LOWER.
              const rank = getRank(currentCard.value);
              if (rank <= 8) {
                  handleGuess('higher');
              } else {
                  handleGuess('lower');
              }
          }, 1500); // Delay for visual pacing
          return () => clearTimeout(timer);
      }
  }, [isAutoBetting, isPlaying, currentCard]);

  // --- Game Functions ---

  const startGame = (isAutoTrigger = false) => {
    if (!isAutoTrigger && isAutoBetting) return;

    if (bet < MIN_BET || bet > MAX_BET) {
        setMessage(`Bet must be between $${MIN_BET} and $${MAX_BET}`);
        handleInputBlur();
        if (isAutoTrigger) stopAutoBet();
        return;
    }
    if (balance < bet) {
      setMessage("Insufficient Funds!");
      if (isAutoTrigger) stopAutoBet();
      return;
    }
    
    // Reset state
    setNextCard(null);
    const firstCard = drawCard();
    setCurrentCard(firstCard);
    setHistory([firstCard]);
    setIsPlaying(true);
    setMessage("Higher or Lower?");
    onGameEnd(-bet); // Deduct bet immediately
    playSound('card');
  };

  const handleGuess = (guess: 'higher' | 'lower') => {
    if (!currentCard || !isPlaying) return;

    const next = drawCard();
    setNextCard(next);
    setIsPlaying(false); // Round over
    setHistory(prev => [...prev, next]);
    playSound('card');

    const currentRank = getRank(currentCard.value);
    const nextRank = getRank(next.value);
    
    let resultAmount = 0;
    let resultMessage = "";

    if (currentRank === nextRank) {
      // Tie - Push
      resultAmount = bet;
      resultMessage = "It's a Tie! Push.";
    } else if ((guess === 'higher' && nextRank > currentRank) || 
               (guess === 'lower' && nextRank < currentRank)) {
      // Win
      resultAmount = bet * 2;
      resultMessage = "Correct! You Win!";
      playSound('win');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      // Loss
      resultAmount = 0;
      resultMessage = "Wrong guess. House Wins.";
      playSound('loss');
    }

    setMessage(resultMessage);
    if (resultAmount > 0) {
      onGameEnd(resultAmount);
    }

    // --- Auto Loop Continuation ---
    const { isAutoBetting: currentAuto, autoConfig: config, autoStats: stats, balance: currentBalance } = autoStateRef.current;
    
    if (currentAuto) {
        setTimeout(() => {
             if (!autoStateRef.current.isAutoBetting) return;

             const sessionProfit = (currentBalance + resultAmount) - stats.initialBalance;
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

             startGame(true);
        }, 1500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto space-y-8 p-6 bg-white dark:bg-navy-800/50 rounded-3xl border border-slate-200 dark:border-white/5 backdrop-blur-sm shadow-xl relative overflow-hidden transition-colors duration-300">
        
        {/* Auto Bet Overlay */}
        {isAutoBetting && (
            <div className="absolute top-4 left-4 right-4 bg-amber-500/10 border border-amber-500 rounded-xl p-3 flex justify-between items-center animate-pulse z-30">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                    <Zap size={16} className="fill-current" />
                    AUTO PLAYING
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]"></div>

        <div className="text-center z-10">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-widest uppercase">High Low</h2>
            <p className="text-slate-500 dark:text-lavender-300 font-mono text-sm">Ace is High. Ties Push.</p>
        </div>

        {/* Game Area */}
        <div className="flex gap-8 items-center justify-center z-10 min-h-[200px]">
            {/* Current Card */}
            <div className="flex flex-col items-center gap-4">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Current</span>
                {currentCard ? (
                    <div className="transform transition-all duration-500 scale-110">
                        <CardDisplay card={currentCard} />
                    </div>
                ) : (
                     <div className="w-24 h-36 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-lg flex items-center justify-center text-slate-300 dark:text-white/20">?</div>
                )}
            </div>

            {/* Next Card (Result) */}
            <div className="flex flex-col items-center gap-4">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Next Card</span>
                {nextCard ? (
                    <div className="transform transition-all duration-500 animate-in zoom-in slide-in-from-right-10">
                        <CardDisplay card={nextCard} />
                    </div>
                ) : (
                    <div className="w-24 h-36 bg-slate-100 dark:bg-navy-900/50 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-lg flex items-center justify-center text-slate-300 dark:text-white/20">
                         {isPlaying ? <div className="animate-pulse">?</div> : null}
                    </div>
                )}
            </div>
        </div>

        {/* Status Message */}
        <div className="h-12 flex items-center justify-center z-10">
             <div className={`px-6 py-2 rounded-full font-bold text-xl transition-all ${
                 message.includes('Win') ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500' :
                 message.includes('Tie') ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500' :
                 message.includes('House') ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500' :
                 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
             }`}>
                 {message}
             </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-6 w-full z-10 relative">
             
             {/* Auto Config Popover */}
             {showAutoSettings && !isAutoBetting && (
                 <div className="absolute bottom-full mb-4 bg-white dark:bg-navy-900 border border-amber-500 rounded-xl p-4 shadow-2xl w-72 z-40 animate-in zoom-in slide-in-from-bottom-2">
                     <div className="flex justify-between items-center mb-3">
                         <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Settings2 size={16}/> Auto Bot Config</h4>
                         <button onClick={() => setShowAutoSettings(false)} className="text-slate-400 hover:text-slate-600"><StopCircle size={16}/></button>
                     </div>
                     <p className="text-xs text-slate-500 mb-3 italic">Strategy: Guesses Higher on 2-8, Lower on 9-Ace.</p>
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

            {!isPlaying ? (
                <div className="flex flex-col items-center gap-2">
                     <div className="flex items-center bg-slate-200 dark:bg-black/40 rounded-lg p-1 border border-slate-300 dark:border-white/10">
                        <button onClick={() => handleBetChange(-10)} className="w-12 h-10 flex items-center justify-center text-slate-700 dark:text-white hover:text-lavender-600 dark:hover:text-lavender-400 hover:bg-black/5 dark:hover:bg-white/10 rounded disabled:opacity-50 text-xl" disabled={bet <= MIN_BET || isAutoBetting}>-</button>
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono">$</span>
                            <input 
                                type="number" 
                                value={bet === 0 ? '' : bet}
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                                disabled={isAutoBetting}
                                className="w-24 bg-transparent text-center font-mono font-bold text-xl text-lavender-600 dark:text-lavender-400 focus:outline-none pl-3 disabled:opacity-50"
                            />
                        </div>
                        <button onClick={() => handleBetChange(10)} className="w-12 h-10 flex items-center justify-center text-slate-700 dark:text-white hover:text-lavender-600 dark:hover:text-lavender-400 hover:bg-black/5 dark:hover:bg-white/10 rounded disabled:opacity-50 text-xl" disabled={bet >= MAX_BET || isAutoBetting}>+</button>
                    </div>

                    {/* Quick Bet Buttons */}
                    <div className="flex gap-2 flex-wrap justify-center">
                        {[5, 10, 25, 50, 100].map((amt) => (
                            <button
                                key={amt}
                                onClick={() => handleBetChange(amt)}
                                disabled={bet + amt > MAX_BET || isAutoBetting}
                                className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-lavender-100 dark:hover:bg-lavender-500/20 text-slate-600 dark:text-gray-300 rounded-lg text-sm font-bold border border-slate-200 dark:border-white/10 transition-colors disabled:opacity-50 min-w-[60px]"
                            >
                                +${amt}
                            </button>
                        ))}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">Min: ${MIN_BET} | Max: ${MAX_BET}</div>
                    
                    <div className="flex items-center gap-4 mt-2">
                        <button 
                            onClick={() => startGame(false)}
                            disabled={isAutoBetting}
                            className="bg-lavender-500 hover:bg-lavender-600 text-white font-bold px-8 py-3 rounded-full hover:scale-105 transition-all shadow-lg disabled:opacity-50"
                        >
                            DEAL CARD
                        </button>

                        <button 
                            onClick={toggleAutoBet}
                            className={`px-4 py-3 rounded-full shadow-lg transition-all border font-bold flex items-center gap-2 ${
                                isAutoBetting 
                                ? 'bg-red-500 hover:bg-red-600 text-white border-white/20' 
                                : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400'
                            }`}
                            title="Auto Bot"
                        >
                            {isAutoBetting ? <StopCircle size={20} /> : <RotateCcw size={20} />}
                            <span className="text-sm">{isAutoBetting ? 'STOP' : 'AUTO'}</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-8">
                     {isAutoBetting ? (
                         <div className="flex items-center gap-3 bg-slate-800 text-white px-6 py-3 rounded-full border border-white/20 shadow-lg animate-pulse">
                             <Zap size={20} className="text-amber-400 fill-current" />
                             <span className="font-bold tracking-widest">BOT THINKING...</span>
                         </div>
                     ) : (
                         <>
                            <button 
                                onClick={() => handleGuess('lower')}
                                className="group flex flex-col items-center gap-2 bg-slate-100 dark:bg-navy-900 hover:bg-red-50 dark:hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 p-6 rounded-2xl transition-all w-32 shadow-sm"
                            >
                                <ArrowDownCircle size={40} className="text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform"/>
                                <span className="text-red-500 dark:text-red-400 font-bold uppercase tracking-wider">Lower</span>
                            </button>

                            <button 
                                onClick={() => handleGuess('higher')}
                                className="group flex flex-col items-center gap-2 bg-slate-100 dark:bg-navy-900 hover:bg-green-50 dark:hover:bg-green-500/20 border border-green-500/30 hover:border-green-500 p-6 rounded-2xl transition-all w-32 shadow-sm"
                            >
                                <ArrowUpCircle size={40} className="text-green-500 dark:text-green-400 group-hover:scale-110 transition-transform"/>
                                <span className="text-green-500 dark:text-green-400 font-bold uppercase tracking-wider">Higher</span>
                            </button>
                         </>
                     )}
                </div>
            )}
        </div>
        
        {/* History Strip */}
        {history.length > 0 && (
             <div className="flex gap-2 opacity-50 overflow-hidden h-16 items-center">
                 <span className="text-xs text-gray-500 mr-2">History:</span>
                 {history.slice(-10).map((card, i) => (
                     <div key={i} className="text-xs bg-white text-black px-1 rounded shadow border border-gray-300">
                         {card.value}{['hearts','diamonds'].includes(card.suit) ? '♥' : '♠'}
                     </div>
                 ))}
             </div>
        )}

    </div>
  );
};
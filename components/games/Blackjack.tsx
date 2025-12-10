import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, GameStatus } from '../../types';
import { DECK_SUITS, DECK_VALUES, MIN_BET, MAX_BET } from '../../constants';
import { CardDisplay } from '../ui/CardDisplay';
import { sendMessageToPitBoss } from '../../services/geminiService';
import { MessageSquare, PlayCircle, StopCircle, Settings2, RotateCcw, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../../utils/audio';

interface BlackjackProps {
  onGameEnd: (winAmount: number) => void;
  balance: number;
}

interface AutoBetConfig {
  rounds: number;
  stopProfit: number;
  stopLoss: number;
}

export const Blackjack: React.FC<BlackjackProps> = ({ onGameEnd, balance }) => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<GameStatus>(GameStatus.IDLE);
  const [bet, setBet] = useState(50);
  const [message, setMessage] = useState('');
  const [aceAdvice, setAceAdvice] = useState<string>('');
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);

  // Auto Bet States
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [showAutoSettings, setShowAutoSettings] = useState(false);
  const [autoConfig, setAutoConfig] = useState<AutoBetConfig>({ rounds: 10, stopProfit: 0, stopLoss: 0 });
  const [autoStats, setAutoStats] = useState({ roundsPlayed: 0, initialBalance: 0, netProfit: 0 });

  // Refs for auto-bet logic to access latest state in timeouts
  const autoStateRef = useRef({ isAutoBetting, autoConfig, autoStats, balance });

  useEffect(() => {
    autoStateRef.current = { isAutoBetting, autoConfig, autoStats, balance };
  }, [isAutoBetting, autoConfig, autoStats, balance]);

  // Deck generation and shuffling
  const createDeck = () => {
    const newDeck: Card[] = [];
    for (const suit of DECK_SUITS) {
      for (const value of DECK_VALUES) {
        let numericValue = parseInt(value);
        if (['J', 'Q', 'K'].includes(value)) numericValue = 10;
        if (value === 'A') numericValue = 11;
        newDeck.push({ suit, value, numericValue });
      }
    }
    return newDeck.sort(() => Math.random() - 0.5);
  };

  const calculateScore = (hand: Card[]) => {
    let score = hand.reduce((acc, card) => acc + card.numericValue, 0);
    let aces = hand.filter(card => card.value === 'A').length;
    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }
    return score;
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
      setMessage("Auto Bet Stopped");
  };

  // Automated Move Logic (Simple Strategy)
  useEffect(() => {
    if (isAutoBetting && gameState === GameStatus.PLAYING) {
        const timer = setTimeout(() => {
            const score = calculateScore(playerHand);
            if (score < 17) {
                hit();
            } else {
                stand();
            }
        }, 1000); // 1 second delay between moves for visual clarity
        return () => clearTimeout(timer);
    }
  }, [isAutoBetting, gameState, playerHand]);

  // --- Game Functions ---

  const startGame = (isAuto: boolean = false) => {
    if (bet < MIN_BET || bet > MAX_BET) {
        setMessage(`Bet must be between $${MIN_BET} and $${MAX_BET}`);
        handleInputBlur(); 
        if(isAuto) stopAutoBet();
        return;
    }
    if (balance < bet) {
        setMessage("Insufficient funds!");
        if(isAuto) stopAutoBet();
        return;
    }

    const newDeck = createDeck();
    const pHand = [newDeck.pop()!, newDeck.pop()!];
    const dHand = [newDeck.pop()!, newDeck.pop()!];
    
    setDeck(newDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setGameState(GameStatus.PLAYING);
    setMessage('');
    setAceAdvice('');
    onGameEnd(-bet); // Deduct bet on start
    playSound('card');
    
    const pScore = calculateScore(pHand);
    if (pScore === 21) {
        // We pass the new hands directly to avoid stale state
        handleGameEnd(pHand, dHand, GameStatus.BLACKJACK);
    } else if (!isAuto) {
        // Trigger generic start advice only for manual play
        askAce("New hand dealt. Player has " + pScore + ". What's a quick tip?");
    }
  };

  const askAce = async (prompt: string) => {
      setIsAdviceLoading(true);
      try {
          const advice = await sendMessageToPitBoss(prompt);
          setAceAdvice(advice);
      } catch (e) {
          console.error(e);
      } finally {
          setIsAdviceLoading(false);
      }
  };

  const hit = () => {
    playSound('card');
    const newCard = deck.pop()!;
    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);
    const score = calculateScore(newHand);
    if (score > 21) {
      handleGameEnd(newHand, dealerHand, GameStatus.LOST);
    }
  };

  const stand = () => {
    let currentDealerHand = [...dealerHand];
    let dealerScore = calculateScore(currentDealerHand);
    
    while (dealerScore < 17) {
      const newCard = deck.pop()!;
      currentDealerHand = [...currentDealerHand, newCard];
      dealerScore = calculateScore(currentDealerHand);
    }
    setDealerHand(currentDealerHand);
    
    const playerScore = calculateScore(playerHand);
    
    let result = GameStatus.PUSH;
    if (dealerScore > 21) {
        result = GameStatus.WON;
    } else if (playerScore > dealerScore) {
        result = GameStatus.WON;
    } else if (playerScore < dealerScore) {
        result = GameStatus.LOST;
    }

    handleGameEnd(playerHand, currentDealerHand, result);
  };

  const handleGameEnd = (pHand: Card[], dHand: Card[], status: GameStatus) => {
    setGameState(status);
    let winAmount = 0;
    
    if (status === GameStatus.WON) {
        winAmount = bet * 2;
        setMessage("You Won!");
        if (!isAutoBetting) askAce("Player won a hand of blackjack. Congratulate them briefly.");
        playSound('win');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else if (status === GameStatus.BLACKJACK) {
        winAmount = bet * 2.5;
        setMessage("Blackjack! 3:2 Payout!");
        if (!isAutoBetting) askAce("Player got a Blackjack! Celebrate!");
        playSound('win');
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    } else if (status === GameStatus.LOST) {
        winAmount = 0;
        setMessage("Dealer Wins.");
        if (!isAutoBetting) askAce("Player lost to the dealer. Give a cheeky consolation.");
        playSound('loss');
    } else { // PUSH
        winAmount = bet;
        setMessage("Push. Money back.");
    }
    
    if (winAmount > 0) {
        onGameEnd(winAmount);
    }

    // Process Auto Bet Cycle
    if (autoStateRef.current.isAutoBetting) {
        // Use a timeout to allow the user to see the result before the next hand
        setTimeout(() => {
            const { isAutoBetting, autoConfig, autoStats, balance } = autoStateRef.current;
            
            if (!isAutoBetting) return;

            // Calculate updated stats (Adding current win minus current bet cost was already handled in main balance)
            // But we need to track session specific P/L
            const sessionProfit = (balance + winAmount) - autoStats.initialBalance;
            const nextRound = autoStats.roundsPlayed + 1;

            setAutoStats(prev => ({
                ...prev,
                roundsPlayed: nextRound,
                netProfit: sessionProfit
            }));

            // Check Constraints
            if (nextRound >= autoConfig.rounds) {
                stopAutoBet();
                setMessage("Auto Bet Finished: Round Limit Reached");
                return;
            }
            if (autoConfig.stopProfit > 0 && sessionProfit >= autoConfig.stopProfit) {
                stopAutoBet();
                setMessage("Auto Bet Finished: Profit Limit Reached");
                return;
            }
            if (autoConfig.stopLoss > 0 && -sessionProfit >= autoConfig.stopLoss) {
                stopAutoBet();
                setMessage("Auto Bet Finished: Stop Loss Reached");
                return;
            }

            // Start Next Game
            startGame(true);

        }, 2000); 
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto space-y-8 p-6 bg-white dark:bg-navy-800/50 rounded-3xl border border-slate-200 dark:border-white/5 backdrop-blur-sm shadow-xl transition-colors duration-300 relative">
      
      {/* Auto Bet Overlay/Status */}
      {isAutoBetting && (
          <div className="absolute top-4 left-4 right-4 bg-amber-500/10 border border-amber-500 rounded-xl p-3 flex justify-between items-center animate-pulse z-20">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                  <Zap size={16} className="fill-current" />
                  AUTO BET ACTIVE
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

      {/* Dealer Area */}
      <div className="flex flex-col items-center space-y-4 mt-8">
        <h3 className="text-lavender-600 dark:text-lavender-400 text-lg uppercase tracking-widest font-bold">Dealer</h3>
        <div className="flex space-x-[-40px]">
          {gameState === GameStatus.IDLE ? (
             <div className="h-36 w-24 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-lg flex items-center justify-center text-slate-300 dark:text-white/20">Empty</div>
          ) : (
            dealerHand.map((card, index) => (
              <div key={index} className="transition-all duration-500" style={{ transform: `translateX(${index * 10}px)` }}>
                 <CardDisplay card={card} hidden={index === 0 && gameState === GameStatus.PLAYING} />
              </div>
            ))
          )}
        </div>
        {gameState !== GameStatus.PLAYING && gameState !== GameStatus.IDLE && (
            <div className="text-slate-800 dark:text-white font-mono">Score: {calculateScore(dealerHand)}</div>
        )}
      </div>

      {/* Game Message Area */}
      <div className="h-16 flex items-center justify-center">
         {message && (
             <div className={`px-6 py-2 rounded-full font-bold text-xl animate-pulse ${
                 gameState === GameStatus.WON || gameState === GameStatus.BLACKJACK ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500' :
                 gameState === GameStatus.LOST ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500' :
                 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white'
             }`}>
                 {message}
             </div>
         )}
      </div>

      {/* Player Area */}
      <div className="flex flex-col items-center space-y-4">
        <h3 className="text-blue-500 dark:text-blue-400 text-lg uppercase tracking-widest font-bold">You</h3>
        <div className="flex space-x-[-40px]">
        {gameState === GameStatus.IDLE ? (
             <div className="h-36 w-24 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-lg flex items-center justify-center text-slate-300 dark:text-white/20">Empty</div>
          ) : (
            playerHand.map((card, index) => (
              <div key={index} className="transition-all duration-500" style={{ transform: `translateX(${index * 10}px)` }}>
                 <CardDisplay card={card} />
              </div>
            ))
          )}
        </div>
         {gameState !== GameStatus.IDLE && (
            <div className="text-slate-800 dark:text-white font-mono">Score: {calculateScore(playerHand)}</div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4 w-full relative">
          
          {/* Auto Bet Config Modal */}
          {showAutoSettings && !isAutoBetting && (
              <div className="absolute bottom-full mb-4 bg-white dark:bg-navy-900 border border-amber-500 rounded-xl p-4 shadow-2xl w-72 z-30 animate-in zoom-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Settings2 size={16}/> Auto Bet Config</h4>
                      <button onClick={() => setShowAutoSettings(false)} className="text-slate-400 hover:text-slate-600"><StopCircle size={16}/></button>
                  </div>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Number of Rounds</label>
                          <input 
                              type="number" 
                              value={autoConfig.rounds} 
                              onChange={(e) => setAutoConfig({...autoConfig, rounds: parseInt(e.target.value) || 0})}
                              className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-sm dark:text-white"
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-green-500 uppercase">Stop on Profit ($)</label>
                          <input 
                              type="number" 
                              value={autoConfig.stopProfit} 
                              onChange={(e) => setAutoConfig({...autoConfig, stopProfit: parseInt(e.target.value) || 0})}
                              className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-sm dark:text-white"
                              placeholder="0 for no limit"
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-red-500 uppercase">Stop on Loss ($)</label>
                          <input 
                              type="number" 
                              value={autoConfig.stopLoss} 
                              onChange={(e) => setAutoConfig({...autoConfig, stopLoss: parseInt(e.target.value) || 0})}
                              className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-sm dark:text-white"
                              placeholder="0 for no limit"
                          />
                      </div>
                      <button 
                          onClick={startAutoBet}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg mt-2 flex items-center justify-center gap-2 shadow-lg"
                      >
                          <PlayCircle size={16} /> START AUTO
                      </button>
                  </div>
              </div>
          )}

          {gameState === GameStatus.IDLE || gameState !== GameStatus.PLAYING ? (
              <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-2">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center bg-slate-200 dark:bg-black/40 rounded-lg p-2 border border-slate-300 dark:border-white/10">
                        <button onClick={() => handleBetChange(-10)} disabled={isAutoBetting} className="w-12 h-12 flex items-center justify-center text-slate-700 dark:text-white hover:text-lavender-600 dark:hover:text-lavender-400 hover:bg-black/5 dark:hover:bg-white/10 rounded text-xl disabled:opacity-30">-</button>
                        <div className="relative mx-2">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-lg">$</span>
                            <input 
                                type="number" 
                                value={bet === 0 ? '' : bet} 
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                                disabled={isAutoBetting}
                                className="w-28 bg-transparent text-center font-mono font-bold text-2xl text-lavender-600 dark:text-lavender-400 focus:outline-none pl-4 disabled:opacity-50"
                            />
                        </div>
                        <button onClick={() => handleBetChange(10)} disabled={isAutoBetting} className="w-12 h-12 flex items-center justify-center text-slate-700 dark:text-white hover:text-lavender-600 dark:hover:text-lavender-400 hover:bg-black/5 dark:hover:bg-white/10 rounded text-xl disabled:opacity-30">+</button>
                    </div>
                    
                    {/* Quick Bet Buttons */}
                    <div className="flex gap-3 flex-wrap justify-center">
                        {[5, 10, 25, 50, 100].map((amt) => (
                            <button
                                key={amt}
                                onClick={() => handleBetChange(amt)}
                                disabled={bet + amt > MAX_BET || isAutoBetting}
                                className="px-4 py-3 text-sm bg-slate-100 dark:bg-white/5 hover:bg-lavender-100 dark:hover:bg-lavender-500/20 text-slate-600 dark:text-gray-300 rounded-lg font-bold border border-slate-200 dark:border-white/10 transition-colors disabled:opacity-30 min-w-[60px]"
                            >
                                +${amt}
                            </button>
                        ))}
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1">Min: ${MIN_BET} | Max: ${MAX_BET}</div>
                  </div>

                  <div className="flex items-center gap-4 mt-2">
                      <button 
                        onClick={() => startGame(false)}
                        disabled={isAutoBetting}
                        className="bg-lavender-500 hover:bg-lavender-600 disabled:bg-gray-500 text-white font-bold px-10 py-4 rounded-full hover:scale-105 transition-all shadow-lg text-lg flex items-center gap-2"
                      >
                        DEAL CARDS
                      </button>
                      
                      {/* Auto Bet Toggle Button - HIGH VISIBILITY */}
                      <button 
                        onClick={toggleAutoBet}
                        className={`px-6 py-4 rounded-full shadow-lg transition-all border font-bold flex items-center gap-2 ${
                            isAutoBetting 
                            ? 'bg-red-500 hover:bg-red-600 text-white border-white/20' 
                            : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400'
                        }`}
                        title="Auto Bet Settings"
                      >
                         {isAutoBetting ? <StopCircle size={24} /> : <RotateCcw size={24} />}
                         <span className="text-sm">{isAutoBetting ? 'STOP AUTO' : 'AUTO BET'}</span>
                      </button>
                  </div>
              </div>
          ) : (
              <div className="flex gap-4">
                  {isAutoBetting ? (
                      <div className="bg-slate-800 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 border border-white/10">
                          <Zap size={18} className="animate-bounce text-yellow-400"/> Auto Playing...
                      </div>
                  ) : (
                      <>
                        <button 
                            onClick={hit}
                            className="bg-navy-700 hover:bg-navy-600 text-white font-bold px-8 py-3 rounded-full border border-white/10 transition-colors shadow-lg"
                        >
                            HIT
                        </button>
                        <button 
                            onClick={stand}
                            className="bg-lavender-600 hover:bg-lavender-500 text-white font-bold px-8 py-3 rounded-full shadow-lg transition-colors"
                        >
                            STAND
                        </button>
                      </>
                  )}
              </div>
          )}
      </div>

        {/* Ace's Advice Box */}
        {aceAdvice && !isAutoBetting && (
            <div className="mt-6 w-full max-w-lg bg-white dark:bg-navy-900 border border-lavender-500/30 rounded-xl p-4 flex gap-3 items-start animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-sm">
                <div className="p-2 bg-lavender-100 dark:bg-lavender-400/20 rounded-full">
                    <MessageSquare size={20} className="text-lavender-600 dark:text-lavender-400" />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-lavender-600 dark:text-lavender-400 uppercase mb-1">Ace (Pit Boss)</h4>
                    <p className="text-sm text-slate-600 dark:text-gray-300 italic">"{aceAdvice}"</p>
                </div>
            </div>
        )}
    </div>
  );
};
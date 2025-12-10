import React, { useState, useEffect, useCallback } from 'react';
import { Card, GameStatus } from '../../types';
import { DECK_SUITS, DECK_VALUES, MIN_BET, MAX_BET } from '../../constants';
import { CardDisplay } from '../ui/CardDisplay';
import { sendMessageToPitBoss } from '../../services/geminiService';
import { MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../../utils/audio';

interface BlackjackProps {
  onGameEnd: (winAmount: number) => void;
  balance: number;
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
    const newBet = Math.min(MAX_BET, Math.max(MIN_BET, bet + amount));
    setBet(newBet);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const startGame = () => {
    if (bet < MIN_BET || bet > MAX_BET) {
        setMessage(`Bet must be between $${MIN_BET} and $${MAX_BET}`);
        handleInputBlur(); // Auto fix logic
        return;
    }
    if (balance < bet) {
        setMessage("Insufficient funds!");
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
    
    // Auto-check for Blackjack
    const pScore = calculateScore(pHand);
    if (pScore === 21) {
        handleGameEnd(pHand, dHand, GameStatus.BLACKJACK);
    } else {
        // Trigger generic start advice
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
    
    // Dealer logic: Hit on soft 17 or less than 17
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
        askAce("Player won a hand of blackjack. Congratulate them briefly.");
        playSound('win');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else if (status === GameStatus.BLACKJACK) {
        winAmount = bet * 2.5;
        setMessage("Blackjack! 3:2 Payout!");
        askAce("Player got a Blackjack! Celebrate!");
        playSound('win');
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    } else if (status === GameStatus.LOST) {
        winAmount = 0;
        setMessage("Dealer Wins.");
        askAce("Player lost to the dealer. Give a cheeky consolation.");
        playSound('loss');
    } else { // PUSH
        winAmount = bet;
        setMessage("Push. Money back.");
    }
    
    if (winAmount > 0) {
        onGameEnd(winAmount);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto space-y-8 p-6 bg-white dark:bg-navy-800/50 rounded-3xl border border-slate-200 dark:border-white/5 backdrop-blur-sm shadow-xl transition-colors duration-300">
      
      {/* Dealer Area */}
      <div className="flex flex-col items-center space-y-4">
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
      <div className="flex flex-col items-center gap-4 w-full">
          {gameState === GameStatus.IDLE || gameState !== GameStatus.PLAYING ? (
              <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-2">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center bg-slate-200 dark:bg-black/40 rounded-lg p-2 border border-slate-300 dark:border-white/10">
                        <button onClick={() => handleBetChange(-10)} className="w-12 h-12 flex items-center justify-center text-slate-700 dark:text-white hover:text-lavender-600 dark:hover:text-lavender-400 hover:bg-black/5 dark:hover:bg-white/10 rounded text-xl">-</button>
                        <div className="relative mx-2">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-lg">$</span>
                            <input 
                                type="number" 
                                value={bet === 0 ? '' : bet} 
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                                className="w-28 bg-transparent text-center font-mono font-bold text-2xl text-lavender-600 dark:text-lavender-400 focus:outline-none pl-4"
                            />
                        </div>
                        <button onClick={() => handleBetChange(10)} className="w-12 h-12 flex items-center justify-center text-slate-700 dark:text-white hover:text-lavender-600 dark:hover:text-lavender-400 hover:bg-black/5 dark:hover:bg-white/10 rounded text-xl">+</button>
                    </div>
                    
                    {/* Quick Bet Buttons */}
                    <div className="flex gap-3 flex-wrap justify-center">
                        {[5, 10, 25, 50, 100].map((amt) => (
                            <button
                                key={amt}
                                onClick={() => handleBetChange(amt)}
                                disabled={bet + amt > MAX_BET}
                                className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-lavender-100 dark:hover:bg-lavender-500/20 text-slate-600 dark:text-gray-300 rounded-lg text-sm font-bold border border-slate-200 dark:border-white/10 transition-colors disabled:opacity-50 min-w-[60px]"
                            >
                                +${amt}
                            </button>
                        ))}
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1">Min: ${MIN_BET} | Max: ${MAX_BET}</div>
                  </div>

                  <button 
                    onClick={startGame}
                    className="mt-2 bg-lavender-500 hover:bg-lavender-600 text-white font-bold px-10 py-4 rounded-full hover:scale-105 transition-all shadow-lg text-lg"
                  >
                    DEAL CARDS
                  </button>
              </div>
          ) : (
              <div className="flex gap-4">
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
              </div>
          )}
      </div>

        {/* Ace's Advice Box */}
        {aceAdvice && (
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
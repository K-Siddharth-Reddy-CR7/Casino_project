import React, { useState, useEffect } from 'react';
import { Card } from '../../types';
import { DECK_SUITS, DECK_VALUES, MIN_BET, MAX_BET } from '../../constants';
import { CardDisplay } from '../ui/CardDisplay';
import { ArrowUpCircle, ArrowDownCircle, Trophy } from 'lucide-react';
import { sendMessageToPitBoss } from '../../services/geminiService';
import confetti from 'canvas-confetti';
import { playSound } from '../../utils/audio';

interface HighLowProps {
  onGameEnd: (amount: number) => void;
  balance: number;
}

export const HighLow: React.FC<HighLowProps> = ({ onGameEnd, balance }) => {
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bet, setBet] = useState(50);
  const [message, setMessage] = useState('Place your bet to start');
  const [history, setHistory] = useState<Card[]>([]);

  // Poker Ranking helper (Ace High)
  const getRank = (value: string) => {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    return ranks.indexOf(value) + 2;
  };

  const drawCard = (): Card => {
    const suit = DECK_SUITS[Math.floor(Math.random() * DECK_SUITS.length)];
    const value = DECK_VALUES[Math.floor(Math.random() * DECK_VALUES.length)];
    // Numeric value from generic types.ts is blackjack specific (A=11, K=10), 
    // but we use getRank for HighLow logic.
    let numericValue = parseInt(value);
    if (['J', 'Q', 'K'].includes(value)) numericValue = 10;
    if (value === 'A') numericValue = 11;

    return { suit, value, numericValue };
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
        handleInputBlur();
        return;
    }
    if (balance < bet) {
      setMessage("Insufficient Funds!");
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
      if (resultAmount >= 100) {
        sendMessageToPitBoss(`Player won $${resultAmount} on High-Low! Give them a quick thumbs up.`);
      }
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
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto space-y-8 p-6 bg-white dark:bg-navy-800/50 rounded-3xl border border-slate-200 dark:border-white/5 backdrop-blur-sm shadow-xl relative overflow-hidden transition-colors duration-300">
        
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
        <div className="flex flex-col items-center gap-6 w-full z-10">
            {!isPlaying ? (
                <div className="flex flex-col items-center gap-2">
                     <div className="flex items-center bg-slate-200 dark:bg-black/40 rounded-lg p-1 border border-slate-300 dark:border-white/10">
                        <button onClick={() => handleBetChange(-10)} className="w-12 h-10 flex items-center justify-center text-slate-700 dark:text-white hover:text-lavender-600 dark:hover:text-lavender-400 hover:bg-black/5 dark:hover:bg-white/10 rounded disabled:opacity-50 text-xl" disabled={bet <= MIN_BET}>-</button>
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono">$</span>
                            <input 
                                type="number" 
                                value={bet === 0 ? '' : bet}
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                                className="w-24 bg-transparent text-center font-mono font-bold text-xl text-lavender-600 dark:text-lavender-400 focus:outline-none pl-3"
                            />
                        </div>
                        <button onClick={() => handleBetChange(10)} className="w-12 h-10 flex items-center justify-center text-slate-700 dark:text-white hover:text-lavender-600 dark:hover:text-lavender-400 hover:bg-black/5 dark:hover:bg-white/10 rounded disabled:opacity-50 text-xl" disabled={bet >= MAX_BET}>+</button>
                    </div>

                    {/* Quick Bet Buttons - Increased Size */}
                    <div className="flex gap-2 flex-wrap justify-center">
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
                    <button 
                        onClick={startGame}
                        className="mt-2 bg-lavender-500 hover:bg-lavender-600 text-white font-bold px-8 py-3 rounded-full hover:scale-105 transition-all shadow-lg"
                    >
                        DEAL CARD
                    </button>
                </div>
            ) : (
                <div className="flex gap-8">
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
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MIN_BET, MAX_BET } from '../../constants';
import { playSound } from '../../utils/audio';
import { Settings2, PlayCircle, StopCircle, Zap, RotateCcw, Rocket, History, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AviatorProps {
  onGameEnd: (amount: number) => void;
  balance: number;
}

type GameState = 'IDLE' | 'BETTING' | 'FLYING' | 'CRASHED';

interface AutoBetConfig {
  rounds: number;
  stopProfit: number;
  stopLoss: number;
}

export const Aviator: React.FC<AviatorProps> = ({ onGameEnd, balance }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [countdown, setCountdown] = useState(0);

  // Player State
  const [betAmount, setBetAmount] = useState(10);
  const [nextRoundBet, setNextRoundBet] = useState(0); // Bet placed for UPCOMING round
  const [activeBet, setActiveBet] = useState(0); // Bet currently IN PLAY
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);
  const [autoCashout, setAutoCashout] = useState<string>('2.00');

  // Auto Bet State
  const [isAutoBetting, setIsAutoBetting] = useState(false);
  const [showAutoSettings, setShowAutoSettings] = useState(false);
  const [autoConfig, setAutoConfig] = useState<AutoBetConfig>({ rounds: 10, stopProfit: 0, stopLoss: 0 });
  const [autoStats, setAutoStats] = useState({ roundsPlayed: 0, initialBalance: 0, netProfit: 0 });

  // Refs for Animation Loop
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const stateRef = useRef({ 
      gameState, activeBet, cashedOutAt, isAutoBetting, autoConfig, autoStats, balance, nextRoundBet, autoCashout, crashPoint, betAmount
  });

  // Keep refs synced
  useEffect(() => {
    stateRef.current = { 
        gameState, activeBet, cashedOutAt, isAutoBetting, autoConfig, autoStats, balance, nextRoundBet, autoCashout, crashPoint, betAmount
    };
  }, [gameState, activeBet, cashedOutAt, isAutoBetting, autoConfig, autoStats, balance, nextRoundBet, autoCashout, crashPoint, betAmount]);

  // --- Game Loop Logic ---

  const generateCrashPoint = () => {
    // Simple Provably Fair-like simulation
    // Weighted distribution: 1% instant crash (1.00x), otherwise exponential
    if (Math.random() < 0.05) return 1.00; // 5% chance of instant crash for excitement
    const e = 2 ** 32;
    const h = crypto.getRandomValues(new Uint32Array(1))[0];
    const crash = Math.floor((100 * e - h) / (e - h)) / 100;
    return Math.max(1.00, crash);
  };

  const startGameLoop = useCallback(() => {
      // 1. Betting Phase (Countdown)
      setGameState('BETTING');
      setMultiplier(1.00);
      setCashedOutAt(null);
      setActiveBet(0); 
      setCrashPoint(0);

      let count = 5; // 5 seconds betting time
      setCountdown(count);
      
      const countInterval = setInterval(() => {
          count--;
          setCountdown(count);
          if (count <= 0) {
              clearInterval(countInterval);
              launchPlane();
          }
      }, 1000);

  }, []);

  const launchPlane = () => {
      const { nextRoundBet, isAutoBetting, autoStats, balance } = stateRef.current;
      
      // Process Bets
      let currentBet = nextRoundBet;

      // Deduct Balance Logic
      if (currentBet > 0) {
          if (balance < currentBet) {
             // Insufficient funds, cancel bet
             currentBet = 0;
             setNextRoundBet(0);
          } else {
             // Place Bet
             setActiveBet(currentBet);
             onGameEnd(-currentBet); // Deduct immediately
             setNextRoundBet(0); // Clear next round queue
          }
      }

      setGameState('FLYING');
      const crash = generateCrashPoint();
      setCrashPoint(crash);
      startTimeRef.current = Date.now();
      playSound('plane-takeoff');
      
      // The animation frame logic is handled by the useEffect below watching gameState
  };

  // Animation Loop
  useEffect(() => {
      let animId: number;
      
      if (gameState === 'FLYING') {
          const start = Date.now();
          
          const loop = () => {
              const { crashPoint } = stateRef.current;
              const now = Date.now();
              const elapsed = (now - start) / 1000;
              // Multiplier curve: 1 + 0.06 * e^(0.2 * t) - basic exponential visual
              // Simple exponential: M = e^(0.06 * t)
              let newMult = Math.pow(Math.E, 0.06 * elapsed * 1.5); // 1.5 speed factor
              
              if (newMult >= crashPoint) {
                  newMult = crashPoint;
                  handleCrash(crashPoint);
              } else {
                  setMultiplier(newMult);
                  
                  // Auto Cashout Check
                  const { activeBet, cashedOutAt, autoCashout } = stateRef.current;
                  const targetAuto = parseFloat(autoCashout);
                  if (activeBet > 0 && !cashedOutAt && targetAuto > 1.0 && newMult >= targetAuto) {
                      handleCashout(targetAuto); 
                  }

                  animId = requestAnimationFrame(loop);
              }
          };
          animId = requestAnimationFrame(loop);
      }

      return () => cancelAnimationFrame(animId);
  }, [gameState]); // Re-run when gamestate changes to flying

  const handleCrash = (finalMult: number) => {
      setGameState('CRASHED');
      setMultiplier(finalMult);
      setHistory(prev => [finalMult, ...prev].slice(0, 10));
      playSound('crash');

      // Auto Bet Loop Logic
      const { isAutoBetting, autoConfig, autoStats, balance, activeBet, cashedOutAt, betAmount: currentBetAmount } = stateRef.current;
      
      // Calculate profit for this round
      let roundProfit = 0;
      if (activeBet > 0) {
           if (cashedOutAt) {
               // Already credited in handleCashout, profit = (bet * mult) - bet
               roundProfit = (activeBet * cashedOutAt) - activeBet;
           } else {
               // Lost
               roundProfit = -activeBet;
           }
      }

      // Update Auto Stats if active
      if (isAutoBetting) {
          const newNetProfit = autoStats.netProfit + roundProfit;
          const newRounds = autoStats.roundsPlayed + 1;

          setAutoStats(prev => ({ ...prev, roundsPlayed: newRounds, netProfit: newNetProfit }));

          // Check Constraints
          let stop = false;
          if (newRounds >= autoConfig.rounds) stop = true;
          if (autoConfig.stopProfit > 0 && newNetProfit >= autoConfig.stopProfit) stop = true;
          if (autoConfig.stopLoss > 0 && -newNetProfit >= autoConfig.stopLoss) stop = true;

          if (stop) {
              stopAutoBet();
          } else {
              // Queue Next Bet
              // Wait a bit then place next bet
              setTimeout(() => {
                 if(stateRef.current.isAutoBetting) {
                    if (stateRef.current.balance >= stateRef.current.betAmount) { 
                         setNextRoundBet(stateRef.current.betAmount);
                    } else {
                         stopAutoBet(); // insufficient funds
                    }
                 }
              }, 500);
          }
      }

      // Restart Loop after delay
      setTimeout(() => {
          startGameLoop();
      }, 3000);
  };

  const handleCashout = (atMultiplier?: number) => {
      const { activeBet, cashedOutAt } = stateRef.current;
      if (activeBet === 0 || cashedOutAt) return; // No bet or already out

      const mult = atMultiplier || multiplier;
      const winAmount = activeBet * mult;
      
      setCashedOutAt(mult);
      // Logic: User spent 'activeBet' already. We need to add 'winAmount'.
      onGameEnd(winAmount); 
      
      playSound('win');
      if (mult > 5) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  // Initial Start
  useEffect(() => {
      startGameLoop();
      return () => {};
  }, [startGameLoop]);


  // --- Betting Handlers ---
  const placeBet = () => {
      if (balance < betAmount) return;
      if (gameState === 'BETTING') {
          // Can place immediately
          setNextRoundBet(betAmount);
      } else {
          // Queue for next
          setNextRoundBet(betAmount);
      }
  };

  const cancelBet = () => {
      setNextRoundBet(0);
  };

  const handleBetChange = (amount: number) => {
      if (isAutoBetting) return;
      setBetAmount(prev => Math.min(MAX_BET, Math.max(MIN_BET, prev + amount)));
  };

  // --- Auto Bet UI Logic ---
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
      // Queue first bet if manual trigger
      if (balance >= betAmount) {
         setNextRoundBet(betAmount);
      }
  };

  const stopAutoBet = () => {
      setIsAutoBetting(false);
      // Don't cancel next round bet if already committed, but stop future
      if (gameState !== 'BETTING') setNextRoundBet(0); 
  };


  // --- Canvas Rendering ---
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const w = canvas.width;
          const h = canvas.height;
          const padding = 40;

          // Draw Grid
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for(let i=0; i<=4; i++) {
              const y = h - padding - (i * (h-2*padding)/4);
              ctx.moveTo(padding, y);
              ctx.lineTo(w, y);
              ctx.fillStyle = '#64748b';
              ctx.font = '10px sans-serif';
              ctx.fillText(`${1 + i}x`, 10, y + 3);
          }
          ctx.stroke();

          // Draw Curve
          if (gameState === 'FLYING' || gameState === 'CRASHED') {
              ctx.beginPath();
              ctx.moveTo(padding, h - padding);
              
              // Map multiplier to Y
              // We'll just animate a quadratic curve to the top right based on mult
              const progress = Math.min(1, (multiplier - 1) / 5); // 1x to 6x fills screen height approx
              
              const endX = padding + ((w - padding) * Math.min(1, progress * 1.5)); // Move right faster
              const endY = (h - padding) - ((h - padding) * progress);

              ctx.quadraticCurveTo(padding + (endX-padding)/2, h-padding, endX, endY);
              
              ctx.lineWidth = 4;
              ctx.strokeStyle = gameState === 'CRASHED' ? '#ef4444' : '#a78bfa';
              ctx.stroke();
              
              // Fill area
              ctx.lineTo(endX, h - padding);
              ctx.lineTo(padding, h - padding);
              ctx.fillStyle = gameState === 'CRASHED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(167, 139, 250, 0.1)';
              ctx.fill();

              // Draw Plane/Rocket
              ctx.font = '32px serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(gameState === 'CRASHED' ? '💥' : '✈️', endX, endY);
          }
          
          // Draw Loading/Countdown Text
          if (gameState === 'BETTING') {
              ctx.fillStyle = 'white';
              ctx.font = 'bold 40px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(`NEXT ROUND IN ${countdown}`, w/2, h/2);
              
              // Progress bar
              const barW = 200;
              const barH = 6;
              ctx.fillStyle = '#334155';
              ctx.fillRect(w/2 - barW/2, h/2 + 30, barW, barH);
              ctx.fillStyle = '#a78bfa';
              ctx.fillRect(w/2 - barW/2, h/2 + 30, barW * (countdown/5), barH);
          }
      };
      
      const renderLoop = setInterval(draw, 16);
      return () => clearInterval(renderLoop);
  }, [gameState, multiplier, countdown]);


  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* History Strip */}
        <div className="w-full flex gap-2 overflow-hidden bg-slate-900/50 p-2 rounded-lg border border-white/5">
            <History size={16} className="text-slate-500 my-auto ml-2" />
            <div className="flex gap-2">
                {history.map((m, i) => (
                    <div key={i} className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                        m >= 10 ? 'bg-yellow-500 text-black' :
                        m >= 2 ? 'bg-green-500 text-black' :
                        'bg-slate-700 text-slate-300'
                    }`}>
                        {m.toFixed(2)}x
                    </div>
                ))}
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 w-full">
            
            {/* Game Canvas Area */}
            <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-700 relative overflow-hidden h-[400px] shadow-2xl">
                <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={400} 
                    className="w-full h-full object-cover"
                />
                
                {/* Overlay Multiplier */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    {gameState !== 'BETTING' && (
                        <div className={`text-6xl font-black font-mono tracking-tighter ${
                            gameState === 'CRASHED' ? 'text-red-500' : 'text-white'
                        }`}>
                            {multiplier.toFixed(2)}x
                        </div>
                    )}
                    {gameState === 'CRASHED' && (
                        <div className="text-red-500 font-bold uppercase tracking-widest mt-2">FLEW AWAY</div>
                    )}
                    {cashedOutAt && (
                        <div className="mt-4 bg-green-500/90 text-white px-4 py-2 rounded-lg font-bold animate-bounce shadow-lg">
                            YOU CASHED OUT @ {cashedOutAt.toFixed(2)}x
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Side Panel */}
            <div className="w-full md:w-80 flex flex-col gap-4">
                
                {/* Auto Config Panel */}
                {showAutoSettings && !isAutoBetting && (
                    <div className="bg-navy-900 border border-amber-500 rounded-xl p-4 shadow-xl animate-in zoom-in slide-in-from-bottom-2">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-white flex items-center gap-2 text-sm"><Settings2 size={14}/> Auto Bet Config</h4>
                            <button onClick={() => setShowAutoSettings(false)} className="text-gray-400 hover:text-white"><StopCircle size={16}/></button>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Rounds</label>
                                <input type="number" value={autoConfig.rounds} onChange={(e) => setAutoConfig({...autoConfig, rounds: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-green-400 uppercase">Stop Profit ($)</label>
                                <input type="number" value={autoConfig.stopProfit} onChange={(e) => setAutoConfig({...autoConfig, stopProfit: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white" />
                            </div>
                            <button onClick={startAutoBet} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded mt-2 text-xs flex items-center justify-center gap-2">
                                <PlayCircle size={12} /> START LOOP
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Betting Controls */}
                <div className={`bg-white dark:bg-navy-800 rounded-2xl p-4 border-2 shadow-lg transition-all ${
                    activeBet > 0 && !cashedOutAt && gameState === 'FLYING' ? 'border-yellow-500 ring-4 ring-yellow-500/20' : 
                    nextRoundBet > 0 ? 'border-green-500' : 'border-slate-200 dark:border-slate-700'
                }`}>
                    
                    {/* Auto Bet Status Overlay */}
                    {isAutoBetting && (
                        <div className="bg-amber-500/10 border border-amber-500 rounded-lg p-2 mb-4 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                                <Zap size={12} className="fill-current" /> AUTO ON
                            </div>
                            <div className="text-[10px] font-mono text-gray-300">
                                {autoStats.roundsPlayed}/{autoConfig.rounds}
                            </div>
                            <button onClick={stopAutoBet} className="bg-red-600 text-white p-1 rounded-full hover:bg-red-500">
                                <StopCircle size={12} />
                            </button>
                        </div>
                    )}

                    {/* Tabs / Header */}
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-500 dark:text-gray-400 font-bold uppercase text-xs">Bet Amount</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Auto Cashout</span>
                            <div className="relative w-16">
                                <input 
                                    type="number" 
                                    step="0.10"
                                    value={autoCashout}
                                    onChange={(e) => setAutoCashout(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-black/30 text-right px-2 py-1 text-xs rounded border border-slate-300 dark:border-white/10 focus:border-lavender-500 focus:outline-none dark:text-white"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 pointer-events-none">x</span>
                            </div>
                        </div>
                    </div>

                    {/* Bet Inputs */}
                    <div className="flex items-center bg-slate-100 dark:bg-black/20 rounded-xl p-2 mb-3">
                         <button onClick={() => handleBetChange(-10)} disabled={isAutoBetting || activeBet > 0} className="w-10 h-10 bg-white dark:bg-white/5 rounded-lg flex items-center justify-center text-lg font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 dark:text-white">-</button>
                         <input 
                             type="number" 
                             value={betAmount} 
                             onChange={(e) => {if(!isAutoBetting && activeBet === 0) setBetAmount(parseInt(e.target.value)||0)}}
                             disabled={isAutoBetting || activeBet > 0}
                             className="flex-1 bg-transparent text-center text-2xl font-bold font-mono text-slate-800 dark:text-white focus:outline-none"
                         />
                         <button onClick={() => handleBetChange(10)} disabled={isAutoBetting || activeBet > 0} className="w-10 h-10 bg-white dark:bg-white/5 rounded-lg flex items-center justify-center text-lg font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 dark:text-white">+</button>
                    </div>

                    {/* Quick Shortcuts */}
                    <div className="flex gap-2 mb-4 justify-center">
                        {[10, 20, 50, 100].map(amt => (
                            <button 
                                key={amt}
                                onClick={() => !isAutoBetting && activeBet === 0 && setBetAmount(amt)}
                                disabled={isAutoBetting || activeBet > 0}
                                className="flex-1 bg-slate-100 dark:bg-white/5 py-1 rounded text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 dark:text-gray-400 disabled:opacity-30"
                            >
                                {amt}
                            </button>
                        ))}
                    </div>

                    {/* BIG BUTTON Logic */}
                    {activeBet > 0 && !cashedOutAt ? (
                         // IN GAME: Show Cashout (or Waiting if not flying yet)
                         gameState === 'BETTING' ? (
                             <button 
                                onClick={cancelBet}
                                className="w-full bg-red-500 hover:bg-red-600 text-white font-black text-xl py-6 rounded-xl shadow-lg transition-transform active:scale-95 flex flex-col items-center leading-none"
                             >
                                 <span>CANCEL BET</span>
                                 <span className="text-xs font-normal opacity-80 mt-1">Waiting for round...</span>
                             </button>
                         ) : (
                             // FLYING -> CASHOUT
                             <button 
                                onClick={() => handleCashout()}
                                disabled={gameState === 'CRASHED'}
                                className={`w-full font-black text-2xl py-6 rounded-xl shadow-xl transition-transform active:scale-95 flex flex-col items-center leading-none border-b-4 ${
                                    gameState === 'CRASHED' 
                                    ? 'bg-slate-500 border-slate-700 cursor-not-allowed opacity-50'
                                    : 'bg-green-500 hover:bg-green-400 border-green-700 text-white shadow-green-500/30'
                                }`}
                             >
                                 <span>CASHOUT</span>
                                 {gameState === 'FLYING' && (
                                     <span className="text-lg font-mono mt-1">${(activeBet * multiplier).toFixed(2)}</span>
                                 )}
                             </button>
                         )
                    ) : (
                        // NOT IN GAME: Place Bet
                        <div className="flex gap-2">
                             <button 
                                onClick={nextRoundBet > 0 ? cancelBet : placeBet}
                                className={`flex-1 font-black text-xl py-6 rounded-xl shadow-lg transition-transform active:scale-95 flex flex-col items-center leading-none border-b-4 ${
                                    nextRoundBet > 0 
                                    ? 'bg-red-500 hover:bg-red-600 border-red-700 text-white' 
                                    : 'bg-lavender-600 hover:bg-lavender-500 border-lavender-800 text-white'
                                }`}
                             >
                                 <span>{nextRoundBet > 0 ? 'CANCEL' : 'BET'}</span>
                                 <span className="text-xs font-normal opacity-80 mt-1">
                                     {nextRoundBet > 0 ? 'Bet Placed for Next Round' : 'Place bet for next round'}
                                 </span>
                             </button>

                             <button 
                                onClick={toggleAutoBet}
                                className={`w-20 rounded-xl flex flex-col items-center justify-center font-bold text-xs transition-colors ${
                                    isAutoBetting 
                                    ? 'bg-red-500/20 text-red-500 border border-red-500' 
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                                }`}
                             >
                                 {isAutoBetting ? <StopCircle size={20} /> : <RotateCcw size={20} />}
                                 {isAutoBetting ? 'STOP' : 'AUTO'}
                             </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    </div>
  );
};
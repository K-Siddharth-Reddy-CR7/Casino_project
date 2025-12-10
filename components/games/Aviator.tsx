import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MIN_BET, MAX_BET } from '../../constants';
import { playSound } from '../../utils/audio';
import { Settings2, PlayCircle, StopCircle, Zap, RotateCcw, Rocket, History, TrendingUp, ArrowDownCircle, Target } from 'lucide-react';
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

interface Star {
    x: number;
    y: number;
    size: number;
    opacity: number;
    speed: number;
}

export const Aviator: React.FC<AviatorProps> = ({ onGameEnd, balance }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  
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

  // Initialize Stars
  useEffect(() => {
      const stars: Star[] = [];
      for(let i=0; i<60; i++) {
          stars.push({
              x: Math.random() * 800,
              y: Math.random() * 400,
              size: Math.random() * 2 + 0.5,
              opacity: Math.random(),
              speed: Math.random() * 0.5 + 0.2
          });
      }
      starsRef.current = stars;
  }, []);

  // --- Game Loop Logic ---

  const generateCrashPoint = () => {
    // Simple Provably Fair-like simulation
    // Weighted distribution: 5% instant crash (1.00x), otherwise exponential
    if (Math.random() < 0.05) return 1.00; 
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
          // 1. Clear & Background
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const w = canvas.width;
          const h = canvas.height;
          const padding = 40;

          // Draw Stars (Parallax)
          const starSpeedMult = gameState === 'FLYING' ? Math.max(1, multiplier) : 0.2;
          ctx.fillStyle = '#ffffff';
          starsRef.current.forEach(star => {
              // Move star
              star.x -= star.speed * starSpeedMult;
              if (star.x < 0) {
                  star.x = w;
                  star.y = Math.random() * h;
              }
              // Draw
              ctx.globalAlpha = star.opacity;
              ctx.beginPath();
              ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
              ctx.fill();
          });
          ctx.globalAlpha = 1.0;

          // 2. Draw Grid
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          // Horizontal Lines
          for(let i=0; i<=5; i++) {
              const y = h - padding - (i * (h-2*padding)/5);
              ctx.moveTo(0, y);
              ctx.lineTo(w, y);
              
              // Labels
              ctx.fillStyle = '#64748b';
              ctx.font = '10px sans-serif';
              ctx.textAlign = 'left';
              if(i>0) ctx.fillText(`${1 + i}x`, 10, y + 3);
          }
          ctx.stroke();

          // 3. Draw Curve
          if (gameState === 'FLYING' || gameState === 'CRASHED') {
              ctx.beginPath();
              ctx.moveTo(padding, h - padding);
              
              // Calculate control points based on multiplier (progress)
              // Logarithmic scaling for display to keep high multipliers on screen
              // Display Progress = 0 to 1
              const maxDisplayMult = Math.max(2, multiplier * 1.2); 
              const progressX = Math.min(1, (multiplier - 1) / 5); // X moves linearly with time roughly
              const progressY = (multiplier - 1) / (maxDisplayMult - 1); 

              // Simple visual curve: quadratic bezier to top-right corner approximation
              // We'll simulate a curve that gets steeper
              const endX = padding + ((w - padding * 2) * Math.min(1, progressX * 1.2)); 
              // Y position is inverted (h - val)
              // We want the curve to look exponential.
              
              // Just using simple exponential interpolation for visual
              const normalizedMult = Math.min(1, Math.log10(multiplier) / Math.log10(100)); // Log scale for visual
              const endY = (h - padding) - ((h - 2*padding) * normalizedMult); 
              
              // Control Point for slight bend
              const cpX = padding + (endX - padding) * 0.5;
              const cpY = h - padding;

              ctx.quadraticCurveTo(cpX, cpY, endX, endY);
              
              // Gradient Stroke
              const gradStroke = ctx.createLinearGradient(padding, h-padding, endX, endY);
              gradStroke.addColorStop(0, '#818cf8');
              gradStroke.addColorStop(1, gameState === 'CRASHED' ? '#ef4444' : '#c084fc');

              ctx.lineWidth = 5;
              ctx.strokeStyle = gradStroke;
              ctx.lineCap = 'round';
              ctx.shadowBlur = 15;
              ctx.shadowColor = gameState === 'CRASHED' ? 'red' : '#a855f7';
              ctx.stroke();
              ctx.shadowBlur = 0;
              
              // Gradient Fill
              ctx.lineTo(endX, h - padding);
              ctx.lineTo(padding, h - padding);
              ctx.fillStyle = gameState === 'CRASHED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(167, 139, 250, 0.1)';
              ctx.fill();

              // 4. Draw Plane/Rocket
              ctx.save();
              ctx.translate(endX, endY);
              // Calculate rotation roughly based on slope
              const slope = (h - padding - endY) / (endX - padding || 1);
              const angle = Math.min(Math.PI / 4, -Math.atan(slope) * 0.5); // Cap rotation
              ctx.rotate(gameState === 'CRASHED' ? 0.5 : -0.2 - (normalizedMult * 0.5));
              
              ctx.font = '32px serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(gameState === 'CRASHED' ? '💥' : '🚀', 0, 0);
              ctx.restore();
          }
          
          // Draw Loading/Countdown Text
          if (gameState === 'BETTING') {
              ctx.fillStyle = 'white';
              ctx.font = '900 48px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              // Pulse effect
              const scale = 1 + Math.sin(Date.now() / 200) * 0.05;
              ctx.save();
              ctx.translate(w/2, h/2);
              ctx.scale(scale, scale);
              ctx.fillText(`NEXT ROUND IN ${Math.ceil(countdown)}`, 0, 0);
              ctx.restore();
              
              // Progress bar
              const barW = 300;
              const barH = 8;
              ctx.fillStyle = 'rgba(255,255,255,0.1)';
              ctx.fillRect(w/2 - barW/2, h/2 + 40, barW, barH);
              
              // Active fill
              const fillW = barW * (countdown / 5);
              const barGrad = ctx.createLinearGradient(w/2 - barW/2, 0, w/2 - barW/2 + fillW, 0);
              barGrad.addColorStop(0, '#818cf8');
              barGrad.addColorStop(1, '#c084fc');
              ctx.fillStyle = barGrad;
              ctx.fillRect(w/2 - barW/2, h/2 + 40, fillW, barH);
          }
      };
      
      const renderLoop = setInterval(draw, 16);
      return () => clearInterval(renderLoop);
  }, [gameState, multiplier, countdown]);


  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* History Strip */}
        <div className="w-full flex gap-2 overflow-hidden bg-slate-900/50 p-2 rounded-lg border border-white/5 shadow-inner">
            <History size={16} className="text-slate-500 my-auto ml-2 shrink-0" />
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {history.map((m, i) => (
                    <div key={i} className={`px-2 py-1 rounded-md text-xs font-mono font-bold shrink-0 ${
                        m >= 10 ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]' :
                        m >= 2 ? 'bg-purple-500 text-white' :
                        'bg-slate-700 text-slate-300'
                    }`}>
                        {m.toFixed(2)}x
                    </div>
                ))}
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 w-full">
            
            {/* Game Canvas Area */}
            <div className="flex-1 bg-slate-950 rounded-3xl border border-slate-800 relative overflow-hidden h-[450px] shadow-2xl">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none"></div>

                <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={450} 
                    className="w-full h-full object-cover relative z-10"
                />
                
                {/* Overlay Multiplier */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20">
                    {gameState !== 'BETTING' && (
                        <div className={`text-7xl font-black font-mono tracking-tighter drop-shadow-2xl ${
                            gameState === 'CRASHED' ? 'text-red-500' : 'text-white'
                        }`}>
                            {multiplier.toFixed(2)}x
                        </div>
                    )}
                    {gameState === 'CRASHED' && (
                        <div className="text-red-500 font-bold uppercase tracking-widest mt-4 text-xl animate-pulse">FLEW AWAY</div>
                    )}
                    {cashedOutAt && (
                        <div className="mt-6 bg-green-500 text-white px-6 py-3 rounded-xl font-black text-lg animate-bounce shadow-[0_0_20px_rgba(34,197,94,0.5)] border border-green-400">
                            CASHED OUT: ${(activeBet * cashedOutAt).toFixed(2)}
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Side Panel */}
            <div className="w-full lg:w-96 flex flex-col gap-4 relative">
                
                {/* Auto Config Panel (Overlaid or Inline) */}
                {showAutoSettings && !isAutoBetting && (
                    <div className="absolute bottom-full left-0 right-0 mb-4 bg-slate-800/95 backdrop-blur-md border border-lavender-500 rounded-2xl p-5 shadow-2xl z-50 animate-in slide-in-from-bottom-5">
                        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                            <h4 className="font-bold text-white flex items-center gap-2"><Settings2 size={18} className="text-lavender-400"/> Auto Bet Settings</h4>
                            <button onClick={() => setShowAutoSettings(false)} className="text-gray-400 hover:text-white bg-white/5 p-1 rounded-full"><StopCircle size={18}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Number of Rounds</label>
                                <div className="flex items-center gap-2">
                                    <RotateCcw size={14} className="text-slate-500"/>
                                    <input 
                                        type="number" 
                                        value={autoConfig.rounds} 
                                        onChange={(e) => setAutoConfig({...autoConfig, rounds: parseInt(e.target.value) || 0})} 
                                        className="w-full bg-transparent text-sm text-white font-bold focus:outline-none" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/30">
                                    <label className="text-[10px] font-bold text-green-400 uppercase mb-1 block">Stop Profit ($)</label>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp size={14} className="text-green-500"/>
                                        <input 
                                            type="number" 
                                            value={autoConfig.stopProfit} 
                                            onChange={(e) => setAutoConfig({...autoConfig, stopProfit: parseInt(e.target.value) || 0})} 
                                            className="w-full bg-transparent text-sm text-green-100 font-bold focus:outline-none placeholder-green-700"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/30">
                                    <label className="text-[10px] font-bold text-red-400 uppercase mb-1 block">Stop Loss ($)</label>
                                    <div className="flex items-center gap-2">
                                        <ArrowDownCircle size={14} className="text-red-500"/>
                                        <input 
                                            type="number" 
                                            value={autoConfig.stopLoss} 
                                            onChange={(e) => setAutoConfig({...autoConfig, stopLoss: parseInt(e.target.value) || 0})} 
                                            className="w-full bg-transparent text-sm text-red-100 font-bold focus:outline-none placeholder-red-700"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={startAutoBet} 
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transform active:scale-95 transition-all"
                            >
                                <PlayCircle size={18} fill="currentColor" /> START AUTO LOOP
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Betting Controls */}
                <div className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 shadow-xl transition-all h-full flex flex-col justify-between ${
                    activeBet > 0 && !cashedOutAt && gameState === 'FLYING' ? 'border-yellow-500 ring-4 ring-yellow-500/20' : 
                    nextRoundBet > 0 ? 'border-green-500' : 'border-slate-200 dark:border-slate-800'
                }`}>
                    
                    {/* Auto Bet Status Banner */}
                    {isAutoBetting && (
                        <div className="bg-amber-500/10 border border-amber-500/50 rounded-xl p-3 mb-4 flex justify-between items-center animate-pulse">
                            <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                                <Zap size={14} className="fill-current" /> AUTO ACTIVE
                            </div>
                            <div className="text-xs font-mono font-bold text-slate-300">
                                {autoStats.roundsPlayed} / {autoConfig.rounds} Rounds
                            </div>
                            <button onClick={stopAutoBet} className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 transition-colors shadow-lg">
                                <StopCircle size={14} />
                            </button>
                        </div>
                    )}

                    {/* Auto Cashout Input */}
                    <div className="flex justify-between items-center mb-6 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                             <div className="p-2 bg-lavender-500/20 rounded-lg text-lavender-500">
                                 <Target size={16} />
                             </div>
                             <span className="text-slate-500 dark:text-gray-400 font-bold uppercase text-[10px] leading-tight">Auto<br/>Cashout</span>
                        </div>
                        <div className="relative w-24">
                            <input 
                                type="number" 
                                step="0.10"
                                value={autoCashout}
                                onChange={(e) => setAutoCashout(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 text-right px-3 py-2 font-mono font-bold text-sm rounded-lg border border-slate-300 dark:border-slate-700 focus:border-lavender-500 focus:outline-none dark:text-white"
                            />
                            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none font-bold">x</span>
                        </div>
                    </div>

                    {/* Bet Amount Selector */}
                    <div className="flex items-center bg-slate-100 dark:bg-black/30 rounded-2xl p-2 mb-4 border border-slate-200 dark:border-white/5">
                         <button onClick={() => handleBetChange(-10)} disabled={isAutoBetting || activeBet > 0} className="w-12 h-12 bg-white dark:bg-white/5 rounded-xl flex items-center justify-center text-xl font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-30 dark:text-white transition-colors">-</button>
                         <input 
                             type="number" 
                             value={betAmount} 
                             onChange={(e) => {if(!isAutoBetting && activeBet === 0) setBetAmount(parseInt(e.target.value)||0)}}
                             disabled={isAutoBetting || activeBet > 0}
                             className="flex-1 bg-transparent text-center text-3xl font-black font-mono text-slate-800 dark:text-white focus:outline-none"
                         />
                         <button onClick={() => handleBetChange(10)} disabled={isAutoBetting || activeBet > 0} className="w-12 h-12 bg-white dark:bg-white/5 rounded-xl flex items-center justify-center text-xl font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-30 dark:text-white transition-colors">+</button>
                    </div>

                    {/* Quick Shortcuts */}
                    <div className="grid grid-cols-4 gap-2 mb-6">
                        {[10, 20, 50, 100].map(amt => (
                            <button 
                                key={amt}
                                onClick={() => !isAutoBetting && activeBet === 0 && setBetAmount(amt)}
                                disabled={isAutoBetting || activeBet > 0}
                                className="bg-slate-100 dark:bg-slate-800 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-lavender-500 hover:text-white dark:hover:bg-lavender-600 dark:text-gray-400 disabled:opacity-30 transition-colors"
                            >
                                {amt}
                            </button>
                        ))}
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-3 h-24">
                        {activeBet > 0 && !cashedOutAt ? (
                             // IN GAME: Show Cashout (or Waiting if not flying yet)
                             gameState === 'BETTING' ? (
                                 <button 
                                    onClick={cancelBet}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black text-2xl rounded-2xl shadow-lg transition-transform active:scale-95 flex flex-col items-center justify-center leading-none border-b-4 border-red-700"
                                 >
                                     <span>CANCEL</span>
                                     <span className="text-xs font-normal opacity-80 mt-1 uppercase tracking-wider">Wait for round</span>
                                 </button>
                             ) : (
                                 // FLYING -> CASHOUT
                                 <button 
                                    onClick={() => handleCashout()}
                                    disabled={gameState === 'CRASHED'}
                                    className={`flex-1 font-black text-3xl rounded-2xl shadow-xl transition-transform active:scale-95 flex flex-col items-center justify-center leading-none border-b-4 ${
                                        gameState === 'CRASHED' 
                                        ? 'bg-slate-500 border-slate-700 cursor-not-allowed opacity-50'
                                        : 'bg-green-500 hover:bg-green-400 border-green-700 text-white shadow-green-500/30'
                                    }`}
                                 >
                                     <span>CASHOUT</span>
                                     {gameState === 'FLYING' && (
                                         <span className="text-lg font-mono mt-1 opacity-90">${(activeBet * multiplier).toFixed(2)}</span>
                                     )}
                                 </button>
                             )
                        ) : (
                            // NOT IN GAME: Place Bet
                            <>
                                <button 
                                    onClick={nextRoundBet > 0 ? cancelBet : placeBet}
                                    className={`flex-1 font-black text-2xl rounded-2xl shadow-lg transition-transform active:scale-95 flex flex-col items-center justify-center leading-none border-b-4 ${
                                        nextRoundBet > 0 
                                        ? 'bg-red-500 hover:bg-red-600 border-red-700 text-white' 
                                        : 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 border-emerald-800 text-white'
                                    }`}
                                >
                                    <span>{nextRoundBet > 0 ? 'CANCEL' : 'BET'}</span>
                                    <span className="text-xs font-normal opacity-80 mt-1 uppercase tracking-wider font-mono">
                                        {nextRoundBet > 0 ? 'Next Round...' : 'Place Bet'}
                                    </span>
                                </button>

                                <button 
                                    onClick={toggleAutoBet}
                                    className={`w-24 rounded-2xl flex flex-col items-center justify-center font-bold text-xs transition-colors border-2 ${
                                        isAutoBetting 
                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {isAutoBetting ? <StopCircle size={24} className="mb-1" /> : <RotateCcw size={24} className="mb-1" />}
                                    {isAutoBetting ? 'STOP' : 'AUTO'}
                                </button>
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};
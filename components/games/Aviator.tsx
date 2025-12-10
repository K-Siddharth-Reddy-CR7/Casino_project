import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MIN_BET, MAX_BET } from '../../constants';
import { playSound } from '../../utils/audio';
import { Settings2, PlayCircle, StopCircle, Zap, RotateCcw, Target, History, TrendingUp, Plus, Minus, X } from 'lucide-react';
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

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
}

export const Aviator: React.FC<AviatorProps> = ({ onGameEnd, balance }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<Particle[]>([]); // Engine/Crash particles
  
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

  // Refs for Animation Loop and Cleanup
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const countdownIntervalRef = useRef<number | null>(null);
  const restartTimeoutRef = useRef<number | null>(null);
  const nextBetTimeoutRef = useRef<number | null>(null);

  const stateRef = useRef({ 
      gameState, activeBet, cashedOutAt, isAutoBetting, autoConfig, autoStats, balance, nextRoundBet, autoCashout, crashPoint, betAmount
  });

  // Keep refs synced
  useEffect(() => {
    stateRef.current = { 
        gameState, activeBet, cashedOutAt, isAutoBetting, autoConfig, autoStats, balance, nextRoundBet, autoCashout, crashPoint, betAmount
    };
  }, [gameState, activeBet, cashedOutAt, isAutoBetting, autoConfig, autoStats, balance, nextRoundBet, autoCashout, crashPoint, betAmount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (nextBetTimeoutRef.current) clearTimeout(nextBetTimeoutRef.current);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Initialize Stars
  useEffect(() => {
      const stars: Star[] = [];
      for(let i=0; i<80; i++) {
          stars.push({
              x: Math.random() * 800,
              y: Math.random() * 450,
              size: Math.random() * 2 + 0.5,
              opacity: Math.random(),
              speed: Math.random() * 0.8 + 0.2
          });
      }
      starsRef.current = stars;
  }, []);

  // --- Game Loop Logic ---

  const generateCrashPoint = () => {
    // Simple Provably Fair-like simulation
    if (Math.random() < 0.03) return 1.00; // 3% instant crash
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
      particlesRef.current = []; // Clear particles

      let count = 5; // 5 seconds betting time
      setCountdown(count);
      
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      countdownIntervalRef.current = window.setInterval(() => {
          count--;
          setCountdown(count);
          if (count <= 0) {
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              launchPlane();
          }
      }, 1000);

  }, []);

  const launchPlane = () => {
      const { nextRoundBet, balance } = stateRef.current;
      
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
  };

  // Animation Loop
  useEffect(() => {
      
      if (gameState === 'FLYING') {
          const start = Date.now();
          
          const loop = () => {
              const { crashPoint } = stateRef.current;
              const now = Date.now();
              const elapsed = (now - start) / 1000;
              // Multiplier curve: M = e^(0.06 * t)
              let newMult = Math.pow(Math.E, 0.06 * elapsed * 1.8); // Adjusted speed factor
              
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

                  requestRef.current = requestAnimationFrame(loop);
              }
          };
          requestRef.current = requestAnimationFrame(loop);
      }

      return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);

  const handleCrash = (finalMult: number) => {
      setGameState('CRASHED');
      setMultiplier(finalMult);
      setHistory(prev => [finalMult, ...prev].slice(0, 20));
      playSound('crash');

      // Add explosion particles
      for(let i=0; i<30; i++) {
          particlesRef.current.push({
              x: 0, // Set in draw loop
              y: 0, // Set in draw loop
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              life: 1.0,
              color: Math.random() > 0.5 ? '#ef4444' : '#f59e0b',
              size: Math.random() * 5 + 2
          });
      }

      // Auto Bet Loop Logic
      const { isAutoBetting, autoConfig, autoStats, activeBet, cashedOutAt } = stateRef.current;
      
      // Calculate profit for this round
      let roundProfit = 0;
      if (activeBet > 0) {
           if (cashedOutAt) {
               roundProfit = (activeBet * cashedOutAt) - activeBet;
           } else {
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
              nextBetTimeoutRef.current = window.setTimeout(() => {
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
      restartTimeoutRef.current = window.setTimeout(() => {
          startGameLoop();
      }, 3000);
  };

  const handleCashout = (atMultiplier?: number) => {
      const { activeBet, cashedOutAt } = stateRef.current;
      if (activeBet === 0 || cashedOutAt) return;

      const mult = atMultiplier || multiplier;
      const winAmount = activeBet * mult;
      
      setCashedOutAt(mult);
      onGameEnd(winAmount); 
      
      playSound('win');
      if (mult > 5) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  // Initial Start
  useEffect(() => {
      startGameLoop();
  }, [startGameLoop]);


  // --- Betting Handlers ---
  const placeBet = () => {
      if (balance < betAmount) return;
      if (gameState === 'BETTING') {
          setNextRoundBet(betAmount);
      } else {
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

  const handleAutoCashoutChange = (amount: number) => {
      let val = parseFloat(autoCashout) || 1.00;
      val += amount;
      if (val < 1.01) val = 1.01;
      setAutoCashout(val.toFixed(2));
  }

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
      if (balance >= betAmount) {
         setNextRoundBet(betAmount);
      }
  };

  const stopAutoBet = () => {
      setIsAutoBetting(false);
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
          const padding = 50;

          // Draw Stars (Parallax)
          const starSpeedMult = gameState === 'FLYING' ? Math.max(1, multiplier * 0.5) : 0.1;
          ctx.fillStyle = '#ffffff';
          starsRef.current.forEach(star => {
              star.x -= star.speed * starSpeedMult;
              if (star.x < 0) {
                  star.x = w;
                  star.y = Math.random() * h;
              }
              ctx.globalAlpha = star.opacity;
              ctx.beginPath();
              ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
              ctx.fill();
          });
          ctx.globalAlpha = 1.0;

          // 2. Draw Grid
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for(let i=0; i<=5; i++) {
              const y = h - padding - (i * (h-2*padding)/5);
              ctx.moveTo(0, y);
              ctx.lineTo(w, y);
              
              ctx.fillStyle = '#64748b';
              ctx.font = '10px sans-serif';
              ctx.textAlign = 'left';
              if(i>0) ctx.fillText(`${1 + i}x`, 10, y + 3);
          }
          ctx.stroke();

          // 3. Draw Rocket Path
          if (gameState === 'FLYING' || gameState === 'CRASHED') {
              // Calculate Position
              const maxDisplayMult = Math.max(2, multiplier * 1.1); 
              const progressX = Math.min(1, (multiplier - 1) / 4); 
              
              // Curve mapping
              const endX = padding + ((w - padding * 2) * Math.min(1, progressX * 1.1)); 
              const normalizedMult = Math.min(1, Math.log10(multiplier) / Math.log10(50)); 
              const endY = (h - padding) - ((h - 2*padding) * normalizedMult); 
              
              // Bezier Control Point
              const cpX = padding + (endX - padding) * 0.6;
              const cpY = h - padding;

              // Draw Glow Trail
              ctx.beginPath();
              ctx.moveTo(padding, h - padding);
              ctx.quadraticCurveTo(cpX, cpY, endX, endY);
              
              // Gradient Stroke
              const gradStroke = ctx.createLinearGradient(padding, h-padding, endX, endY);
              gradStroke.addColorStop(0, '#4f46e5'); // Indigo
              gradStroke.addColorStop(0.5, '#a855f7'); // Purple
              gradStroke.addColorStop(1, gameState === 'CRASHED' ? '#ef4444' : '#f472b6'); // Pink/Red

              ctx.lineWidth = 4;
              ctx.strokeStyle = gradStroke;
              ctx.lineCap = 'round';
              ctx.shadowBlur = 20;
              ctx.shadowColor = gameState === 'CRASHED' ? '#ef4444' : '#d8b4fe';
              ctx.stroke();
              
              // Fill area under curve
              ctx.lineTo(endX, h - padding);
              ctx.lineTo(padding, h - padding);
              const gradFill = ctx.createLinearGradient(0, endY, 0, h-padding);
              gradFill.addColorStop(0, gameState === 'CRASHED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)');
              gradFill.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = gradFill;
              ctx.fill();
              
              // Reset Shadow
              ctx.shadowBlur = 0;

              // 4. Particles (Engine / Crash)
              if (gameState === 'FLYING') {
                   // Emit new engine particles
                   for(let i=0; i<2; i++) {
                       particlesRef.current.push({
                           x: endX,
                           y: endY,
                           vx: -2 - Math.random() * 2,
                           vy: (Math.random() - 0.5) * 2,
                           life: 1.0,
                           color: Math.random() > 0.5 ? '#fbbf24' : '#f87171',
                           size: Math.random() * 3 + 1
                       });
                   }
              } else if (gameState === 'CRASHED') {
                  // Initialize crash particles was done in handleCrash
                  // But we need to update position relative to crash point
                  if (particlesRef.current.length > 0 && particlesRef.current[0].x === 0) {
                       particlesRef.current.forEach(p => { p.x = endX; p.y = endY; });
                  }
                  
                  // Draw expanding shockwave
                  const timeSinceCrash = (Date.now() - startTimeRef.current) / 1000; // rough proxy, not exact
                  ctx.beginPath();
                  ctx.arc(endX, endY, 20 + (Date.now()%1000)/5, 0, Math.PI*2);
                  ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0, 1 - (Date.now()%500)/500)})`;
                  ctx.lineWidth = 2;
                  ctx.stroke();
              }

              // Update & Draw Particles
              for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                  const p = particlesRef.current[i];
                  p.x += p.vx;
                  p.y += p.vy;
                  p.life -= 0.05;
                  p.size *= 0.95;

                  if (p.life <= 0) {
                      particlesRef.current.splice(i, 1);
                  } else {
                      ctx.globalAlpha = p.life;
                      ctx.fillStyle = p.color;
                      ctx.beginPath();
                      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                      ctx.fill();
                  }
              }
              ctx.globalAlpha = 1.0;

              // 5. Draw Rocket
              ctx.save();
              ctx.translate(endX, endY);
              
              // Jitter effect
              if (gameState === 'FLYING') {
                  ctx.translate((Math.random()-0.5)*2, (Math.random()-0.5)*2);
              }

              // Rotation
              const slope = (h - padding - endY) / (endX - padding || 1);
              const angle = Math.min(Math.PI / 4, -Math.atan(slope) * 0.8);
              ctx.rotate(gameState === 'CRASHED' ? 0.5 : -0.2 - (normalizedMult * 0.4));
              
              ctx.font = '40px serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.shadowColor = 'black';
              ctx.shadowBlur = 10;
              ctx.fillText(gameState === 'CRASHED' ? '💥' : '🚀', 0, 0);
              ctx.restore();
          }
          
          // Draw Countdown
          if (gameState === 'BETTING') {
              ctx.fillStyle = 'white';
              ctx.font = '900 64px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              // Pulse
              const scale = 1 + Math.sin(Date.now() / 150) * 0.05;
              ctx.save();
              ctx.translate(w/2, h/2);
              ctx.scale(scale, scale);
              ctx.fillText(`${Math.ceil(countdown)}`, 0, -20);
              ctx.font = '700 24px sans-serif';
              ctx.fillStyle = '#a78bfa';
              ctx.fillText("TAKING OFF IN", 0, 30);
              ctx.restore();
              
              // Progress Line
              const barW = 400;
              const barH = 6;
              ctx.fillStyle = 'rgba(255,255,255,0.1)';
              ctx.fillRect(w/2 - barW/2, h/2 + 60, barW, barH);
              
              const fillW = barW * (countdown / 5);
              ctx.fillStyle = '#a78bfa';
              ctx.shadowBlur = 10;
              ctx.shadowColor = '#a78bfa';
              ctx.fillRect(w/2 - barW/2, h/2 + 60, fillW, barH);
              ctx.shadowBlur = 0;
          }
      };
      
      const renderLoop = setInterval(draw, 16);
      return () => clearInterval(renderLoop);
  }, [gameState, multiplier, countdown]);


  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 relative">
        <style>
          {`
            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { 
              -webkit-appearance: none; 
              margin: 0; 
            }
            input[type=number] {
              -moz-appearance: textfield;
            }
          `}
        </style>

        {/* Auto Bet Indicator - REPOSITIONED to Top Right */}
        {isAutoBetting && (
            <div className="absolute top-4 right-4 z-40 bg-navy-900/90 backdrop-blur-md border border-amber-500/50 rounded-xl px-4 py-2 flex items-center gap-4 shadow-2xl animate-in slide-in-from-right-5">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Zap size={18} className="text-amber-400 fill-amber-400 animate-pulse" />
                        <div className="absolute inset-0 bg-amber-400 blur-lg opacity-30 animate-pulse"></div>
                    </div>
                    <div>
                        <div className="text-amber-100 font-bold text-xs tracking-wide">AUTO BET ACTIVE</div>
                        <div className="text-[10px] font-mono text-amber-100/60">
                            {autoStats.roundsPlayed}/{autoConfig.rounds} Rounds • P/L: ${autoStats.netProfit.toFixed(0)}
                        </div>
                    </div>
                </div>
                <button 
                    onClick={stopAutoBet} 
                    className="ml-2 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white p-1.5 rounded-lg transition-colors border border-red-500/30"
                >
                    <StopCircle size={14} />
                </button>
            </div>
        )}

        {/* History Strip */}
        <div className="w-full flex gap-3 overflow-hidden bg-slate-900/60 p-3 rounded-2xl border border-white/5 shadow-inner backdrop-blur-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider px-2 border-r border-white/5">
                <History size={14} /> History
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide items-center">
                {history.length === 0 && <span className="text-xs text-slate-600 italic">No recent flights</span>}
                {history.map((m, i) => (
                    <div key={i} className={`px-3 py-1 rounded-full text-xs font-mono font-bold shrink-0 shadow-sm border ${
                        m >= 10 
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' 
                        : m >= 2 
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' 
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    }`}>
                        {m.toFixed(2)}x
                    </div>
                ))}
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 w-full relative">
            
            {/* Game Canvas Area */}
            <div className="flex-1 bg-slate-950 rounded-3xl border border-slate-800 relative overflow-hidden h-[500px] shadow-2xl group">
                <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={500} 
                    className="w-full h-full object-cover relative z-10"
                />
                
                {/* Overlay Multiplier */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20">
                    {gameState !== 'BETTING' && (
                        <div className={`text-7xl lg:text-8xl font-black font-mono tracking-tighter drop-shadow-2xl transition-all duration-100 ${
                            gameState === 'CRASHED' ? 'text-red-500 scale-110' : 'text-white'
                        }`}>
                            {multiplier.toFixed(2)}x
                        </div>
                    )}
                    {gameState === 'CRASHED' && (
                        <div className="text-red-500 font-bold uppercase tracking-widest mt-4 text-2xl animate-bounce">FLEW AWAY</div>
                    )}
                    {cashedOutAt && (
                        <div className="mt-8 bg-green-500/90 backdrop-blur text-white px-8 py-4 rounded-2xl font-black text-xl animate-in zoom-in slide-in-from-bottom-4 shadow-[0_0_50px_rgba(34,197,94,0.5)] border border-green-400/50">
                            CASHED OUT: ${(activeBet * cashedOutAt).toFixed(2)}
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Side Panel */}
            <div className="w-full lg:w-96 flex flex-col gap-4 relative">
                
                {/* Auto Config Panel - REPOSITIONED with sleek card style */}
                {showAutoSettings && !isAutoBetting && (
                    <div className="absolute bottom-28 left-0 right-0 z-50 animate-in slide-in-from-bottom-5 fade-in">
                        <div className="bg-slate-900/95 backdrop-blur-xl border border-lavender-500/50 rounded-2xl p-5 shadow-2xl ring-1 ring-white/10">
                            <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
                                <h4 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Settings2 size={16} className="text-lavender-400"/> Auto Bet Setup
                                </h4>
                                <button onClick={() => setShowAutoSettings(false)} className="text-slate-400 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Total Rounds</label>
                                    <div className="relative">
                                        <RotateCcw size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                                        <input 
                                            type="number" 
                                            value={autoConfig.rounds} 
                                            onChange={(e) => setAutoConfig({...autoConfig, rounds: parseInt(e.target.value) || 0})} 
                                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white font-bold focus:border-lavender-500 focus:outline-none transition-colors" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-green-400 uppercase mb-1.5 block">Stop Profit</label>
                                        <div className="relative">
                                            <TrendingUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500/50"/>
                                            <input 
                                                type="number" 
                                                value={autoConfig.stopProfit} 
                                                onChange={(e) => setAutoConfig({...autoConfig, stopProfit: parseInt(e.target.value) || 0})} 
                                                className="w-full bg-black/40 border border-green-500/20 rounded-lg py-2 pl-9 pr-3 text-sm text-green-400 font-bold focus:border-green-500 focus:outline-none placeholder-green-900/50"
                                                placeholder="∞"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-red-400 uppercase mb-1.5 block">Stop Loss</label>
                                        <div className="relative">
                                            <Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500/50"/>
                                            <input 
                                                type="number" 
                                                value={autoConfig.stopLoss} 
                                                onChange={(e) => setAutoConfig({...autoConfig, stopLoss: parseInt(e.target.value) || 0})} 
                                                className="w-full bg-black/40 border border-red-500/20 rounded-lg py-2 pl-9 pr-3 text-sm text-red-400 font-bold focus:border-red-500 focus:outline-none placeholder-red-900/50"
                                                placeholder="∞"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={startAutoBet} 
                                    className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all text-sm uppercase tracking-wide"
                                >
                                    <PlayCircle size={16} fill="currentColor" /> Start Auto Loop
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Betting Controls */}
                <div className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border transition-all h-full flex flex-col justify-between shadow-xl ${
                    activeBet > 0 && !cashedOutAt && gameState === 'FLYING' ? 'border-green-500 ring-4 ring-green-500/20' : 
                    nextRoundBet > 0 ? 'border-yellow-500' : 'border-slate-200 dark:border-slate-800'
                }`}>
                    
                    {/* Auto Cashout Input */}
                    <div className="flex justify-between items-center mb-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                             <div className="p-2 bg-lavender-500/20 rounded-xl text-lavender-500">
                                 <Target size={20} />
                             </div>
                             <div>
                                <div className="text-slate-500 dark:text-gray-400 font-bold uppercase text-[10px] leading-tight">Auto Cashout</div>
                                <div className="text-[10px] text-slate-400">At multiplier</div>
                             </div>
                        </div>
                        <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 shadow-inner p-1">
                            <button onClick={() => handleAutoCashoutChange(-0.1)} className="p-2 text-slate-400 hover:text-lavender-500 transition-colors">
                                <Minus size={16} />
                            </button>
                            <div className="relative w-20 text-center">
                                <input 
                                    type="number" 
                                    step="0.10"
                                    value={autoCashout}
                                    onChange={(e) => setAutoCashout(e.target.value)}
                                    className="w-full bg-transparent text-center font-mono font-bold text-lg focus:outline-none dark:text-white appearance-none"
                                />
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none font-bold opacity-0">x</span>
                            </div>
                            <button onClick={() => handleAutoCashoutChange(0.1)} className="p-2 text-slate-400 hover:text-lavender-500 transition-colors">
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Bet Amount Selector */}
                    <div className="bg-slate-100 dark:bg-black/30 rounded-2xl p-2 mb-4 border border-slate-200 dark:border-white/5">
                        <div className="flex items-center">
                             <button onClick={() => handleBetChange(-10)} disabled={isAutoBetting || activeBet > 0} className="w-12 h-12 bg-white dark:bg-white/5 rounded-xl flex items-center justify-center text-xl font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-30 dark:text-white transition-colors">-</button>
                             <input 
                                 type="number" 
                                 value={betAmount} 
                                 onChange={(e) => {if(!isAutoBetting && activeBet === 0) setBetAmount(parseInt(e.target.value)||0)}}
                                 disabled={isAutoBetting || activeBet > 0}
                                 className="flex-1 bg-transparent text-center text-3xl font-black font-mono text-slate-800 dark:text-white focus:outline-none appearance-none"
                             />
                             <button onClick={() => handleBetChange(10)} disabled={isAutoBetting || activeBet > 0} className="w-12 h-12 bg-white dark:bg-white/5 rounded-xl flex items-center justify-center text-xl font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-30 dark:text-white transition-colors">+</button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-2 px-1">
                            {[10, 20, 50, 100].map(amt => (
                                <button 
                                    key={amt}
                                    onClick={() => !isAutoBetting && activeBet === 0 && setBetAmount(amt)}
                                    disabled={isAutoBetting || activeBet > 0}
                                    className="bg-white/50 dark:bg-white/5 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-lavender-500 hover:text-white dark:hover:bg-lavender-600 dark:text-gray-400 disabled:opacity-30 transition-colors uppercase tracking-wider"
                                >
                                    +{amt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-3 h-28">
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
                                         <span className="text-xl font-mono mt-1 opacity-90 tracking-wider">${(activeBet * multiplier).toFixed(2)}</span>
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
                                        : 'bg-green-500 hover:bg-green-400 border-green-700 text-white'
                                    }`}
                                >
                                    <span>{nextRoundBet > 0 ? 'CANCEL' : 'BET'}</span>
                                    <span className="text-xs font-normal opacity-80 mt-1 uppercase tracking-wider font-mono">
                                        {nextRoundBet > 0 ? 'Queued for Next' : 'Place Bet'}
                                    </span>
                                </button>

                                <button 
                                    onClick={toggleAutoBet}
                                    className={`w-28 rounded-2xl flex flex-col items-center justify-center font-bold text-xs transition-colors border-2 ${
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
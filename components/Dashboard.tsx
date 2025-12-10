import React from 'react';
import { PlayerStats } from '../types';
import { TrendingUp, DollarSign, Award, ArrowRight, Wallet, ArrowDownCircle, ArrowUpCircle, Target, Sparkles, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { PROMOTIONS } from '../constants';
import { Link, useNavigate } from 'react-router-dom';

interface DashboardProps {
  stats: PlayerStats;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, onDeposit, onWithdraw }) => {
  const navigate = useNavigate();

  const getPromoLink = (id: string) => {
    switch (id) {
        case 'dice-promo': return '/dice';
        case 'vip': return '/statement';
        default: return '/blackjack';
    }
  };

  // Calculate unlocking progress
  const TARGET_DEPOSIT = 5000;
  const totalDeposits = stats.history
    .filter(tx => tx.type === 'deposit' && (tx.status === 'approved' || !tx.status)) // Count only approved or legacy deposits
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const isUnlocked = totalDeposits >= TARGET_DEPOSIT;
  const progressPercent = Math.min((totalDeposits / TARGET_DEPOSIT) * 100, 100);
  const remainingDeposit = Math.max(0, TARGET_DEPOSIT - totalDeposits);

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
       
       {/* Hero Section */}
       <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-2">Hello, <span className="text-lavender-600 dark:text-lavender-400">{stats.user.username}</span></h1>
            <p className="text-slate-500 dark:text-gray-400">Your account overview and active tables.</p>
          </div>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6" role="region" aria-label="Account Statistics">
           {/* Main Balance Card */}
           <div className="md:col-span-2 bg-gradient-to-br from-indigo-900 to-navy-900 dark:from-navy-800 dark:to-navy-900 p-6 rounded-2xl border border-lavender-500/20 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <DollarSign size={100} className="text-white" />
              </div>
              <h2 className="text-lavender-300 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Wallet size={14} />
                  Available Balance
              </h2>
              <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-black text-white tracking-tight" aria-label={`Balance: ${stats.balance} dollars`}>
                      ${stats.balance.toLocaleString()}
                  </span>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4 z-10 relative">
                  <button 
                    onClick={() => navigate('/banking?tab=deposit')}
                    className="flex-1 bg-lavender-500 hover:bg-lavender-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-lavender-500/20"
                    aria-label="Deposit Funds"
                  >
                      <ArrowDownCircle size={18} /> Deposit
                  </button>
                  <button 
                    onClick={() => navigate('/banking?tab=withdrawal')}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10"
                    aria-label="Withdraw Funds"
                  >
                      <ArrowUpCircle size={18} /> Withdraw
                  </button>
              </div>

              {/* Chart Background */}
              <div className="absolute bottom-0 left-0 right-0 h-24 opacity-30 pointer-events-none">
                  <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.history.slice(-20)}>
                            <defs>
                                <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.5}/>
                                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="amount" stroke="#a78bfa" strokeWidth={2} fill="url(#colorBal)" isAnimationActive={false} />
                        </AreaChart>
                  </ResponsiveContainer>
              </div>
           </div>

           {/* Quick Stats - Wins */}
           <div className="bg-white dark:bg-navy-800/50 p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
              <div className="flex justify-between items-start">
                  <div className="p-3 bg-green-500/10 rounded-xl text-green-500 dark:text-green-400">
                      <TrendingUp size={24} aria-hidden="true" />
                  </div>
                  <span className="text-xs text-green-600 dark:text-green-400 font-bold bg-green-100 dark:bg-green-500/10 px-2 py-1 rounded" aria-label="Win rate positive">Good Luck</span>
              </div>
              <div>
                  <h3 className="text-slate-500 dark:text-gray-400 text-sm font-semibold mb-1">Total Wins</h3>
                  <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.wins}</p>
              </div>
           </div>

           {/* Quick Stats - Activity */}
           <div className="bg-white dark:bg-navy-800/50 p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
              <div className="flex justify-between items-start">
                  <div className="p-3 bg-red-500/10 rounded-xl text-red-500 dark:text-red-400">
                      <Target size={24} aria-hidden="true" />
                  </div>
              </div>
              <div>
                  <h3 className="text-slate-500 dark:text-gray-400 text-sm font-semibold mb-1">Total Rounds</h3>
                  <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.wins + stats.losses}</p>
              </div>
           </div>
       </div>

       {/* Celebrity Ambassador Section - Cristiano Ronaldo */}
       <section aria-label="Brand Ambassador Promotion" className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-navy-900 border border-lavender-500/20 shadow-2xl group">
          {/* Background Abstract */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-navy-900 to-indigo-950"></div>
          
          <div className="flex flex-col md:flex-row items-center relative z-10">
              {/* Celebrity Image Container */}
              <div className="w-full md:w-1/3 h-96 relative overflow-hidden flex items-end justify-center bg-black/20">
                  {/* Background behind image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80 z-10"></div>
                  
                  {/* Cristiano Ronaldo Image */}
                  <div className="relative h-full w-full flex items-end justify-center">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg" 
                        alt="Cristiano Ronaldo"
                        className="h-full w-full object-cover object-top mask-image-b"
                        style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
                      />
                  </div>

                  <div className="absolute bottom-6 left-6 z-20 bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
                      <p className="text-white font-bold text-sm">Cristiano Ronaldo</p>
                      <p className="text-lavender-400 text-xs">Global Ambassador</p>
                  </div>
              </div>

              {/* Promo Content */}
              <div className="w-full md:w-2/3 p-8 md:p-12 flex flex-col items-start justify-center">
                  <div className="flex items-center gap-2 bg-lavender-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 shadow-lg shadow-lavender-500/30">
                      <Sparkles size={12} /> Exclusive Partner Offer
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight tracking-tight">
                      PLAY LIKE A <span className="text-transparent bg-clip-text bg-gradient-to-r from-lavender-400 to-indigo-400">LEGEND</span>
                  </h2>
                  
                  <div className="flex flex-col gap-2 mb-6 w-full max-w-lg">
                      <div className="flex items-center gap-2 text-gray-300">
                          <CheckCircle2 size={16} className="text-green-400" />
                          <span className="font-bold text-white">100% Deposit Match</span> up to <span className="text-white font-bold">$1,000</span>
                      </div>
                      
                      {/* Locked Code Section */}
                      <div className="mt-2 bg-white/5 border border-white/10 rounded-xl p-4 w-full">
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-xs text-gray-400 uppercase font-bold">Bonus Code</span>
                             <div className="flex items-center gap-1 text-xs">
                                 {isUnlocked ? (
                                     <span className="text-green-400 flex items-center gap-1"><Unlock size={12}/> Unlocked</span>
                                 ) : (
                                     <span className="text-orange-400 flex items-center gap-1"><Lock size={12}/> Locked</span>
                                 )}
                             </div>
                         </div>
                         
                         <div className="flex items-center justify-between gap-4">
                             {isUnlocked ? (
                                 <div className="font-mono text-2xl font-bold text-lavender-300 tracking-widest bg-black/30 px-4 py-1 rounded-lg border border-lavender-500/30">
                                     CR7VIP
                                 </div>
                             ) : (
                                 <div className="flex-1">
                                     <div className="flex justify-between text-xs text-gray-500 mb-1">
                                         <span>Progress</span>
                                         <span>${totalDeposits} / ${TARGET_DEPOSIT}</span>
                                     </div>
                                     <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                         <div 
                                            className="bg-gradient-to-r from-orange-500 to-lavender-500 h-full transition-all duration-500" 
                                            style={{width: `${progressPercent}%`}}
                                         ></div>
                                     </div>
                                     <p className="text-[10px] text-orange-400 mt-1">
                                         Deposit ${remainingDeposit} more to reveal code
                                     </p>
                                 </div>
                             )}
                         </div>
                      </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-8 font-mono border-l-2 border-lavender-500/30 pl-3 max-w-md">
                      Min. deposit ${TARGET_DEPOSIT}. Max bonus $1000. 35x Wagering requirement.
                  </p>
                  
                  <div className="flex flex-wrap gap-4">
                      {isUnlocked ? (
                           <button 
                             onClick={() => alert("Bonus Claimed! (Simulation)")}
                             className="bg-white text-navy-900 hover:bg-lavender-50 font-bold py-4 px-8 rounded-full transition-all transform hover:scale-105 shadow-xl flex items-center gap-2"
                             aria-label="Claim the Bonus"
                           >
                               <Target className="text-yellow-500 fill-yellow-500" size={20} />
                               CLAIM $1000 BONUS
                           </button>
                      ) : (
                          <button 
                            onClick={() => navigate('/banking?tab=deposit')}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold py-4 px-8 rounded-full transition-all flex items-center gap-2"
                            aria-label="Deposit to Unlock"
                          >
                              <Lock size={18} />
                              DEPOSIT TO UNLOCK
                          </button>
                      )}
                      
                      <Link 
                        to="/dice"
                        className="bg-navy-800 hover:bg-navy-700 text-white font-bold py-4 px-8 rounded-full border border-white/10 transition-all flex items-center gap-2"
                        aria-label="Play Games"
                    >
                          PLAY NOW
                      </Link>
                  </div>
              </div>
          </div>
       </section>

       {/* Promotions Section */}
       <section aria-labelledby="promotions-title">
           <div className="flex items-center justify-between mb-6">
                <h3 id="promotions-title" className="text-slate-800 dark:text-white font-bold text-2xl flex items-center gap-2">
                    <Award className="text-lavender-600 dark:text-lavender-400" size={24} />
                    More Offers
                </h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {PROMOTIONS.map((promo) => (
                   <Link 
                        to={getPromoLink(promo.id)} 
                        key={promo.id} 
                        className={`relative overflow-hidden rounded-2xl p-8 group transition-all duration-300 hover:scale-[1.03] shadow-lg hover:shadow-2xl cursor-pointer block focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-lavender-400 dark:focus:ring-offset-navy-900 bg-gradient-to-br ${promo.gradient}`}
                        aria-label={`Promotion: ${promo.title}`}
                   >
                       {/* Background Pattern */}
                       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                       
                       <div className="relative z-10 h-full flex flex-col justify-between">
                           <div>
                               <h4 className="text-2xl font-black mb-3 text-white drop-shadow-md tracking-tight">{promo.title}</h4>
                               <p className="text-sm text-white/90 font-medium leading-relaxed drop-shadow-sm">{promo.description}</p>
                           </div>
                           <div className="mt-8 flex items-center justify-between">
                               <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 group-hover:bg-white/30 transition-colors">
                                   {promo.action} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                               </span>
                           </div>
                       </div>
                   </Link>
               ))}
           </div>
       </section>

    </div>
  );
};
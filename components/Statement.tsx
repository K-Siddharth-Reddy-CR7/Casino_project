import React, { useState } from 'react';
import { Transaction } from '../types';
import { ArrowUpRight, ArrowDownLeft, Trophy, MinusCircle, Wallet, BrainCircuit, Filter, PieChart, TrendingUp, Dice5, CircleDollarSign, ArrowUp } from 'lucide-react';
import { analyzePlayerHistory } from '../services/geminiService';

interface StatementProps {
  history: Transaction[];
}

type FilterType = 'all' | 'win' | 'loss' | 'banking';

export const Statement: React.FC<StatementProps> = ({ history }) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Derived Stats
  const reversedHistory = [...history].reverse();
  const filteredHistory = reversedHistory.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'banking') return tx.type === 'deposit' || tx.type === 'withdrawal';
    return tx.type === filter;
  });

  const totalWins = history.filter(tx => tx.type === 'win').length;
  const totalLosses = history.filter(tx => tx.type === 'loss').length;
  const winRate = totalWins + totalLosses > 0 ? Math.round((totalWins / (totalWins + totalLosses)) * 100) : 0;
  
  const netProfit = history.reduce((acc, tx) => {
    if (tx.type === 'win') return acc + tx.amount;
    if (tx.type === 'loss') return acc + tx.amount; // amount is negative
    return acc;
  }, 0);

  // Per Game Stats Calculation
  const getGameStats = (gameName: string) => {
      const gameTx = history.filter(tx => tx.description.includes(gameName));
      const wins = gameTx.filter(tx => tx.type === 'win').length;
      const losses = gameTx.filter(tx => tx.type === 'loss').length;
      const net = gameTx.reduce((acc, tx) => {
          return acc + (tx.type === 'win' || tx.type === 'loss' ? tx.amount : 0);
      }, 0);
      return { wins, losses, net };
  };

  const blackjackStats = getGameStats('Blackjack');
  const slotsStats = getGameStats('Slots');
  const diceStats = getGameStats('Dice');
  const highLowStats = getGameStats('HighLow');

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzePlayerHistory(history);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'win': return <Trophy className="text-green-500 dark:text-green-400" size={18} />;
      case 'loss': return <MinusCircle className="text-red-500 dark:text-red-400" size={18} />;
      case 'deposit': return <ArrowDownLeft className="text-lavender-500 dark:text-lavender-400" size={18} />;
      case 'withdrawal': return <ArrowUpRight className="text-orange-500 dark:text-orange-400" size={18} />;
      default: return <Wallet className="text-gray-400" size={18} />;
    }
  };

  const getAmountColor = (type: string, amount: number) => {
      if (type === 'loss' || type === 'withdrawal' || amount < 0) return 'text-red-500 dark:text-red-400';
      if (type === 'win' || type === 'deposit') return 'text-green-600 dark:text-green-400';
      return 'text-slate-800 dark:text-white';
  };

  const renderGameCard = (title: string, icon: React.ReactNode, stats: { wins: number, losses: number, net: number }) => (
      <div className="bg-white dark:bg-navy-800/30 p-4 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400 text-xs font-bold uppercase">
              {icon} {title}
          </div>
          <div className={`text-xl font-black ${stats.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {stats.net >= 0 ? '+' : ''}{stats.net.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </div>
          <div className="text-xs text-slate-500 dark:text-gray-500">
              W: {stats.wins} | L: {stats.losses}
          </div>
      </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Financial Statement</h2>
           <p className="text-slate-500 dark:text-gray-400">Track your performance and banking history.</p>
        </div>
        <button 
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-lavender-600 hover:from-indigo-500 hover:to-lavender-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? <BrainCircuit className="animate-spin" /> : <BrainCircuit />}
          {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
        </button>
      </div>

      {/* AI Analysis Result */}
      {analysis && (
        <div className="bg-white dark:bg-gradient-to-r dark:from-navy-800 dark:to-navy-900 border border-lavender-500/30 p-6 rounded-2xl animate-in zoom-in duration-300 relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <BrainCircuit size={100} className="text-slate-900 dark:text-white" />
          </div>
          <div className="relative z-10 flex gap-4">
            <div className="min-w-[50px] h-[50px] bg-lavender-500/20 rounded-full flex items-center justify-center">
              <BrainCircuit className="text-lavender-600 dark:text-lavender-400" size={24} />
            </div>
            <div>
              <h4 className="text-lavender-600 dark:text-lavender-400 font-bold uppercase tracking-wider text-sm mb-2">Pit Boss Insight</h4>
              <p className="text-slate-700 dark:text-gray-200 leading-relaxed italic">"{analysis}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white dark:bg-navy-800/50 p-6 rounded-2xl border border-slate-200 dark:border-white/5 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-lavender-500/10 rounded-lg text-lavender-600 dark:text-lavender-400"><PieChart size={20}/></div>
               <span className="text-slate-500 dark:text-gray-400 text-sm font-bold uppercase">Net Profit/Loss</span>
            </div>
            <div className={`text-3xl font-black ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
               {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>
         </div>

         <div className="bg-white dark:bg-navy-800/50 p-6 rounded-2xl border border-slate-200 dark:border-white/5 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400"><TrendingUp size={20}/></div>
               <span className="text-slate-500 dark:text-gray-400 text-sm font-bold uppercase">Win Rate</span>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
               {winRate}%
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">{totalWins} Wins / {totalLosses} Losses</p>
         </div>

         <div className="bg-white dark:bg-navy-800/50 p-6 rounded-2xl border border-slate-200 dark:border-white/5 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400"><Filter size={20}/></div>
               <span className="text-slate-500 dark:text-gray-400 text-sm font-bold uppercase">Transactions</span>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
               {history.length}
            </div>
         </div>
      </div>

      {/* Per Game Performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {renderGameCard('Blackjack', <div className="relative inline-block"><Dice5 size={14} /><div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></div></div>, blackjackStats)}
          {renderGameCard('Slots', <CircleDollarSign size={14} />, slotsStats)}
          {renderGameCard('Dice', <Dice5 size={14} className="rotate-45" />, diceStats)}
          {renderGameCard('High-Low', <ArrowUp size={14} />, highLowStats)}
      </div>

      {/* Main Table Section */}
      <div className="bg-white dark:bg-navy-800/30 backdrop-blur-sm border border-slate-200 dark:border-navy-700 rounded-2xl overflow-hidden shadow-xl">
        
        {/* Filter Tabs */}
        <div className="flex border-b border-slate-200 dark:border-navy-700 overflow-x-auto">
            {(['all', 'win', 'loss', 'banking'] as const).map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-8 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                        filter === f 
                        ? 'bg-slate-100 dark:bg-navy-800 text-slate-900 dark:text-white border-b-2 border-lavender-500' 
                        : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                >
                    {f === 'banking' ? 'Deposits/Withdrawals' : f + 's'}
                </button>
            ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-navy-900/50 text-slate-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-6 font-semibold">Type</th>
                <th className="p-6 font-semibold">Description</th>
                <th className="p-6 font-semibold">Date</th>
                <th className="p-6 font-semibold text-right">Amount</th>
                <th className="p-6 font-semibold text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-navy-700/50">
              {filteredHistory.length === 0 ? (
                 <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 dark:text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                            <Filter size={40} className="opacity-20" />
                            <p>No transactions found for this filter.</p>
                        </div>
                    </td>
                 </tr>
              ) : (
                filteredHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                        <td className="p-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-white/5`}>
                                    {getIcon(tx.type)}
                                </div>
                                <span className="capitalize font-bold text-slate-700 dark:text-gray-300 text-sm">{tx.type}</span>
                            </div>
                        </td>
                        <td className="p-6 text-slate-600 dark:text-gray-300 font-medium">{tx.description}</td>
                        <td className="p-6 text-slate-400 dark:text-gray-500 text-sm font-mono">{tx.date}</td>
                        <td className={`p-6 text-right font-bold font-mono text-lg ${getAmountColor(tx.type, tx.amount)}`}>
                            {tx.amount > 0 && tx.type !== 'loss' && tx.type !== 'withdrawal' ? '+' : ''}
                            {tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </td>
                        <td className="p-6 text-right font-mono text-slate-500 dark:text-gray-400">
                            {tx.balanceAfter.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { ADMIN_SECRET_KEY } from '../constants';
import { PlayerStats, UserProfile } from '../types';
import { Shield, Lock, Database, Search, User, CreditCard, Activity, X, Eye, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DatabaseRecord {
  profile: UserProfile;
  stats: PlayerStats;
}

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [dbData, setDbData] = useState<DatabaseRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<DatabaseRecord | null>(null);

  // Load Data from LocalStorage
  useEffect(() => {
    if (isAuthenticated) {
      const loadDB = () => {
        try {
          const rawData = localStorage.getItem('neon_vegas_users');
          if (rawData) {
            const parsed = JSON.parse(rawData);
            // Convert Map-like object to Array
            const records: DatabaseRecord[] = Object.values(parsed);
            setDbData(records);
          }
        } catch (e) {
          console.error("Failed to load DB", e);
        }
      };
      loadDB();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessKey === ADMIN_SECRET_KEY) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid Security Key. Access Denied.');
    }
  };

  const filteredUsers = dbData.filter(record => 
    record.profile.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    record.profile.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLiability = dbData.reduce((acc, curr) => acc + curr.stats.balance, 0);
  const totalTransactions = dbData.reduce((acc, curr) => acc + curr.stats.history.length, 0);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-red-900/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Scanline effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
              <Shield size={32} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-widest uppercase">Restricted Access</h1>
            <p className="text-red-400 text-xs font-mono mb-8">Database Administrator Clearance Required</p>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-slate-500" size={18} />
                <input 
                  type="password" 
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white font-mono focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder-slate-600"
                  placeholder="Enter Security Key"
                />
              </div>
              {error && <p className="text-red-500 text-xs font-mono text-center animate-pulse">{error}</p>}
              <button 
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors font-mono uppercase tracking-wider"
              >
                Authenticate
              </button>
            </form>

            <Link 
                to="/" 
                className="mt-6 flex items-center gap-2 text-slate-500 hover:text-red-400 text-sm transition-colors font-mono"
            >
                <ArrowLeft size={16} /> Return to Casino
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10 font-sans transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-indigo-600 rounded-lg">
                <Database className="text-white" size={24} />
             </div>
             <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Administrator</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono uppercase">Database Management Console</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm flex items-center gap-2 transition-colors"
              >
                  <ArrowLeft size={16} /> Back to Dashboard
              </Link>
              <button 
                onClick={() => setIsAuthenticated(false)}
                className="px-4 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors text-sm font-bold uppercase tracking-wider"
              >
                End Session
              </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                 <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">Total Users</p>
                 <h2 className="text-3xl font-black text-slate-900 dark:text-white">{dbData.length}</h2>
              </div>
              <User className="text-indigo-500" size={32} />
           </div>

           <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                 <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">System Liability (User Balances)</p>
                 <h2 className="text-3xl font-black text-slate-900 dark:text-white">${totalLiability.toLocaleString()}</h2>
              </div>
              <CreditCard className="text-green-500" size={32} />
           </div>

           <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                 <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">Total Activity (Tx)</p>
                 <h2 className="text-3xl font-black text-slate-900 dark:text-white">{totalTransactions.toLocaleString()}</h2>
              </div>
              <Activity className="text-orange-500" size={32} />
           </div>
        </div>

        {/* User Database Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
           <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                 <User size={18} /> Registered Users
              </h3>
              <div className="relative w-full md:w-64">
                 <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                 <input 
                   type="text" 
                   placeholder="Search username or email..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                 />
              </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                   <th className="p-4 font-semibold">User</th>
                   <th className="p-4 font-semibold">Email</th>
                   <th className="p-4 font-semibold">Balance</th>
                   <th className="p-4 font-semibold">Record (W/L)</th>
                   <th className="p-4 font-semibold text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {filteredUsers.map((user, idx) => (
                   <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                     <td className="p-4">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                           {user.profile.username.substring(0, 2).toUpperCase()}
                         </div>
                         <span className="font-bold text-slate-700 dark:text-slate-200">{user.profile.username}</span>
                       </div>
                     </td>
                     <td className="p-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{user.profile.email}</td>
                     <td className="p-4 font-mono font-bold text-slate-800 dark:text-white">${user.stats.balance.toLocaleString()}</td>
                     <td className="p-4 text-sm">
                        <span className="text-green-500 font-bold">{user.stats.wins}W</span>
                        <span className="text-slate-300 mx-2">/</span>
                        <span className="text-red-500 font-bold">{user.stats.losses}L</span>
                     </td>
                     <td className="p-4 text-right">
                        <button 
                          onClick={() => setSelectedUser(user)}
                          className="bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 ml-auto transition-colors"
                        >
                           <Eye size={14} /> View Data
                        </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
              
              <div className="p-6 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{selectedUser.profile.username}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{selectedUser.profile.email}</p>
                    {selectedUser.profile.password && (
                        <p className="text-xs text-red-400 mt-2 font-mono bg-red-500/10 inline-block px-2 py-1 rounded">
                           Pwd: {selectedUser.profile.password} (Insecure/Simulated)
                        </p>
                    )}
                 </div>
                 <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-white">
                    <X size={20} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-0">
                 <div className="sticky top-0 bg-white dark:bg-slate-900 p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Transaction History ({selectedUser.stats.history.length})
                 </div>
                 <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[...selectedUser.stats.history].reverse().map((tx) => (
                       <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div>
                             <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{tx.description}</p>
                             <p className="text-xs text-slate-400 font-mono">{tx.date}</p>
                          </div>
                          <div className={`text-right font-mono font-bold ${
                             tx.type === 'win' || tx.type === 'deposit' ? 'text-green-500' : 'text-red-500'
                          }`}>
                             {tx.amount > 0 && tx.type !== 'loss' && tx.type !== 'withdrawal' ? '+' : ''}
                             {tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </div>
                       </div>
                    ))}
                    {selectedUser.stats.history.length === 0 && (
                        <div className="p-8 text-center text-slate-400 italic">No activity recorded.</div>
                    )}
                 </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                 User ID hash: {btoa(selectedUser.profile.email).substring(0, 12)}
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
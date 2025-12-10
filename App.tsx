import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { INITIAL_BALANCE } from './constants';
import { PlayerStats, Transaction, UserProfile } from './types';
import { Blackjack } from './components/games/Blackjack';
import { SlotMachine } from './components/games/SlotMachine';
import { DiceGame } from './components/games/DiceGame';
import { HighLow } from './components/games/HighLow';
import { Aviator } from './components/games/Aviator';
import { Dashboard } from './components/Dashboard';
import { PitBossChat } from './components/PitBossChat';
import { Statement } from './components/Statement';
import { AdminPanel } from './components/AdminPanel';
import { Auth } from './components/Auth';
import { Banking } from './components/Banking';
import { LayoutDashboard, Menu, ShieldCheck, LogOut, FileText, Sun, Moon, ArrowLeft, CreditCard, Rocket } from 'lucide-react';

const STORAGE_KEY_USERS = 'neon_vegas_users';
const STORAGE_KEY_SESSION = 'neon_vegas_session';
const STORAGE_KEY_THEME = 'neon_vegas_theme';

const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    
    return (
        <Link 
            to={to} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                ? 'bg-lavender-100 dark:bg-navy-800 text-lavender-600 dark:text-lavender-400 border-l-4 border-lavender-500' 
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
        >
            <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {icon}
            </div>
            <span className="font-medium">{label}</span>
        </Link>
    );
}

const BackButton = () => {
    const location = useLocation();
    if (location.pathname === '/' || location.pathname === '/admin') return null;
    
    return (
        <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-slate-500 dark:text-gray-400 hover:text-lavender-600 dark:hover:text-lavender-400 mb-6 transition-colors font-medium animate-in slide-in-from-left-2"
        >
            <ArrowLeft size={20} />
            Back to Dashboard
        </Link>
    );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  
  const [stats, setStats] = useState<PlayerStats>({
        balance: INITIAL_BALANCE,
        wins: 0,
        losses: 0,
        history: [],
        user: { username: 'Player', email: '' }
  });

  // --- Theme Logic ---
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
    } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      localStorage.setItem(STORAGE_KEY_THEME, newMode ? 'dark' : 'light');
      if (newMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  };

  // --- Backend Simulation Logic ---

  // Helper to get DB safely
  const getDB = () => {
    try {
        const dbStr = localStorage.getItem(STORAGE_KEY_USERS);
        return dbStr ? JSON.parse(dbStr) : {};
    } catch (e) {
        console.error("Failed to parse DB", e);
        return {};
    }
  };

  const saveUserData = (email: string, currentStats: PlayerStats) => {
      const db = getDB();
      const existingUser = db[email] || {};
      
      // We must merge to ensure we don't overwrite password with undefined if currentStats.user lacks it (though it shouldn't)
      db[email] = {
          ...existingUser,
          stats: {
              balance: currentStats.balance,
              wins: currentStats.wins,
              losses: currentStats.losses,
              history: currentStats.history
          },
          profile: {
              ...existingUser.profile,
              ...currentStats.user // updates username if changed
          }
      };
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(db));
  };

  const loadUserData = (email: string) => {
      const db = getDB();
      const userData = db[email];
      if (userData) {
          setStats({
              balance: userData.stats.balance,
              wins: userData.stats.wins,
              losses: userData.stats.losses,
              history: userData.stats.history || [],
              user: userData.profile
          });
          setCurrentUserEmail(email);
          setIsAuthenticated(true);
      }
  };

  // Sync with DB when window focuses (to catch Admin updates)
  useEffect(() => {
      const handleFocus = () => {
          if (currentUserEmail) {
              loadUserData(currentUserEmail);
          }
      };
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
  }, [currentUserEmail]);


  // Inject Universal User if not exists
  useEffect(() => {
      const db = getDB();
      const universalEmail = 'ksr@gmail.com';
      
      if (!db[universalEmail]) {
          console.log("Injecting Universal Access User...");
          db[universalEmail] = {
              profile: {
                  username: 'sid',
                  email: universalEmail,
                  password: 'kkkkkkk1'
              },
              stats: {
                  balance: 5000,
                  wins: 0,
                  losses: 0,
                  history: [{
                      id: 'genesis',
                      type: 'deposit',
                      amount: 5000,
                      date: new Date().toLocaleString(),
                      description: 'Universal Access Bonus',
                      balanceAfter: 5000,
                      status: 'approved'
                  }]
              }
          };
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(db));
      }
  }, []);

  // Load Session on Mount
  useEffect(() => {
    const sessionEmail = localStorage.getItem(STORAGE_KEY_SESSION);
    if (sessionEmail) {
        loadUserData(sessionEmail);
    }
  }, []);

  // Save Data whenever stats change (if logged in)
  useEffect(() => {
      if (currentUserEmail && isAuthenticated) {
          saveUserData(currentUserEmail, stats);
      }
  }, [stats, currentUserEmail, isAuthenticated]);

  const handleLogin = (user: UserProfile) => {
      const db = getDB();
      const existingUser = db[user.email];

      if (!existingUser) {
          throw new Error("User not found. Please create an account.");
      }
      if (existingUser.profile.password !== user.password) {
          throw new Error("Invalid password.");
      }

      // Success
      localStorage.setItem(STORAGE_KEY_SESSION, user.email);
      loadUserData(user.email);
  };

  const handleSignup = (user: UserProfile) => {
      const db = getDB();
      if (db[user.email]) {
          throw new Error("Email already registered. Please sign in.");
      }

      // Initialize new user
      const newStats: PlayerStats = {
          balance: INITIAL_BALANCE,
          wins: 0,
          losses: 0,
          history: [],
          user: user
      };

      // Force save to DB immediately
      db[user.email] = {
        stats: {
            balance: newStats.balance,
            wins: newStats.wins,
            losses: newStats.losses,
            history: newStats.history
        },
        profile: user
      };
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(db));
      
      // Auto Login
      localStorage.setItem(STORAGE_KEY_SESSION, user.email);
      loadUserData(user.email);
  };

  const handleDemoLogin = () => {
    const demoId = Date.now().toString().slice(-4);
    const demoEmail = `guest_${demoId}@neonvegas.demo`;
    
    const demoUser: UserProfile = {
        username: `Guest Player ${demoId}`,
        email: demoEmail,
        password: 'demo' // placeholder
    };

    const newStats: PlayerStats = {
        balance: 0, // STRICTLY ZERO BALANCE
        wins: 0,
        losses: 0,
        history: [{
            id: 'demo-init',
            type: 'deposit', // Just a placeholder type
            amount: 0,
            date: new Date().toLocaleString(),
            description: 'Demo Account Created',
            balanceAfter: 0,
            status: 'approved'
        }],
        user: demoUser
    };

    const db = getDB();
    db[demoEmail] = {
        stats: newStats,
        profile: demoUser
    };
    
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(db));
    localStorage.setItem(STORAGE_KEY_SESSION, demoEmail);
    loadUserData(demoEmail);
  };

  const handleLogout = () => {
    // Force save before logout to ensure latest state is captured
    if (currentUserEmail) {
        saveUserData(currentUserEmail, stats);
    }

    localStorage.removeItem(STORAGE_KEY_SESSION);
    setIsAuthenticated(false);
    setCurrentUserEmail(null);
    setStats({
        balance: INITIAL_BALANCE,
        wins: 0,
        losses: 0,
        history: [],
        user: { username: 'Guest', email: '' }
    });
  };

  // --- Game Logic ---

  const updateBalance = (amount: number, gameName: string = 'Game') => {
    setStats(prev => {
        const newBalance = prev.balance + amount;
        const type = amount > 0 ? 'win' : 'loss';
        const newTx: Transaction = {
            id: Date.now().toString(),
            type: type,
            amount: amount,
            date: new Date().toLocaleString(),
            description: `${gameName} ${type === 'win' ? 'Payout' : 'Bet'}`,
            balanceAfter: newBalance,
            status: 'approved' // Game transactions auto-approved
        };

        return {
            ...prev,
            balance: newBalance,
            wins: amount > 0 ? prev.wins + 1 : prev.wins,
            losses: amount < 0 ? prev.losses + 1 : prev.losses,
            history: [...prev.history, newTx]
        };
    });
  };

  const handleBankingRequest = (type: 'deposit' | 'withdrawal', amount: number, details: any) => {
      setStats(prev => {
          let newBalance = prev.balance;
          
          if (type === 'withdrawal') {
              // Deduct from balance immediately (Escrow)
              newBalance -= amount;
          }
          // Deposits do NOT update balance until approved

          const newTx: Transaction = {
              id: Date.now().toString(),
              type: type,
              amount: type === 'withdrawal' ? -amount : amount,
              date: new Date().toLocaleString(),
              description: type === 'deposit' ? 'Deposit Request' : 'Withdrawal Request',
              balanceAfter: newBalance, // Snapshot
              status: 'pending',
              transactionRef: details.transactionRef,
              bankDetails: details.bankDetails
          };

          const updatedUser: UserProfile = {
              ...prev.user,
              savedBankDetails: details.bankDetails // Update saved details
          };

          return {
              ...prev,
              balance: newBalance,
              user: updatedUser,
              history: [...prev.history, newTx]
          };
      });
  };

  return (
    <HashRouter>
      <div className={`min-h-screen font-sans selection:bg-lavender-400 selection:text-black transition-colors duration-300 ${isDarkMode ? 'dark bg-[#020617] text-gray-100' : 'bg-slate-50 text-slate-900'}`}>
        
        <Routes>
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="*" element={
                !isAuthenticated ? (
                    <Auth onLogin={handleLogin} onSignup={handleSignup} onDemoLogin={handleDemoLogin} />
                ) : (
                    <>
                        {/* Navigation / Sidebar (Desktop) */}
                        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-[#0a1020] border-r border-slate-200 dark:border-white/5 hidden md:flex flex-col z-20 transition-colors duration-300">
                            <div className="p-8 flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white cursor-pointer">
                                        NEON<span className="text-lavender-600 dark:text-lavender-400">VEGAS</span>
                                    </h1>
                                    <p className="text-xs text-slate-500 dark:text-gray-500 mt-1 uppercase tracking-wider">Premium Gaming</p>
                                </div>
                            </div>
                            
                            <nav className="flex-1 px-4 space-y-2">
                                <NavLink to="/" icon={<LayoutDashboard size={20}/>} label="Dashboard" />
                                <NavLink to="/statement" icon={<FileText size={20}/>} label="Statement" />
                                <NavLink to="/banking" icon={<CreditCard size={20}/>} label="Banking" />
                                <div className="pt-6 pb-2 px-4 text-xs font-bold text-slate-400 dark:text-gray-600 uppercase tracking-widest">Games</div>
                                <NavLink to="/blackjack" icon={<span className="text-xl">🃏</span>} label="Blackjack" />
                                <NavLink to="/slots" icon={<span className="text-xl">🎰</span>} label="Mega Slots" />
                                <NavLink to="/dice" icon={<span className="text-xl">🎲</span>} label="Neon Dice" />
                                <NavLink to="/highlow" icon={<span className="text-xl">🔼</span>} label="High-Low" />
                                <NavLink to="/aviator" icon={<Rocket size={20} />} label="Aviator" />
                            </nav>

                            <div className="p-6 border-t border-slate-200 dark:border-white/5 space-y-4">
                                {/* Theme Toggle */}
                                <button 
                                    onClick={toggleTheme}
                                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-600 dark:text-gray-400"
                                >
                                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                                    <span className="font-medium text-sm">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                                </button>

                                <div className="bg-slate-100 dark:bg-navy-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-inner">
                                    <p className="text-xs text-slate-500 dark:text-gray-500 mb-1 font-bold uppercase">Balance</p>
                                    <p className="text-2xl font-bold text-lavender-600 dark:text-lavender-400">${stats.balance.toLocaleString()}</p>
                                </div>
                                <button 
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-500 hover:text-red-500 dark:hover:text-white transition-colors w-full px-2"
                                >
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        </aside>

                        {/* Mobile Header */}
                        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-[#0a1020] border-b border-slate-200 dark:border-white/5 sticky top-0 z-30 shadow-sm transition-colors duration-300">
                            <h1 className="text-xl font-bold text-lavender-600 dark:text-lavender-400">NV</h1>
                            <div className="flex items-center gap-4">
                                <button onClick={toggleTheme} className="text-slate-600 dark:text-gray-400">
                                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                                </button>
                                <span className="font-mono text-slate-800 dark:text-lavender-400 font-bold">${stats.balance}</span>
                                <button className="text-slate-800 dark:text-white"><Menu /></button>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <main className="md:ml-64 min-h-screen p-4 md:p-8 pt-6 bg-slate-50 dark:bg-[#020617] relative transition-colors duration-300">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
                            
                            <div className="max-w-7xl mx-auto relative z-10">
                                <BackButton />
                                <Routes>
                                    <Route path="/" element={
                                        <Dashboard 
                                            stats={stats} 
                                            onDeposit={() => {}} 
                                            onWithdraw={() => {}} 
                                        />
                                    } />
                                    <Route path="/statement" element={<Statement history={stats.history} />} />
                                    <Route path="/banking" element={
                                        <Banking 
                                            balance={stats.balance} 
                                            savedBankDetails={stats.user.savedBankDetails}
                                            onRequestTransaction={handleBankingRequest} 
                                        />
                                    } />
                                    <Route path="/blackjack" element={
                                        <div className="animate-in fade-in zoom-in duration-500">
                                            <div className="mb-8 text-center">
                                                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Blackjack Royale</h2>
                                                <p className="text-slate-500 dark:text-gray-400">Beat the dealer to 21. Pays 3:2.</p>
                                            </div>
                                            <Blackjack onGameEnd={(amt) => updateBalance(amt, 'Blackjack')} balance={stats.balance} />
                                        </div>
                                    } />
                                    <Route path="/slots" element={
                                        <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                                            <SlotMachine onGameEnd={(amt) => updateBalance(amt, 'Slots')} balance={stats.balance} />
                                        </div>
                                    } />
                                    <Route path="/dice" element={
                                        <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                                            <DiceGame onGameEnd={(amt) => updateBalance(amt, 'Dice')} balance={stats.balance} />
                                        </div>
                                    } />
                                    <Route path="/highlow" element={
                                        <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                                            <HighLow onGameEnd={(amt) => updateBalance(amt, 'HighLow')} balance={stats.balance} />
                                        </div>
                                    } />
                                    <Route path="/aviator" element={
                                        <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                                            <div className="mb-8 text-center">
                                                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Aviator</h2>
                                                <p className="text-slate-500 dark:text-gray-400">Cashout before the plane flies away!</p>
                                            </div>
                                            <Aviator onGameEnd={(amt) => updateBalance(amt, 'Aviator')} balance={stats.balance} />
                                        </div>
                                    } />
                                </Routes>
                            </div>
                        </main>

                        <PitBossChat />

                        {/* Responsible Gaming Footer */}
                        <footer className="md:ml-64 p-8 border-t border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-[#0a1020] text-center mt-auto transition-colors duration-300">
                            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-2">
                                <ShieldCheck size={16} />
                                <span className="font-bold">Responsible Gaming</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-600 max-w-2xl mx-auto leading-relaxed">
                                NeonVegas is a simulation for entertainment purposes only. No real money gambling occurs on this site. 
                            </p>
                        </footer>

                        {/* Mobile Nav Bar (Bottom) */}
                        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0a1020] border-t border-slate-200 dark:border-white/10 flex justify-around p-4 z-40 pb-6 transition-colors duration-300">
                            <Link to="/" className="text-slate-400 dark:text-gray-400 hover:text-lavender-600 dark:hover:text-lavender-400 p-2"><LayoutDashboard /></Link>
                            <Link to="/banking" className="text-slate-400 dark:text-gray-400 hover:text-lavender-600 dark:hover:text-lavender-400 p-2"><CreditCard /></Link>
                            <Link to="/blackjack" className="text-slate-400 dark:text-gray-400 hover:text-lavender-600 dark:hover:text-lavender-400 p-2"><span className="text-xl">🃏</span></Link>
                            <Link to="/aviator" className="text-slate-400 dark:text-gray-400 hover:text-lavender-600 dark:hover:text-lavender-400 p-2"><Rocket /></Link>
                        </div>
                    </>
                )
            } />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
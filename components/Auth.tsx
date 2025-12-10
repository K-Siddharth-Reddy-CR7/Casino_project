import React, { useState } from 'react';
import { User, Lock, ArrowRight, Mail, AlertCircle, Gamepad2 } from 'lucide-react';
import { UserProfile } from '../types';
import { Link } from 'react-router-dom';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
  onSignup: (user: UserProfile) => void;
  onDemoLogin?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onSignup, onDemoLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (pwd: string) => {
    // Min 8 chars, at least 1 number
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(pwd);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!validateEmail(email)) {
        setError("Please enter a valid email address.");
        return;
    }
    if (!validatePassword(password)) {
        setError("Password must be at least 8 characters and contain a number.");
        return;
    }
    if (!isLogin && username.length < 3) {
        setError("Username must be at least 3 characters long.");
        return;
    }

    setIsLoading(true);

    // Simulate Network Delay and mock DB logic
    setTimeout(() => {
      setIsLoading(false);
      
      const userData: UserProfile = {
          username: isLogin ? 'User' : username, // Login will overwrite this from DB in App.tsx
          email: email,
          password: password 
      };

      try {
        if (isLogin) {
            onLogin(userData);
        } else {
            onSignup(userData);
        }
      } catch (err: any) {
          setError(err.message || "Authentication failed");
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] flex items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative overflow-hidden transition-colors duration-300">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-lavender-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md mx-auto bg-white/80 dark:bg-navy-800/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-in zoom-in duration-500 z-10 transition-colors">
          
          <div className="text-center mb-8">
                <h1 className="text-5xl font-bold text-slate-900 dark:text-white tracking-tighter mb-2">
                    NEON<span className="text-lavender-600 dark:text-lavender-400">VEGAS</span>
                </h1>
                <p className="text-slate-500 dark:text-gray-500 uppercase tracking-widest text-xs font-bold">Premium Social Gaming</p>
          </div>

          <div className="relative z-10">
            {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {!isLogin && (
                  <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                    <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase ml-1">Username</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-lavender-500 dark:group-focus-within:text-lavender-400 transition-colors">
                        <User size={18} />
                      </div>
                      <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-navy-900/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500 transition-all"
                        placeholder="Create a username"
                      />
                    </div>
                  </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase ml-1">Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-lavender-500 dark:group-focus-within:text-lavender-400 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-navy-900/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500 transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-lavender-500 dark:group-focus-within:text-lavender-400 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-navy-900/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500 transition-all"
                    placeholder="Min 8 chars, 1 number"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-lavender-600 hover:bg-lavender-700 dark:bg-lavender-500 dark:hover:bg-lavender-600 text-white font-bold py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6"
              >
                {isLoading ? (
                   <span className="animate-pulse">Connecting...</span>
                ) : (
                   <>
                     {isLogin ? 'ENTER CASINO' : 'CREATE PROFILE'} <ArrowRight size={20} />
                   </>
                )}
              </button>
            </form>

            <div className="mt-4 border-t border-slate-200 dark:border-white/5 pt-4">
                {onDemoLogin && (
                    <button 
                        onClick={onDemoLogin}
                        className="w-full border-2 border-dashed border-slate-300 dark:border-white/10 text-slate-500 dark:text-gray-400 font-bold py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <Gamepad2 size={18} /> Demo Login
                    </button>
                )}
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {isLogin ? "Don't have an account?" : "Already a member?"}
                <button 
                  onClick={() => { setIsLogin(!isLogin); setError(null); }}
                  className="ml-2 text-lavender-600 dark:text-lavender-400 font-bold hover:text-lavender-700 dark:hover:text-lavender-300 transition-colors"
                >
                  {isLogin ? 'Join Now' : 'Sign In'}
                </button>
              </p>
            </div>

            <div className="mt-4 text-center">
                <Link to="/admin" className="text-[10px] text-gray-400 hover:text-lavender-500 flex items-center justify-center gap-1">
                    <Lock size={10} /> Admin Panel
                </Link>
            </div>
          </div>
      </div>
    </div>
  );
};
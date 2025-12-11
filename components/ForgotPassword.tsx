import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, ShieldQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';
import { STORAGE_KEY_RESETS } from '../constants';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    setTimeout(() => {
        try {
            // 1. Check if user exists
            const dbStr = localStorage.getItem('neon_vegas_users');
            const db = dbStr ? JSON.parse(dbStr) : {};
            
            if (!db[email]) {
                setMessage({ type: 'error', text: 'No account found with this email address.' });
                setIsLoading(false);
                return;
            }

            // 2. Create Reset Request
            const requestsStr = localStorage.getItem(STORAGE_KEY_RESETS);
            const requests = requestsStr ? JSON.parse(requestsStr) : [];

            // Check if already pending
            const existing = requests.find((r: any) => r.email === email && r.status === 'pending');
            if (existing) {
                setMessage({ type: 'success', text: 'A request is already pending for this email. Admin is reviewing it.' });
                setIsLoading(false);
                return;
            }

            const newRequest = {
                id: Date.now().toString(),
                email: email,
                date: new Date().toLocaleString(),
                status: 'pending'
            };

            requests.push(newRequest);
            localStorage.setItem(STORAGE_KEY_RESETS, JSON.stringify(requests));

            setMessage({ 
                type: 'success', 
                text: 'Request submitted! An admin will review your account. Once approved, your password will be reset to match your email address.' 
            });

        } catch (e) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative overflow-hidden">
        
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
             <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px]"></div>
             <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-lavender-500/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-3xl p-8 shadow-2xl relative z-10 animate-in zoom-in duration-300">
            
            <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm font-bold transition-colors">
                <ArrowLeft size={16} /> Back to Sign In
            </Link>

            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                    <ShieldQuestion size={32} className="text-indigo-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Account Recovery</h1>
                <p className="text-slate-400 text-sm">Enter your registered email address to request a password reset from the administrator.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 border ${
                    message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
                    <p className="text-sm font-medium leading-relaxed">{message.text}</p>
                </div>
            )}

            {!message?.text.includes('submitted') && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Registered Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                <Mail size={18} />
                            </div>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? 'Submitting Request...' : 'Send Request'}
                    </button>
                </form>
            )}

            {message?.type === 'success' && (
                <div className="mt-6 p-4 bg-slate-800 rounded-xl border border-slate-700 text-xs text-slate-400">
                    <p className="font-bold text-white mb-1">Important:</p>
                    <p>Once approved by the administrator, your password will be reset to match your <strong>email address</strong>.</p>
                </div>
            )}
        </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { BankDetails } from '../types';
import { CreditCard, Landmark, ArrowDownCircle, ArrowUpCircle, History, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface BankingProps {
  balance: number;
  savedBankDetails?: BankDetails;
  onRequestTransaction: (type: 'deposit' | 'withdrawal', amount: number, details: any) => void;
}

export const Banking: React.FC<BankingProps> = ({ balance, savedBankDetails, onRequestTransaction }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize from URL or default to deposit
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdrawal'>(
      searchParams.get('tab') === 'withdrawal' ? 'withdrawal' : 'deposit'
  );

  // Sync state if URL changes (e.g. navigation from dashboard)
  useEffect(() => {
      const tab = searchParams.get('tab');
      if (tab === 'withdrawal' || tab === 'deposit') {
          setActiveTab(tab);
      }
  }, [searchParams]);

  // Update URL when switching tabs manually
  const handleTabSwitch = (tab: 'deposit' | 'withdrawal') => {
      setActiveTab(tab);
      setSearchParams({ tab });
      setMessage(null);
  };

  const [amount, setAmount] = useState('');
  const [txRef, setTxRef] = useState(''); // For Deposits
  
  // Bank Details State
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');

  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (savedBankDetails) {
      setBankName(savedBankDetails.bankName || '');
      setAccountHolder(savedBankDetails.accountHolder || '');
      setAccountNumber(savedBankDetails.accountNumber || '');
      setRoutingNumber(savedBankDetails.routingNumber || '');
    }
  }, [savedBankDetails]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount.' });
      return;
    }

    if (activeTab === 'withdrawal' && val > balance) {
      setMessage({ type: 'error', text: 'Insufficient funds for withdrawal.' });
      return;
    }

    if (!bankName || !accountHolder || !accountNumber) {
        setMessage({ type: 'error', text: 'Please complete all bank details.' });
        return;
    }

    if (activeTab === 'deposit' && !txRef) {
        setMessage({ type: 'error', text: 'Transaction Reference ID is required for deposits.' });
        return;
    }

    const details: any = {
        bankDetails: {
            bankName,
            accountHolder,
            accountNumber,
            routingNumber
        }
    };

    if (activeTab === 'deposit') {
        details.transactionRef = txRef;
    }

    onRequestTransaction(activeTab, val, details);
    setMessage({ type: 'success', text: 'Request submitted successfully! Waiting for Admin approval.' });
    
    // Clear sensitive fields if needed, or keep for UX
    setAmount('');
    setTxRef('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       <div className="text-center mb-8">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">
              Secure <span className="text-lavender-600 dark:text-lavender-400">Banking</span>
          </h2>
          <p className="text-slate-500 dark:text-gray-400 max-w-lg mx-auto">
              Deposits and Withdrawals are processed manually by our administrators for security.
          </p>
       </div>

       <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
           
           {/* Sidebar / Tabs */}
           <div className="w-full md:w-1/3 bg-slate-50 dark:bg-navy-950 p-6 flex flex-col gap-2 border-r border-slate-200 dark:border-white/5">
               <button 
                  onClick={() => handleTabSwitch('deposit')}
                  className={`flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${
                      activeTab === 'deposit' 
                      ? 'bg-lavender-500 text-white shadow-lg shadow-lavender-500/30' 
                      : 'text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/5'
                  }`}
               >
                   <ArrowDownCircle size={24} />
                   <div className="text-left">
                       <div className="text-sm">Deposit</div>
                       <div className="text-[10px] opacity-80 font-normal">Add funds to wallet</div>
                   </div>
               </button>

               <button 
                  onClick={() => handleTabSwitch('withdrawal')}
                  className={`flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${
                      activeTab === 'withdrawal' 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                      : 'text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/5'
                  }`}
               >
                   <ArrowUpCircle size={24} />
                   <div className="text-left">
                       <div className="text-sm">Withdraw</div>
                       <div className="text-[10px] opacity-80 font-normal">Cash out to bank</div>
                   </div>
               </button>

               <div className="mt-auto bg-slate-200 dark:bg-navy-800 p-4 rounded-xl">
                   <p className="text-xs text-slate-500 dark:text-gray-400 uppercase font-bold mb-1">Available Balance</p>
                   <p className="text-2xl font-mono font-black text-slate-900 dark:text-white">${balance.toLocaleString()}</p>
               </div>
           </div>

           {/* Form Area */}
           <div className="flex-1 p-8 md:p-10">
               <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                   {activeTab === 'deposit' ? <ArrowDownCircle className="text-lavender-500" /> : <ArrowUpCircle className="text-indigo-500" />}
                   {activeTab === 'deposit' ? 'Deposit Request' : 'Withdrawal Request'}
               </h3>

               {message && (
                   <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${
                       message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                   }`}>
                       {message.type === 'success' ? <CheckCircle2 size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
                       <p className="text-sm font-medium">{message.text}</p>
                   </div>
               )}

               <form onSubmit={handleSubmit} className="space-y-6">
                   <div>
                       <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-400 mb-2">Amount</label>
                       <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-bold">$</span>
                           <input 
                               type="number"
                               value={amount}
                               onChange={(e) => setAmount(e.target.value)}
                               className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-xl py-4 pl-10 pr-4 text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500"
                               placeholder="0.00"
                           />
                       </div>
                   </div>

                   {activeTab === 'deposit' && (
                       <div>
                           <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-400 mb-2">Transaction Ref ID (UTR / Ref No)</label>
                           <input 
                               type="text"
                               value={txRef}
                               onChange={(e) => setTxRef(e.target.value)}
                               className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-slate-900 dark:text-white focus:outline-none focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500"
                               placeholder="e.g. 1234567890"
                           />
                           <p className="text-xs text-slate-400 mt-1">Please transfer funds to our admin account and enter the reference ID here.</p>
                       </div>
                   )}

                   <div className="pt-6 border-t border-slate-200 dark:border-white/10">
                       <h4 className="text-sm font-bold text-slate-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                           <Landmark size={18} /> Bank Details {activeTab === 'deposit' ? '(Your Account)' : '(For Payout)'}
                       </h4>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                               <label className="text-xs text-slate-500 dark:text-gray-500 font-bold uppercase">Account Holder</label>
                               <input 
                                   type="text"
                                   value={accountHolder}
                                   onChange={(e) => setAccountHolder(e.target.value)}
                                   className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500"
                                   placeholder="Full Name"
                               />
                           </div>
                           <div className="space-y-2">
                               <label className="text-xs text-slate-500 dark:text-gray-500 font-bold uppercase">Bank Name</label>
                               <input 
                                   type="text"
                                   value={bankName}
                                   onChange={(e) => setBankName(e.target.value)}
                                   className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500"
                                   placeholder="Bank Name"
                               />
                           </div>
                           <div className="space-y-2">
                               <label className="text-xs text-slate-500 dark:text-gray-500 font-bold uppercase">Account Number</label>
                               <input 
                                   type="text"
                                   value={accountNumber}
                                   onChange={(e) => setAccountNumber(e.target.value)}
                                   className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500"
                                   placeholder="XXXX-XXXX-XXXX"
                               />
                           </div>
                           <div className="space-y-2">
                               <label className="text-xs text-slate-500 dark:text-gray-500 font-bold uppercase">IFSC / Routing No</label>
                               <input 
                                   type="text"
                                   value={routingNumber}
                                   onChange={(e) => setRoutingNumber(e.target.value)}
                                   className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500"
                                   placeholder="Optional"
                               />
                           </div>
                       </div>
                   </div>

                   <button 
                       type="submit"
                       className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 ${
                           activeTab === 'deposit' 
                           ? 'bg-lavender-600 hover:bg-lavender-700' 
                           : 'bg-indigo-600 hover:bg-indigo-700'
                       }`}
                   >
                       {activeTab === 'deposit' ? 'Submit Deposit Request' : 'Request Withdrawal'}
                       <Lock size={18} />
                   </button>

               </form>
           </div>
       </div>

    </div>
  );
};
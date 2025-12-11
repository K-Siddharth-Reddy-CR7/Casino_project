import React, { useState } from 'react';
import { UserProfile, BankDetails } from '../types';
import { User, Lock, Mail, CreditCard, Save, CheckCircle2, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react';

interface MyAccountProps {
    user: UserProfile;
    onUpdateProfile: (updatedProfile: UserProfile) => void;
}

export const MyAccount: React.FC<MyAccountProps> = ({ user, onUpdateProfile }) => {
    // Edit Profile State
    const [username, setUsername] = useState(user.username);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // Change Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // Password Visibility State
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMessage(null);
        setIsSavingProfile(true);

        setTimeout(() => {
            if (username.length < 3) {
                setProfileMessage({ type: 'error', text: 'Username must be at least 3 characters long.' });
                setIsSavingProfile(false);
                return;
            }

            const updatedProfile = { ...user, username };
            onUpdateProfile(updatedProfile);
            setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
            setIsSavingProfile(false);
        }, 800);
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);

        // Simple validation
        if (currentPassword !== user.password) {
            setPasswordMessage({ type: 'error', text: 'Current password is incorrect.' });
            return;
        }
        if (newPassword.length < 8) {
             setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
             return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        setIsSavingPassword(true);

        setTimeout(() => {
            const updatedProfile = { ...user, password: newPassword };
            onUpdateProfile(updatedProfile);
            setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
            
            // Clear fields
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsSavingPassword(false);
        }, 1000);
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">My Account</h1>
                <p className="text-slate-500 dark:text-gray-400">Manage your profile, security settings, and view saved details.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Column: Profile & Banking */}
                <div className="space-y-8">
                    
                    {/* Profile Information Card */}
                    <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-white/5">
                            <User className="text-lavender-500" size={20} />
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Profile Details</h2>
                        </div>

                        {profileMessage && (
                            <div className={`p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-2 ${
                                profileMessage.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                                {profileMessage.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                                {profileMessage.text}
                            </div>
                        )}

                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-500 mb-1.5">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="email" 
                                        value={user.email} 
                                        disabled
                                        className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-slate-500 dark:text-gray-500 cursor-not-allowed text-sm"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-800">LOCKED</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-500 mb-1.5">Username</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        value={username} 
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500 text-sm"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSavingProfile}
                                className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold py-2.5 px-6 rounded-xl transition-colors text-sm flex items-center gap-2 mt-2"
                            >
                                {isSavingProfile ? 'Saving...' : <><Save size={16}/> Save Changes</>}
                            </button>
                        </form>
                    </div>

                    {/* Saved Banking Details Card */}
                    <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-white/5">
                            <CreditCard className="text-indigo-500" size={20} />
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Saved Withdrawal Info</h2>
                        </div>
                        
                        {user.savedBankDetails ? (
                            <div className="bg-slate-50 dark:bg-navy-800 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{user.savedBankDetails.bankName}</p>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">{user.savedBankDetails.accountHolder}</p>
                                    </div>
                                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded font-bold">ACTIVE</span>
                                </div>
                                <p className="font-mono text-slate-600 dark:text-slate-300 tracking-wider text-sm mt-2">
                                    {user.savedBankDetails.accountNumber}
                                </p>
                                <p className="text-xs text-slate-400 mt-1 font-mono">Routing: {user.savedBankDetails.routingNumber || 'N/A'}</p>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 dark:text-gray-500 text-sm italic bg-slate-50 dark:bg-navy-800/50 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                                No bank details saved yet. <br/> Make a withdrawal request to save details.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Security */}
                <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm h-fit">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-white/5">
                        <Shield className="text-red-500" size={20} />
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Security Center</h2>
                    </div>

                    {passwordMessage && (
                        <div className={`p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-2 ${
                            passwordMessage.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                            {passwordMessage.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                            {passwordMessage.text}
                        </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-500 mb-1.5">Current Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type={showCurrentPwd ? "text" : "password"} 
                                    value={currentPassword} 
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
                                    placeholder="Verify identity"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                >
                                    {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-white/5"></div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-500 mb-1.5">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type={showNewPwd ? "text" : "password"} 
                                    value={newPassword} 
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-slate-900 dark:text-white focus:outline-none focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500 text-sm"
                                    placeholder="Min 8 chars"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPwd(!showNewPwd)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                >
                                    {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-gray-500 mb-1.5">Confirm New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type={showConfirmPwd ? "text" : "password"} 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-slate-900 dark:text-white focus:outline-none focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500 text-sm"
                                    placeholder="Re-enter password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                >
                                    {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSavingPassword}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-lg flex items-center justify-center gap-2 mt-4"
                        >
                            {isSavingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
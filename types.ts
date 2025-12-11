export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;
  numericValue: number;
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST',
  PUSH = 'PUSH', // Tie
  BLACKJACK = 'BLACKJACK'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface BankDetails {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  routingNumber?: string;
}

export type TransactionStatus = 'pending' | 'approved' | 'rejected';

export interface Transaction {
  id: string;
  type: 'win' | 'loss' | 'deposit' | 'withdrawal' | 'bonus';
  amount: number;
  date: string;
  description: string;
  balanceAfter: number;
  status?: TransactionStatus;
  transactionRef?: string; // For deposits (UTR/Ref No)
  bankDetails?: BankDetails;
}

export interface UserProfile {
  username: string;
  email: string;
  password?: string; // In real app, this would be hashed. Simulated here.
  savedBankDetails?: BankDetails;
}

export interface PlayerStats {
  balance: number;
  wins: number;
  losses: number;
  history: Transaction[];
  user: UserProfile;
}

export interface SlotSymbol {
  id: string;
  icon: string; // Emoji for simplicity or SVG path
  value: number;
  color: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  color: string;
  gradient: string;
  action: string;
}

export interface PasswordResetRequest {
    id: string;
    email: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected';
}
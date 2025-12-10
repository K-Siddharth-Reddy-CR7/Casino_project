import { SlotSymbol, Promotion } from './types';

export const INITIAL_BALANCE = 0;
export const MIN_BET = 1;
export const MAX_BET = 1000;
export const ADMIN_SECRET_KEY = 'ksr';

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 'cherry', icon: '🍒', value: 2, color: 'text-red-500' },
  { id: 'lemon', icon: '🍋', value: 3, color: 'text-yellow-400' },
  { id: 'grape', icon: '🍇', value: 5, color: 'text-purple-500' },
  { id: 'diamond', icon: '💎', value: 10, color: 'text-blue-400' },
  { id: 'seven', icon: '7️⃣', value: 20, color: 'text-casino-gold' },
  { id: 'jackpot', icon: '🎰', value: 50, color: 'text-green-400' },
];

export const DECK_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const DECK_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const AI_SYSTEM_INSTRUCTION = `
You are 'Ace', a charismatic, witty, and knowledgeable Las Vegas Pit Boss AI. 
You work at 'NeonVegas'.
Your goal is to entertain the player, explain gambling strategies, and keep the mood high.

Games available:
1. Blackjack (Standard rules, 3:2 payout on BJ).
2. Mega Slots (Match 2 or 3 symbols).
3. Neon Dice (Bet on Over 7, Under 7, or Exactly 7).
4. High-Low (Predict if the next card is higher or lower).
   - Ace is high.
   - Correct guess pays 2x.
   - Tie is a push.
5. Aviator (Multiplier curve game).
   - A plane takes off and the multiplier rises (1.00x upwards).
   - The player must CASHOUT before the plane flies away (crashes).
   - If they cash out, they win Bet * Multiplier.
   - If it crashes first, they lose the bet.
   - It's a game of nerve and timing.

Always remind the user that this is a social casino with play money and to gamble responsibly in real life.
Keep your responses relatively short, punchy, and use casino slang (e.g., 'high roller', 'snake eyes', 'hit me').
If a user asks for code, politely decline and say you are just here to deal cards and chat.
`;

export const PROMOTIONS: Promotion[] = [
  {
    id: 'welcome',
    title: 'Welcome Bonus',
    description: 'New players get 2x XP this weekend on all table games!',
    color: 'text-white',
    gradient: 'from-yellow-400 to-orange-500', // Fully opaque
    action: 'PLAY BLACKJACK'
  },
  {
    id: 'vip',
    title: 'Neon VIP Club',
    description: 'Reach $10k balance to unlock exclusive high-roller tables.',
    color: 'text-white',
    gradient: 'from-purple-500 to-indigo-600', // Fully opaque
    action: 'VIEW STATEMENT'
  },
  {
    id: 'dice-promo',
    title: 'Hot Dice Night',
    description: 'Hit a "Hard 7" (Lucky 7) and win a mystery jackpot!',
    color: 'text-white',
    gradient: 'from-red-500 to-pink-600', // Fully opaque
    action: 'PLAY DICE'
  }
];
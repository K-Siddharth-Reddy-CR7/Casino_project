import React from 'react';
import { Card } from '../../types';

interface CardDisplayProps {
  card: Card;
  hidden?: boolean;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({ card, hidden = false }) => {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  
  const getSuitIcon = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '?';
    }
  };

  if (hidden) {
    return (
      <div className="w-24 h-36 bg-gradient-to-br from-casino-800 to-casino-900 rounded-lg border-2 border-casino-gold/50 shadow-xl flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
        <div className="w-16 h-24 border border-casino-gold/20 rounded flex items-center justify-center">
            <span className="text-4xl text-casino-gold/20">NV</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-24 h-36 bg-white rounded-lg shadow-xl relative flex flex-col justify-between p-2 transform hover:-translate-y-2 transition-transform duration-200 select-none">
      <div className={`text-xl font-bold ${isRed ? 'text-red-600' : 'text-slate-900'} leading-none`}>
        {card.value}
        <div className="text-lg">{getSuitIcon(card.suit)}</div>
      </div>
      
      <div className={`absolute inset-0 flex items-center justify-center text-6xl ${isRed ? 'text-red-600/20' : 'text-slate-900/20'}`}>
        {getSuitIcon(card.suit)}
      </div>

      <div className={`text-xl font-bold ${isRed ? 'text-red-600' : 'text-slate-900'} leading-none self-end rotate-180`}>
        {card.value}
        <div className="text-lg">{getSuitIcon(card.suit)}</div>
      </div>
    </div>
  );
};
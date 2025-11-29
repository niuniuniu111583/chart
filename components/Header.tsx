import React from 'react';
import { Radio } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="flex items-center gap-3 py-6 mb-8 border-b border-slate-800">
      <div className="p-3 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50">
        <Radio className="w-8 h-8 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">NewsCast AI</h1>
        <p className="text-slate-400 text-sm">Your personal AI news anchor</p>
      </div>
    </header>
  );
};

import React from 'react';
import { ChefHat } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-orange-200 to-yellow-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-300 rounded-lg">
              <ChefHat className="text-orange-800" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-orange-900">Cook Helper</h1>
              <p className="text-sm text-orange-700">Asisten memasak pintar untuk keluarga Indonesia</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
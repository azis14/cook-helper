import React from 'react';
import { Package, BookOpen, Lightbulb, Calendar, Database } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'ingredients', label: 'Bahan', icon: Package },
    { id: 'recipes', label: 'Resep', icon: BookOpen },
    { id: 'suggestions', label: 'Inspirasi AI', icon: Lightbulb },
    { id: 'dataset', label: 'Dataset', icon: Database },
    { id: 'weekly-plan', label: 'Rencana Mingguan', icon: Calendar },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-orange-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
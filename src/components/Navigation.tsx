import React, { useState, useEffect } from 'react';
import { Package, BookOpen, Lightbulb, Calendar, Database, Brain } from 'lucide-react';
import { isFeatureEnabledSync, preloadFeatureFlags } from '../lib/featureFlags';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const [featuresLoaded, setFeaturesLoaded] = useState(false);

  useEffect(() => {
    // Preload feature flags on component mount
    preloadFeatureFlags().then(() => {
      setFeaturesLoaded(true);
    }).catch(error => {
      console.error('Failed to load feature flags:', error);
      setFeaturesLoaded(true); // Continue with defaults
    });
  }, []);

  // Define all possible tabs
  const allTabs = [
    { id: 'ingredients', label: 'Bahan', icon: Package, feature: null },
    { id: 'recipes', label: 'Resep', icon: BookOpen, feature: null },
    { id: 'suggestions', label: 'Inspirasi AI', icon: Lightbulb, feature: 'suggestions' as const },
    { id: 'dataset', label: 'Dataset', icon: Database, feature: 'dataset' as const },
    { id: 'rag', label: 'Asisten AI', icon: Brain, feature: 'rag' as const },
    { id: 'weekly-plan', label: 'Rencana Mingguan', icon: Calendar, feature: 'weeklyPlanner' as const },
  ];

  // Filter tabs based on feature flags
  const tabs = allTabs.filter(tab => {
    if (!tab.feature) return true; // Always show tabs without feature requirements
    return isFeatureEnabledSync(tab.feature);
  });

  // If current active tab is not available due to feature flags, switch to first available tab
  useEffect(() => {
    if (featuresLoaded && !tabs.some(tab => tab.id === activeTab)) {
      onTabChange(tabs[0]?.id || 'ingredients');
    }
  }, [featuresLoaded, activeTab, tabs, onTabChange]);

  // Don't render navigation until features are loaded to prevent flickering
  if (!featuresLoaded) {
    return (
      <nav className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto h-16 items-center">
            <div className="animate-pulse flex space-x-8">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

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
import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { IngredientManager } from './components/IngredientManager';
import { RecipeManager } from './components/RecipeManager';
import { RecipeSuggestions } from './components/RecipeSuggestions';
import { DatasetRecommendations } from './components/DatasetRecommendations';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import { AuthForm } from './components/AuthForm';
import { Toast } from './components/Toast';
import { useAuth } from './hooks/useAuth';
import { useIngredients } from './hooks/useIngredients';
import { useRecipes } from './hooks/useRecipes';
import { useToast } from './hooks/useToast';
import { signOut } from './lib/supabase';
import { LogOut } from 'lucide-react';

function App() {
  const { user, loading } = useAuth();
  const { ingredients } = useIngredients(user?.id);
  const { recipes } = useRecipes(user?.id);
  const { toasts, showSuccess, showError, hideToast } = useToast();
  const [activeTab, setActiveTab] = useState('ingredients');

  const handleSignOut = async () => {
    await signOut();
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'ingredients':
        return <IngredientManager />;
      case 'recipes':
        return <RecipeManager />;
      case 'suggestions':
        return (
          <RecipeSuggestions 
            ingredients={ingredients} 
            recipes={recipes}
            showSuccess={showSuccess}
            showError={showError}
          />
        );
      case 'dataset':
        return (
          <DatasetRecommendations
            ingredients={ingredients}
            showSuccess={showSuccess}
            showError={showError}
          />
        );
      case 'weekly-plan':
        return <WeeklyPlanner ingredients={ingredients} recipes={recipes} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <Header />
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="text-sm text-gray-600">
          Selamat datang, {user.email}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTab()}
      </main>

      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </div>
  );
}

export default App;
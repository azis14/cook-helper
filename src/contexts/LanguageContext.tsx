import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  // Navigation
  ingredients: { en: 'Ingredients', id: 'Bahan' },
  recipes: { en: 'Recipes', id: 'Resep' },
  suggestions: { en: 'Suggestions', id: 'Saran' },
  weeklyPlan: { en: 'Weekly Plan', id: 'Rencana Mingguan' },
  
  // Common
  add: { en: 'Add', id: 'Tambah' },
  edit: { en: 'Edit', id: 'Edit' },
  delete: { en: 'Delete', id: 'Hapus' },
  save: { en: 'Save', id: 'Simpan' },
  cancel: { en: 'Cancel', id: 'Batal' },
  search: { en: 'Search', id: 'Cari' },
  name: { en: 'Name', id: 'Nama' },
  quantity: { en: 'Quantity', id: 'Jumlah' },
  unit: { en: 'Unit', id: 'Satuan' },
  category: { en: 'Category', id: 'Kategori' },
  optional: { en: 'optional', id: 'opsional' },
  
  // Ingredients
  myIngredients: { en: 'My Ingredients', id: 'Bahan Saya' },
  addIngredient: { en: 'Add Ingredient', id: 'Tambah Bahan' },
  ingredientName: { en: 'Ingredient Name', id: 'Nama Bahan' },
  expiryDate: { en: 'Expiry Date', id: 'Tanggal Kadaluarsa' },
  
  // Categories
  vegetables: { en: 'Vegetables', id: 'Sayuran' },
  meat: { en: 'Meat', id: 'Daging' },
  dairy: { en: 'Dairy', id: 'Susu' },
  grains: { en: 'Grains', id: 'Biji-bijian' },
  spices: { en: 'Spices', id: 'Rempah' },
  fruits: { en: 'Fruits', id: 'Buah' },
  seafood: { en: 'Seafood', id: 'Makanan Laut' },
  
  // Units
  kg: { en: 'kg', id: 'kg' },
  gram: { en: 'gram', id: 'gram' },
  liter: { en: 'liter', id: 'liter' },
  ml: { en: 'ml', id: 'ml' },
  piece: { en: 'piece', id: 'buah' },
  clove: { en: 'clove', id: 'siung' },
  
  // Recipes
  myRecipes: { en: 'My Recipes', id: 'Resep Saya' },
  addRecipe: { en: 'Add Recipe', id: 'Tambah Resep' },
  recipeName: { en: 'Recipe Name', id: 'Nama Resep' },
  description: { en: 'Description', id: 'Deskripsi' },
  instructions: { en: 'Instructions', id: 'Petunjuk' },
  prepTime: { en: 'Prep Time (min)', id: 'Waktu Persiapan (menit)' },
  cookTime: { en: 'Cook Time (min)', id: 'Waktu Memasak (menit)' },
  servings: { en: 'Servings', id: 'Porsi' },
  difficulty: { en: 'Difficulty', id: 'Tingkat Kesulitan' },
  easy: { en: 'Easy', id: 'Mudah' },
  medium: { en: 'Medium', id: 'Sedang' },
  hard: { en: 'Hard', id: 'Sulit' },
  
  // Recipe Suggestions
  recipeSuggestions: { en: 'Recipe Suggestions', id: 'Saran Resep' },
  basedOnIngredients: { en: 'Based on your available ingredients', id: 'Berdasarkan bahan yang tersedia' },
  generateSuggestions: { en: 'Generate Suggestions', id: 'Buat Saran' },
  
  // Weekly Plan
  myWeeklyPlan: { en: 'My Weekly Plan', id: 'Rencana Mingguan Saya' },
  generatePlan: { en: 'Generate Plan', id: 'Buat Rencana' },
  shoppingList: { en: 'Shopping List', id: 'Daftar Belanja' },
  breakfast: { en: 'Breakfast', id: 'Sarapan' },
  lunch: { en: 'Lunch', id: 'Makan Siang' },
  dinner: { en: 'Dinner', id: 'Makan Malam' },
  
  // Days
  monday: { en: 'Monday', id: 'Senin' },
  tuesday: { en: 'Tuesday', id: 'Selasa' },
  wednesday: { en: 'Wednesday', id: 'Rabu' },
  thursday: { en: 'Thursday', id: 'Kamis' },
  friday: { en: 'Friday', id: 'Jumat' },
  saturday: { en: 'Saturday', id: 'Sabtu' },
  sunday: { en: 'Sunday', id: 'Minggu' },
  
  // Messages
  noIngredients: { en: 'No ingredients added yet. Start by adding some ingredients!', id: 'Belum ada bahan. Mulai dengan menambahkan beberapa bahan!' },
  noRecipes: { en: 'No recipes saved yet. Create your first recipe!', id: 'Belum ada resep tersimpan. Buat resep pertama Anda!' },
  
  // App Title
  appTitle: { en: 'Kitchen Helper', id: 'Asisten Dapur' },
  appSubtitle: { en: 'Your AI-powered cooking companion', id: 'Pendamping memasak bertenaga AI Anda' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[key as keyof typeof translations]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
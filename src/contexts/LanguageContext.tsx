import React, { createContext, useContext, ReactNode } from 'react';

interface LanguageContextType {
  t: (key: string) => string;
}

const translations = {
  // Navigation
  ingredients: 'Bahan',
  recipes: 'Resep',
  suggestions: 'Saran',
  weeklyPlan: 'Rencana Mingguan',
  
  // Common
  add: 'Tambah',
  edit: 'Edit',
  delete: 'Hapus',
  save: 'Simpan',
  cancel: 'Batal',
  search: 'Cari',
  name: 'Nama',
  quantity: 'Jumlah',
  unit: 'Satuan',
  category: 'Kategori',
  optional: 'opsional',
  
  // Ingredients
  myIngredients: 'Bahan-Bahan Saya',
  addIngredient: 'Tambah Bahan',
  ingredientName: 'Nama Bahan',
  expiryDate: 'Tanggal Kadaluarsa',
  
  // Categories
  vegetables: 'Sayuran',
  meat: 'Daging',
  dairy: 'Susu & Olahan',
  grains: 'Biji-bijian',
  spices: 'Rempah-rempah',
  fruits: 'Buah-buahan',
  seafood: 'Makanan Laut',
  
  // Units
  kg: 'kg',
  gram: 'gram',
  liter: 'liter',
  ml: 'ml',
  piece: 'buah',
  clove: 'siung',
  
  // Recipes
  myRecipes: 'Resep-Resep Saya',
  addRecipe: 'Tambah Resep',
  recipeName: 'Nama Resep',
  description: 'Deskripsi',
  instructions: 'Cara Memasak',
  prepTime: 'Waktu Persiapan (menit)',
  cookTime: 'Waktu Memasak (menit)',
  servings: 'Porsi',
  difficulty: 'Tingkat Kesulitan',
  easy: 'Mudah',
  medium: 'Sedang',
  hard: 'Sulit',
  
  // Recipe Suggestions
  recipeSuggestions: 'Saran Resep',
  basedOnIngredients: 'Berdasarkan bahan yang tersedia',
  generateSuggestions: 'Buat Saran Resep',
  
  // Weekly Plan
  myWeeklyPlan: 'Rencana Menu Mingguan',
  generatePlan: 'Buat Rencana Menu',
  shoppingList: 'Daftar Belanja',
  breakfast: 'Sarapan',
  lunch: 'Makan Siang',
  dinner: 'Makan Malam',
  
  // Days
  monday: 'Senin',
  tuesday: 'Selasa',
  wednesday: 'Rabu',
  thursday: 'Kamis',
  friday: 'Jumat',
  saturday: 'Sabtu',
  sunday: 'Minggu',
  
  // Messages
  noIngredients: 'Belum ada bahan yang ditambahkan. Mulai dengan menambahkan beberapa bahan!',
  noRecipes: 'Belum ada resep tersimpan. Buat resep pertama Anda!',
  
  // App Title
  appTitle: 'Asisten Dapur',
  appSubtitle: 'Pendamping memasak pintar untuk keluarga Indonesia',
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const t = (key: string): string => {
    return translations[key as keyof typeof translations] || key;
  };

  return (
    <LanguageContext.Provider value={{ t }}>
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
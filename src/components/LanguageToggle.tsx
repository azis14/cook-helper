import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-100 hover:bg-orange-200 transition-colors"
    >
      <Languages size={18} />
      <span className="font-medium">
        {language === 'en' ? 'ID' : 'EN'}
      </span>
    </button>
  );
};
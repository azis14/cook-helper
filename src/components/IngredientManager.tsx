import React, { useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Ingredient } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface IngredientManagerProps {
  ingredients: Ingredient[];
  onAdd: (ingredient: Omit<Ingredient, 'id'>) => void;
  onUpdate: (id: string, ingredient: Partial<Ingredient>) => void;
  onDelete: (id: string) => void;
}

export const IngredientManager: React.FC<IngredientManagerProps> = ({
  ingredients,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nameId: '',
    quantity: 1,
    unit: 'piece',
    category: 'vegetables',
    expiryDate: '',
  });

  const categories = ['vegetables', 'meat', 'dairy', 'grains', 'spices', 'fruits', 'seafood'];
  const units = ['kg', 'gram', 'liter', 'ml', 'piece', 'clove'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ingredientData = {
      ...formData,
      nameId: formData.name, // Use same name for both fields
    };
    
    if (editingId) {
      onUpdate(editingId, ingredientData);
      setEditingId(null);
    } else {
      onAdd(ingredientData);
    }
    setFormData({
      name: '',
      nameId: '',
      quantity: 1,
      unit: 'piece',
      category: 'vegetables',
      expiryDate: '',
    });
    setShowForm(false);
  };

  const handleEdit = (ingredient: Ingredient) => {
    setFormData({
      name: ingredient.name,
      nameId: ingredient.nameId,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      category: ingredient.category,
      expiryDate: ingredient.expiryDate || '',
    });
    setEditingId(ingredient.id);
    setShowForm(true);
  };

  const groupedIngredients = ingredients.reduce((acc, ingredient) => {
    if (!acc[ingredient.category]) {
      acc[ingredient.category] = [];
    }
    acc[ingredient.category].push(ingredient);
    return acc;
  }, {} as Record<string, Ingredient[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t('myIngredients')}</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus size={18} />
          {t('addIngredient')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-orange-100">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? t('edit') : t('add')} {t('ingredients')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('ingredientName')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="contoh: Ayam, Tomat, Beras..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('quantity')}
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                min="0.1"
                step="0.1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('unit')}
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{t(unit)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('category')}
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{t(category)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('expiryDate')} ({t('optional')})
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                {t('save')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    name: '',
                    nameId: '',
                    quantity: 1,
                    unit: 'piece',
                    category: 'vegetables',
                    expiryDate: '',
                  });
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {ingredients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('noIngredients')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedIngredients).map(([category, categoryIngredients]) => (
            <div key={category} className="bg-white rounded-lg shadow-md border border-orange-100">
              <h3 className="text-lg font-semibold text-gray-900 p-4 border-b border-orange-100 bg-orange-50 rounded-t-lg">
                {t(category)}
              </h3>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryIngredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {ingredient.name}
                      </h4>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(ingredient)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(ingredient.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      {ingredient.quantity} {t(ingredient.unit)}
                    </p>
                    {ingredient.expiryDate && (
                      <p className="text-xs text-orange-600 mt-1">
                        Kadaluarsa: {new Date(ingredient.expiryDate).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { X, Package, Save } from 'lucide-react';
import { Ingredient } from '../types';

interface IngredientEditModalProps {
  ingredient: Ingredient | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Ingredient>) => Promise<void>;
}

export const IngredientEditModal: React.FC<IngredientEditModalProps> = ({
  ingredient,
  isOpen,
  onClose,
  onSave,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    quantity: 0,
    unit: '',
    category: '',
    expiry_date: '',
  });

  const categories = ['vegetables', 'meat', 'seafood', 'dairy', 'fruits'];
  const units = ['kg', 'gram', 'liter', 'ml', 'piece', 'clove'];

  const categoryTranslations: Record<string, string> = {
    vegetables: 'Sayuran',
    meat: 'Daging & Unggas',
    seafood: 'Makanan Laut',
    dairy: 'Susu & Olahan',
    fruits: 'Buah-buahan',
  };

  const unitTranslations: Record<string, string> = {
    kg: 'kg',
    gram: 'gram',
    liter: 'liter',
    ml: 'ml',
    piece: 'buah',
    clove: 'siung',
  };

  // Update form data when ingredient changes
  useEffect(() => {
    if (ingredient) {
      setEditData({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: ingredient.category,
        expiry_date: ingredient.expiry_date || '',
      });
    }
  }, [ingredient]);

  if (!isOpen || !ingredient) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        ...editData,
        expiry_date: editData.expiry_date === '' ? null : editData.expiry_date,
      };
      await onSave(ingredient.id, updates);
    } catch (error) {
      console.error('Error updating ingredient:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSaving) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Bahan
              </h3>
              <p className="text-sm text-gray-600">
                Ubah informasi bahan "{ingredient.name}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Bahan
              </label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="contoh: Ayam, Tomat, Beras..."
                required
                disabled={isSaving}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah
                </label>
                <input
                  type="number"
                  value={editData.quantity}
                  onChange={(e) => setEditData({ ...editData, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0.1"
                  step="0.1"
                  required
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Satuan
                </label>
                <select
                  value={editData.unit}
                  onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSaving}
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unitTranslations[unit]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori
              </label>
              <select
                value={editData.category}
                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSaving}
              >
                {categories.map(category => (
                  <option key={category} value={category}>{categoryTranslations[category]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Kadaluarsa (opsional)
              </label>
              <input
                type="date"
                value={editData.expiry_date}
                onChange={(e) => setEditData({ ...editData, expiry_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSaving}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !editData.name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={16} />
                Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
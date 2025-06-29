import React, { useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useIngredients } from '../hooks/useIngredients';
import { useAuth } from '../hooks/useAuth';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { IngredientDetailModal } from './IngredientDetailModal';
import { Ingredient } from '../types';

export const IngredientManager: React.FC = () => {
  const { user } = useAuth();
  const { ingredients, loading, error, addIngredient, updateIngredient, deleteIngredient } = useIngredients(user?.id);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    ingredientId: string | null;
    ingredientName: string;
    isDeleting: boolean;
  }>({
    isOpen: false,
    ingredientId: null,
    ingredientName: '',
    isDeleting: false,
  });
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unit: 'piece',
    category: 'vegetables',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convert empty string to null for expiry_date
      const dataToSubmit = {
        ...formData,
        expiry_date: formData.expiry_date === '' ? null : formData.expiry_date,
      };

      if (editingId) {
        await updateIngredient(editingId, dataToSubmit);
        setEditingId(null);
      } else {
        await addIngredient(dataToSubmit);
      }
      setFormData({
        name: '',
        quantity: 1,
        unit: 'piece',
        category: 'vegetables',
        expiry_date: '',
      });
      setShowForm(false);
    } catch (err) {
      console.error('Error saving ingredient:', err);
    }
  };

  const handleEdit = (ingredient: any) => {
    setFormData({
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      category: ingredient.category,
      expiry_date: ingredient.expiry_date || '',
    });
    setEditingId(ingredient.id);
    setShowForm(true);
  };

  const handleDeleteClick = (ingredient: any) => {
    setDeleteModal({
      isOpen: true,
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      isDeleting: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.ingredientId) return;

    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      await deleteIngredient(deleteModal.ingredientId);
      setDeleteModal({
        isOpen: false,
        ingredientId: null,
        ingredientName: '',
        isDeleting: false,
      });
    } catch (err) {
      console.error('Error deleting ingredient:', err);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleDeleteCancel = () => {
    if (deleteModal.isDeleting) return; // Prevent closing while deleting
    
    setDeleteModal({
      isOpen: false,
      ingredientId: null,
      ingredientName: '',
      isDeleting: false,
    });
  };

  const handleCardClick = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setShowDetailModal(true);
  };

  const handleEditFromModal = async (id: string, updates: Partial<Ingredient>) => {
    try {
      await updateIngredient(id, updates);
      // Update the selected ingredient to reflect changes in the modal
      if (selectedIngredient && selectedIngredient.id === id) {
        setSelectedIngredient({ ...selectedIngredient, ...updates });
      }
    } catch (err) {
      console.error('Error updating ingredient from modal:', err);
      throw err; // Re-throw to let the modal handle the error
    }
  };

  const groupedIngredients = ingredients.reduce((acc, ingredient) => {
    if (!acc[ingredient.category]) {
      acc[ingredient.category] = [];
    }
    acc[ingredient.category].push(ingredient);
    return acc;
  }, {} as Record<string, typeof ingredients>);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Bahan-Bahan Saya</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus size={18} />
          Tambah Bahan
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-orange-100">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit' : 'Tambah'} Bahan
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Bahan
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
                Jumlah
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
                Satuan
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{unitTranslations[unit]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    name: '',
                    quantity: 1,
                    unit: 'piece',
                    category: 'vegetables',
                    expiry_date: '',
                  });
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {ingredients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Belum ada bahan yang ditambahkan. Mulai dengan menambahkan beberapa bahan!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedIngredients).map(([category, categoryIngredients]) => (
            <div key={category} className="bg-white rounded-lg shadow-md border border-orange-100">
              <h3 className="text-lg font-semibold text-gray-900 p-4 border-b border-orange-100 bg-orange-50 rounded-t-lg">
                {categoryTranslations[category]}
              </h3>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryIngredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer hover:border-orange-300"
                    onClick={() => handleCardClick(ingredient)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {ingredient.name}
                      </h4>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(ingredient);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Edit bahan"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(ingredient);
                          }}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Hapus bahan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      {ingredient.quantity} {unitTranslations[ingredient.unit]}
                    </p>
                    {ingredient.expiry_date && (
                      <p className="text-xs text-orange-600 mt-1">
                        Kadaluarsa: {new Date(ingredient.expiry_date).toLocaleDateString('id-ID')}
                      </p>
                    )}
                    
                    {/* Click hint */}
                    <div className="mt-2 text-xs text-gray-400 text-center border-t border-gray-100 pt-2">
                      Klik untuk melihat detail lengkap
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ingredient Detail Modal */}
      <IngredientDetailModal
        ingredient={selectedIngredient}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedIngredient(null);
        }}
        onEdit={handleEditFromModal}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        itemName={deleteModal.ingredientName}
        itemType="bahan"
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  );
};
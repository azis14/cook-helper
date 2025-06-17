import React, { useState } from 'react';
import { Plus, Trash2, Edit, Clock, Users, ChefHat } from 'lucide-react';
import { useRecipes } from '../hooks/useRecipes';
import { useAuth } from '../hooks/useAuth';

export const RecipeManager: React.FC = () => {
  const { user } = useAuth();
  const { recipes, loading, error, addRecipe, updateRecipe, deleteRecipe } = useRecipes(user?.id);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ingredients: [] as Array<{ name: string; quantity: number; unit: string }>,
    instructions: [''],
    prep_time: 10,
    cook_time: 20,
    servings: 4,
    difficulty: 'easy' as const,
    tags: [] as string[],
  });

  const difficultyTranslations = {
    easy: 'Mudah',
    medium: 'Sedang',
    hard: 'Sulit',
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
      const recipeData = {
        name: formData.name,
        description: formData.description,
        instructions: formData.instructions.filter(inst => inst.trim() !== ''),
        prep_time: formData.prep_time,
        cook_time: formData.cook_time,
        servings: formData.servings,
        difficulty: formData.difficulty,
        tags: formData.tags,
      };

      const ingredients = formData.ingredients.filter(ing => ing.name.trim() !== '');

      if (editingId) {
        await updateRecipe(editingId, recipeData, ingredients);
        setEditingId(null);
      } else {
        await addRecipe(recipeData, ingredients);
      }
      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error('Error saving recipe:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ingredients: [],
      instructions: [''],
      prep_time: 10,
      cook_time: 20,
      servings: 4,
      difficulty: 'easy',
      tags: [],
    });
  };

  const handleEdit = (recipe: any) => {
    setFormData({
      name: recipe.name,
      description: recipe.description,
      ingredients: recipe.recipe_ingredients.map((ing: any) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
      instructions: recipe.instructions.length > 0 ? recipe.instructions : [''],
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      tags: recipe.tags,
    });
    setEditingId(recipe.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus resep ini?')) {
      try {
        await deleteRecipe(id);
      } catch (err) {
        console.error('Error deleting recipe:', err);
      }
    }
  };

  const addInstruction = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, ''],
    });
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData({ ...formData, instructions: newInstructions });
  };

  const removeInstruction = (index: number) => {
    setFormData({
      ...formData,
      instructions: formData.instructions.filter((_, i) => i !== index),
    });
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        { name: '', quantity: 1, unit: 'piece' },
      ],
    });
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
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
        <h2 className="text-2xl font-bold text-gray-900">Resep-Resep Saya</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus size={18} />
          Tambah Resep
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-green-100 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit' : 'Tambah'} Resep
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Resep
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="contoh: Nasi Goreng Spesial"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="Deskripsi singkat tentang resep ini..."
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waktu Persiapan (menit)
                </label>
                <input
                  type="number"
                  value={formData.prep_time}
                  onChange={(e) => setFormData({ ...formData, prep_time: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waktu Memasak (menit)
                </label>
                <input
                  type="number"
                  value={formData.cook_time}
                  onChange={(e) => setFormData({ ...formData, cook_time: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porsi
                </label>
                <input
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tingkat Kesulitan
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="easy">Mudah</option>
                  <option value="medium">Sedang</option>
                  <option value="hard">Sulit</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Bahan-bahan
                </label>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="text-sm text-green-600 hover:text-green-800"
                >
                  + Tambah Bahan
                </button>
              </div>
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Nama bahan"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    className="col-span-5 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Jumlah"
                    value={ingredient.quantity}
                    onChange={(e) => updateIngredient(index, 'quantity', Number(e.target.value))}
                    className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0.1"
                    step="0.1"
                  />
                  <select
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    className="col-span-3 px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="kg">kg</option>
                    <option value="gram">gram</option>
                    <option value="liter">liter</option>
                    <option value="ml">ml</option>
                    <option value="piece">buah</option>
                    <option value="clove">siung</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="col-span-2 text-red-600 hover:text-red-800 text-sm"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Cara Memasak
                </label>
                <button
                  type="button"
                  onClick={addInstruction}
                  className="text-sm text-green-600 hover:text-green-800"
                >
                  + Tambah Langkah
                </button>
              </div>
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <span className="text-sm text-gray-500 mt-2">{index + 1}.</span>
                  <textarea
                    value={instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={2}
                    placeholder={`Langkah ${index + 1}...`}
                  />
                  {formData.instructions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
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
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Belum ada resep tersimpan. Buat resep pertama Anda!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-lg shadow-md border border-green-100 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">{recipe.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(recipe)}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(recipe.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{recipe.description}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{recipe.prep_time + recipe.cook_time} menit</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    <span>{recipe.servings} porsi</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    recipe.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {difficultyTranslations[recipe.difficulty]}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Bahan: </span>
                  {recipe.recipe_ingredients.length} item
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
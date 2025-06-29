import React from 'react';
import { X, Package, Calendar, Tag, Scale, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Ingredient } from '../types';

interface IngredientDetailModalProps {
  ingredient: Ingredient | null;
  isOpen: boolean;
  onClose: () => void;
}

export const IngredientDetailModal: React.FC<IngredientDetailModalProps> = ({
  ingredient,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !ingredient) return null;

  const categoryTranslations: Record<string, string> = {
    vegetables: 'Sayuran',
    meat: 'Daging & Unggas',
    seafood: 'Makanan Laut',
    dairy: 'Susu & Olahan',
    fruits: 'Buah-buahan',
  };

  const unitTranslations: Record<string, string> = {
    kg: 'kilogram',
    gram: 'gram',
    liter: 'liter',
    ml: 'mililiter',
    piece: 'buah',
    clove: 'siung',
  };

  const categoryColors: Record<string, string> = {
    vegetables: 'bg-green-100 text-green-800 border-green-200',
    meat: 'bg-red-100 text-red-800 border-red-200',
    seafood: 'bg-blue-100 text-blue-800 border-blue-200',
    dairy: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    fruits: 'bg-orange-100 text-orange-800 border-orange-200',
  };

  const getExpiryStatus = () => {
    if (!ingredient.expiry_date) return null;
    
    const today = new Date();
    const expiryDate = new Date(ingredient.expiry_date);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'expired',
        message: `Kadaluarsa ${Math.abs(diffDays)} hari yang lalu`,
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: <AlertTriangle size={16} className="text-red-600" />
      };
    } else if (diffDays === 0) {
      return {
        status: 'today',
        message: 'Kadaluarsa hari ini',
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        icon: <Clock size={16} className="text-orange-600" />
      };
    } else if (diffDays <= 3) {
      return {
        status: 'soon',
        message: `Kadaluarsa dalam ${diffDays} hari`,
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        icon: <Clock size={16} className="text-yellow-600" />
      };
    } else if (diffDays <= 7) {
      return {
        status: 'week',
        message: `Kadaluarsa dalam ${diffDays} hari`,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        icon: <Calendar size={16} className="text-blue-600" />
      };
    } else {
      return {
        status: 'fresh',
        message: `Masih segar (${diffDays} hari lagi)`,
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: <CheckCircle size={16} className="text-green-600" />
      };
    }
  };

  const getUsageSuggestions = () => {
    const suggestions: Record<string, string[]> = {
      vegetables: [
        'Cocok untuk tumisan dan sup',
        'Bisa dijadikan lalapan segar',
        'Bagus untuk jus atau smoothie',
        'Ideal untuk salad sehat'
      ],
      meat: [
        'Sempurna untuk digoreng atau dibakar',
        'Cocok untuk rendang atau gulai',
        'Bisa dibuat sate atau kebab',
        'Ideal untuk sup atau soto'
      ],
      seafood: [
        'Lezat digoreng dengan bumbu',
        'Cocok untuk sup atau kuah',
        'Bisa dibakar dengan rempah',
        'Ideal untuk pepes atau tim'
      ],
      dairy: [
        'Bagus untuk minuman segar',
        'Cocok untuk kue dan dessert',
        'Bisa untuk smoothie sehat',
        'Ideal untuk sarapan bergizi'
      ],
      fruits: [
        'Segar dimakan langsung',
        'Cocok untuk jus atau smoothie',
        'Bisa untuk salad buah',
        'Ideal untuk dessert sehat'
      ]
    };

    return suggestions[ingredient.category] || ['Bahan serbaguna untuk berbagai masakan'];
  };

  const getStorageTips = () => {
    const tips: Record<string, string[]> = {
      vegetables: [
        'Simpan di kulkas bagian sayuran',
        'Cuci sebelum disimpan untuk menjaga kesegaran',
        'Pisahkan dari buah-buahan',
        'Gunakan kantong berlubang untuk sirkulasi udara'
      ],
      meat: [
        'Simpan di freezer jika tidak segera digunakan',
        'Bungkus rapat untuk mencegah kontaminasi',
        'Pisahkan dari bahan makanan lain',
        'Gunakan dalam 1-2 hari jika di kulkas'
      ],
      seafood: [
        'Simpan di bagian terdingin kulkas',
        'Bungkus dengan es untuk menjaga kesegaran',
        'Gunakan sesegera mungkin',
        'Jangan simpan terlalu lama di suhu ruang'
      ],
      dairy: [
        'Simpan di kulkas pada suhu yang tepat',
        'Tutup rapat setelah dibuka',
        'Jangan biarkan di suhu ruang terlalu lama',
        'Periksa tanggal kadaluarsa secara rutin'
      ],
      fruits: [
        'Beberapa buah lebih baik di suhu ruang',
        'Pisahkan buah yang cepat matang',
        'Simpan di kulkas jika sudah matang',
        'Jangan cuci sebelum disimpan'
      ]
    };

    return tips[ingredient.category] || ['Simpan di tempat yang sejuk dan kering'];
  };

  const expiryStatus = getExpiryStatus();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="text-orange-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{ingredient.name}</h2>
              <p className="text-sm text-gray-600">Detail informasi bahan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quantity & Unit */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="text-gray-600" size={20} />
                <h3 className="font-semibold text-gray-900">Jumlah & Satuan</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Jumlah:</span>
                  <span className="font-medium text-gray-900">{ingredient.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Satuan:</span>
                  <span className="font-medium text-gray-900">
                    {unitTranslations[ingredient.unit] || ingredient.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-lg text-orange-600">
                    {ingredient.quantity} {unitTranslations[ingredient.unit] || ingredient.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="text-gray-600" size={20} />
                <h3 className="font-semibold text-gray-900">Kategori</h3>
              </div>
              <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${categoryColors[ingredient.category] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                <span className="font-medium">
                  {categoryTranslations[ingredient.category] || ingredient.category}
                </span>
              </div>
            </div>
          </div>

          {/* Expiry Information */}
          {ingredient.expiry_date && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="text-gray-600" size={20} />
                <h3 className="font-semibold text-gray-900">Informasi Kadaluarsa</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tanggal kadaluarsa:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(ingredient.expiry_date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                {expiryStatus && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg border ${expiryStatus.color}`}>
                    {expiryStatus.icon}
                    <span className="font-medium">{expiryStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Usage Suggestions */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              Saran Penggunaan
            </h3>
            <ul className="space-y-2">
              {getUsageSuggestions().slice(0, 3).map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-500 mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Storage Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="text-blue-600" size={20} />
              Tips Penyimpanan
            </h3>
            <ul className="space-y-2">
              {getStorageTips().slice(0, 3).map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Timestamps */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Informasi Tambahan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Ditambahkan:</span>
                <div className="font-medium text-gray-900">
                  {new Date(ingredient.created_at || '').toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              {ingredient.updated_at && ingredient.updated_at !== ingredient.created_at && (
                <div>
                  <span className="text-gray-600">Terakhir diubah:</span>
                  <div className="font-medium text-gray-900">
                    {new Date(ingredient.updated_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Tutup Detail
          </button>
        </div>
      </div>
    </div>
  );
};
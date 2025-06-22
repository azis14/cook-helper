import React, { useState } from 'react';
import { MessageSquare, Send, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export const FeedbackButton: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      setError('Mohon masukkan feedback Anda');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const feedbackData = {
        user_id: user?.id || null,
        feedback_text: feedback.trim(),
        user_email: email.trim() || user?.email || null,
        page_url: null, // Simplified - no longer collecting page URL
        user_agent: null, // Simplified - no longer collecting user agent
      };

      const { error: submitError } = await supabase
        .from('user_feedback')
        .insert(feedbackData);

      if (submitError) throw submitError;

      setSuccess(true);
      setFeedback('');
      setEmail('');
      
      // Auto close after success
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Gagal mengirim feedback. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFeedback('');
    setEmail('');
    setError(null);
    setSuccess(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <>
      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 z-40 group"
        title="Berikan Feedback"
      >
        <MessageSquare size={24} />
        <span className="absolute -top-2 -left-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 animate-pulse">
          BETA
        </span>
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={handleBackdropClick}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto my-8 transform transition-all max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {success ? 'Feedback Terkirim!' : 'Feedback Beta'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {success ? 'Terima kasih atas feedback Anda!' : 'Bantu kami meningkatkan aplikasi'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              {success ? (
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircle className="text-green-600" size={32} />
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Feedback Anda sangat berharga untuk pengembangan aplikasi ini. 
                    Kami akan meninjau dan mempertimbangkan saran Anda.
                  </p>
                  <div className="text-sm text-gray-500">
                    Menutup otomatis dalam beberapa detik...
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>🚀 Aplikasi ini masih dalam tahap BETA!</strong><br />
                        Feedback Anda akan membantu kami memperbaiki bug, menambah fitur, 
                        dan meningkatkan pengalaman pengguna.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Feedback / Saran / Bug Report *
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={4}
                        placeholder="Ceritakan pengalaman Anda, saran perbaikan, atau laporkan bug yang Anda temukan..."
                        required
                        disabled={loading}
                        maxLength={1000}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {feedback.length}/1000 karakter
                      </div>
                    </div>

                    {!user && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email (opsional)
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="email@example.com"
                          disabled={loading}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Jika Anda ingin kami menghubungi Anda terkait feedback ini
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600">
                        <strong>Yang akan kami kumpulkan:</strong><br />
                        • Feedback Anda<br />
                        • Email: {user?.email || email || 'Tidak ada'}<br />
                        • Waktu: {new Date().toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !feedback.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Mengirim...
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            Kirim Feedback
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                      Feedback akan ditinjau oleh tim developer untuk perbaikan aplikasi
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
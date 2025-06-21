import React from 'react';
import { Heart, Coffee, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-orange-100 to-yellow-100 border-t border-orange-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Copyright Section */}
          <div className="flex items-center gap-2 text-gray-700">
            <span className="text-sm">
              © 2025 Made with
            </span>
            <Heart className="text-red-500" size={16} />
            <span className="text-sm">
              by
            </span>
            <a
              href="https://azis14.my.id"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-orange-600 hover:text-orange-800 transition-colors duration-200 flex items-center gap-1"
            >
              azis14
              <ExternalLink size={14} />
            </a>
          </div>

          {/* Buy Me Coffee Section */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 font-medium">
              Suka dengan produknya?
            </span>
            <a
              href="https://clicky.id/en/azis14/support/coffee"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm rounded-lg hover:from-amber-600 hover:to-orange-600 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Coffee size={16} />
              Buy me a Coffee
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-orange-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Asisten Dapur - Aplikasi resep pintar untuk keluarga Indonesia
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Dibuat dengan React, TypeScript, Supabase, dan AI
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose, duration = 8000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColors = {
    error: 'bg-red-900/95 border-red-500',
    success: 'bg-green-900/95 border-green-500',
    info: 'bg-blue-900/95 border-blue-500'
  };

  const icons = {
    error: <AlertCircle className="w-6 h-6 text-red-400" />,
    success: <CheckCircle className="w-6 h-6 text-green-400" />,
    info: <Info className="w-6 h-6 text-blue-400" />
  };

  return (
    <div className={`fixed top-20 right-4 z-[200] flex items-start gap-4 p-5 rounded-xl border backdrop-blur-md shadow-2xl max-w-sm w-full animate-fade-in-up ${bgColors[type]}`}>
      <div className="shrink-0 mt-0.5">
        {icons[type]}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-2">
          {type === 'error' ? 'Упс, сталася помилка' : type === 'success' ? 'Успішно' : 'До уваги'}
        </h4>
        <p className="text-sm text-gray-200 leading-relaxed font-medium">
          {message}
        </p>
      </div>
      <button 
        onClick={onClose}
        className="shrink-0 text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'ACCEPTED' | 'REJECTED' | 'FOR_CORRECTION';
  actionLabel?: string;
}

export default function SuccessModal({ isOpen, onClose, title, message, type, actionLabel = "Continue to Dashboard" }: SuccessModalProps) {
  const getColors = () => {
    switch (type) {
      case 'ACCEPTED':
        return {
          bg: 'bg-emerald-50',
          icon: 'text-emerald-500',
          button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
          border: 'border-emerald-100'
        };
      case 'REJECTED':
        return {
          bg: 'bg-red-50',
          icon: 'text-red-500',
          button: 'bg-red-600 hover:bg-red-700 shadow-red-200',
          border: 'border-red-100'
        };
      case 'FOR_CORRECTION':
        return {
          bg: 'bg-amber-50',
          icon: 'text-amber-500',
          button: 'bg-philsa-navy hover:bg-philsa-navy/90 shadow-navy-200',
          border: 'border-amber-100'
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
          >
            <div className={cn("h-32 flex items-center justify-center relative", colors.bg)}>
               <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-white blur-3xl opacity-50" />
                  <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-white blur-3xl opacity-50" />
               </div>
               <div className="bg-white p-4 rounded-3xl shadow-xl shadow-black/5 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                  {type === 'ACCEPTED' && <CheckCircle className={cn("w-12 h-12", colors.icon)} />}
                  {type === 'REJECTED' && <XCircle className={cn("w-12 h-12", colors.icon)} />}
                  {type === 'FOR_CORRECTION' && <AlertCircle className={cn("w-12 h-12", colors.icon)} />}
               </div>
            </div>

            <div className="p-10 text-center">
              <h3 className="text-2xl font-black text-philsa-navy mb-4 tracking-tight leading-tight">
                {title}
              </h3>
              <p className="text-philsa-gray font-medium mb-10 leading-relaxed">
                {message}
              </p>
              <button
                onClick={onClose}
                className={cn(
                  "w-full py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3",
                  colors.button
                )}
              >
                {actionLabel} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

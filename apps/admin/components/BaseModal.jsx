"use client";
import React from 'react';

export default function BaseModal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  size = 'md', // sm, md, lg, xl, 2xl
  children,
  formId = 'modal-base-form'
}) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const selectedSizeClass = sizeClasses[size] || 'max-w-md';

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-fade-in">
      <div 
        className={`bg-white rounded-2xl shadow-2xl w-full ${selectedSizeClass} max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-start gap-3">
            {icon && <div className="mt-1 flex-shrink-0 text-green-700">{icon}</div>}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800 leading-tight">{title}</h2>
              {description && <p className="text-xs text-gray-500 mt-1 leading-normal">{description}</p>}
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs">
          <form id={formId} onSubmit={handleFormSubmit} className="space-y-5">
            {children}
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-2.5 bg-gray-50/50">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading}
            className="px-5 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50 text-xs w-full sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button 
            type="submit" 
            form={formId}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg font-bold text-white bg-green-700 hover:bg-green-800 shadow-md shadow-green-200/50 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs w-full sm:w-auto"
          >
            {loading && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

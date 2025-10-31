import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const Modal = ({ isOpen, onClose, title, children, size = 'md', showCloseButton = true }) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 transition-opacity bg-black bg-opacity-50"
            onClick={onClose}
          />

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`inline-block w-full ${sizeClasses[size]} align-middle bg-slate-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all`}
          >
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                {title && (
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
            
            <div className="px-6 py-4">
              {children}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}

export default Modal

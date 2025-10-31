import React from 'react'
import { motion } from 'framer-motion'

const LoadingSpinner = ({ size = 'md', color = 'primary' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const colorClasses = {
    primary: 'border-blue-500',
    white: 'border-white',
    gray: 'border-gray-400'
  }

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`${sizeClasses[size]} ${colorClasses[color]} border-2 border-t-transparent rounded-full`}
    />
  )
}

export default LoadingSpinner

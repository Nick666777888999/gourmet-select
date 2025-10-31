import React from 'react'
import { motion } from 'framer-motion'

const FadeIn = ({ 
  children, 
  delay = 0, 
  duration = 0.6,
  y = 20,
  className = '' 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default FadeIn

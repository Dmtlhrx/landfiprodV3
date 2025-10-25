import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-16 h-16 border-4 border-primary-500/20 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary-500 rounded-full" />
      </motion.div>
    </div>
  );
};

export default LoadingSpinner;
import React from 'react';

const LoadingSpinner = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className="flex items-center justify-center">
      <div 
        className={`animate-spin rounded-full border-accent-main-100 border-t-transparent ${sizeClasses[size]}`}
      />
    </div>
  );
};

export default LoadingSpinner;
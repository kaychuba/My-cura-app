import React from 'react';

export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return (
    <span className={`inline-block ${sizeClass} border-2 border-current border-t-transparent rounded-full animate-spin ${className}`} />
  );
}

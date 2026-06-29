import React from 'react';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (src) {
    return <img src={src} alt={name} className={`${sizeMap[size]} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizeMap[size]} rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

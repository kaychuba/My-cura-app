import React from 'react';

type BadgeColor = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray' | 'teal';

const colorMap: Record<BadgeColor, string> = {
  blue: 'badge-blue',
  green: 'badge-green',
  amber: 'badge-amber',
  red: 'badge-red',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  gray: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ color = 'gray', children, className = '', dot }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[color]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

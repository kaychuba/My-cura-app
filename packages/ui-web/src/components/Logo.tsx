import { Heart } from 'lucide-react';

type LogoSize = 'sm' | 'md' | 'lg';
type LogoTone = 'solid' | 'inverted';

interface LogoProps {
  /** sm = dashboard sidebar, md = marketing header, lg = auth hero. */
  size?: LogoSize;
  /**
   * solid: primary chip + white icon, dark wordmark — for light backgrounds.
   * inverted: white chip + primary icon, white wordmark — for colored/gradient backgrounds.
   */
  tone?: LogoTone;
  showWordmark?: boolean;
  className?: string;
}

const SIZES: Record<LogoSize, { chip: string; icon: string; text: string }> = {
  sm: { chip: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4', text: 'text-lg' },
  md: { chip: 'w-9 h-9 rounded-lg', icon: 'w-5 h-5', text: 'text-xl' },
  lg: { chip: 'w-10 h-10 rounded-xl shadow-lg', icon: 'w-6 h-6', text: 'text-3xl' },
};

export function Logo({ size = 'md', tone = 'solid', showWordmark = true, className = '' }: LogoProps) {
  const s = SIZES[size];
  const chipTone = tone === 'inverted' ? 'bg-white' : 'bg-primary-500';
  const iconTone = tone === 'inverted' ? 'text-primary-500' : 'text-white';
  const textTone = tone === 'inverted' ? 'text-white' : 'text-slate-900 dark:text-white';

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className={`${s.chip} ${chipTone} flex items-center justify-center`}>
        <Heart className={`${s.icon} ${iconTone}`} />
      </span>
      {showWordmark && (
        <span className={`${s.text} font-bold tracking-tight ${textTone}`}>My-Cura</span>
      )}
    </span>
  );
}

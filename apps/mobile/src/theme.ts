/**
 * My-Cura mobile brand palette — deep purple.
 * New components import from here; existing screens use the same literals.
 */
export const colors = {
  primary: '#4C1D95',        // deep purple — headers, active states, brand
  primaryDark: '#3B0764',    // pressed / gradient end
  primaryLight: '#7C3AED',   // accents, highlights
  primaryTint: '#F5F3FF',    // selected backgrounds
  primaryBorder: '#DDD6FE',  // borders on tinted surfaces

  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',

  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#3B82F6',
} as const;

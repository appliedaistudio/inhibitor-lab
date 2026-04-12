/** Color palettes for dark and light themes.
 *  Used by components with inline styles and Recharts configs
 *  that can't read CSS custom properties directly. */

export const THEME_COLORS = {
  dark: {
    accent: '#00d4ff',
    accentBg: 'rgba(0, 212, 255, 0.10)',
    accentBorder: 'rgba(0, 212, 255, 0.20)',
    danger: '#ff3b5c',
    dangerLight: '#ff8a9e',
    dangerBg: 'rgba(255, 59, 92, 0.06)',
    warning: '#ffb547',
    success: '#00e5a0',
    successLight: '#66f0c8',
    successBg: 'rgba(0, 229, 160, 0.06)',
    purple: '#a855f7',
    muted: '#94a3b8',
    foreground: '#e2e8f0',
    background: '#050508',
    card: 'rgb(10, 14, 26)',
    cardBg: 'bg-[#060810]/90',
    headerBg: 'bg-[#060810]/80',
    border: '#141c2e',
    tooltipBg: 'rgba(10, 14, 26, 0.95)',
    tooltipBorder: 'rgba(0, 212, 255, 0.15)',
    tooltipShadow: '0 0 20px rgba(0, 212, 255, 0.08)',
    gridStroke: '#141c2e',
    axisColor: '#94a3b8',
    chartFillOpacity: 0.8,
  },
  light: {
    accent: '#0284c7',
    accentBg: 'rgba(2, 132, 199, 0.08)',
    accentBorder: 'rgba(2, 132, 199, 0.20)',
    danger: '#dc2626',
    dangerLight: '#991b1b',
    dangerBg: 'rgba(220, 38, 38, 0.06)',
    warning: '#d97706',
    success: '#059669',
    successLight: '#065f46',
    successBg: 'rgba(5, 150, 105, 0.06)',
    purple: '#7c3aed',
    muted: '#64748b',
    foreground: '#0f172a',
    background: '#f8fafc',
    card: '#ffffff',
    cardBg: 'bg-white/90',
    headerBg: 'bg-white/80',
    border: '#e2e8f0',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    gridStroke: '#e2e8f0',
    axisColor: '#64748b',
    chartFillOpacity: 0.9,
  },
} as const;

export type ThemeColorKey = keyof typeof THEME_COLORS.dark;

/** Get resolved color value for current theme */
export function tc(theme: 'dark' | 'light', key: ThemeColorKey): string {
  return THEME_COLORS[theme][key] as string;
}

/** Recharts <Tooltip contentStyle={...}> for the current theme */
export function chartTooltipStyle(theme: 'dark' | 'light') {
  const c = THEME_COLORS[theme];
  return {
    background: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    borderRadius: '12px',
    fontSize: '12px',
    color: c.foreground,
    boxShadow: c.tooltipShadow,
  };
}

/** Recharts axis tick style for the current theme */
export function chartAxisStyle(theme: 'dark' | 'light', fontSize = 11) {
  return { fill: THEME_COLORS[theme].axisColor, fontSize };
}

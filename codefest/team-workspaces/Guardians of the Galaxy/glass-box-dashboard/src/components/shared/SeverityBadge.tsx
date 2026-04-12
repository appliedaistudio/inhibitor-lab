import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';

interface Props {
  severity: string;
  size?: 'sm' | 'md';
}

const config: Record<string, { bg: string; text: string; border: string; icon: typeof ShieldAlert; label: string }> = {
  high: {
    bg: 'bg-[#ff3b5c]/15',
    text: 'text-[#ff3b5c]',
    border: 'border-[#ff3b5c]/30',
    icon: ShieldAlert,
    label: 'High',
  },
  critical: {
    bg: 'bg-[#ff3b5c]/15',
    text: 'text-[#ff3b5c]',
    border: 'border-[#ff3b5c]/30',
    icon: ShieldAlert,
    label: 'Critical',
  },
  medium: {
    bg: 'bg-[#ffb547]/15',
    text: 'text-[#ffb547]',
    border: 'border-[#ffb547]/30',
    icon: AlertTriangle,
    label: 'Medium',
  },
  low: {
    bg: 'bg-[#00e5a0]/15',
    text: 'text-[#00e5a0]',
    border: 'border-[#00e5a0]/30',
    icon: Info,
    label: 'Low',
  },
  info: {
    bg: 'bg-[#00d4ff]/15',
    text: 'text-[#00d4ff]',
    border: 'border-[#00d4ff]/30',
    icon: Info,
    label: 'Info',
  },
};

const fallback = {
  bg: 'bg-[#64748b]/15',
  text: 'text-[#94a3b8]',
  border: 'border-[#64748b]/30',
  icon: Info,
  label: 'Unknown',
};

export function SeverityBadge({ severity, size = 'md' }: Props) {
  const c = config[(severity || '').toLowerCase()] || fallback;
  const Icon = c.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-3 py-1 text-sm gap-1.5';

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full border ${c.bg} ${c.text} ${c.border} font-medium`}>
      <Icon size={size === 'sm' ? 12 : 14} />
      {c.label}
    </span>
  );
}

import { ReactNode } from 'react';

interface IconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
}

export default function IconButton({
  children,
  onClick,
  className = '',
  variant = 'ghost',
  disabled = false,
  title,
  type = 'button',
}: IconButtonProps) {
  const baseStyle =
    'p-3 rounded-xl flex items-center justify-center transition-all duration-150 outline-none select-none active:scale-[0.95] disabled:opacity-50 disabled:pointer-events-none touch-manipulation cursor-pointer';

  const variants = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/20 hover:shadow-indigo-500/20',
    secondary:
      'bg-slate-800 hover:bg-slate-700 border border-white/[0.06] text-slate-200',
    danger:
      'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/20 hover:shadow-rose-500/20',
    success:
      'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 hover:shadow-emerald-500/20',
    ghost:
      'hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-transparent',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

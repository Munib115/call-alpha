import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PresenceDot from '@/components/sidebar/PresenceDot';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'in_call';
}

export default function Avatar({ src, alt = '', size = 'md', status }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-14 h-14 text-2xl',
    xl: 'w-24 h-24 text-4xl',
  };

  const statusOffset = {
    sm: 'bottom-0 right-0',
    md: 'bottom-0 right-0',
    lg: 'bottom-0.5 right-0.5',
    xl: 'bottom-1 right-1',
  };

  const firstLetter = alt ? alt.charAt(0).toUpperCase() : '';

  return (
    <div className="relative inline-block select-none">
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center bg-slate-800 border border-white/[0.08] shadow-inner text-slate-300 font-bold transition-all duration-300`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover transition-opacity duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : firstLetter ? (
          <span className="bg-gradient-to-tr from-slate-800 to-indigo-900 w-full h-full flex items-center justify-center">
            {firstLetter}
          </span>
        ) : (
          <AccountCircleIcon className="w-full h-full text-slate-500 bg-slate-900" />
        )}
      </div>
      {status && (
        <span className={`absolute ${statusOffset[size]} flex h-3 w-3 items-center justify-center rounded-full bg-slate-950 border border-slate-950`}>
          <PresenceDot status={status} />
        </span>
      )}
    </div>
  );
}

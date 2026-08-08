import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

interface PresenceDotProps {
  status: 'online' | 'offline' | 'in_call';
  size?: 'small' | 'medium' | 'large';
}

export default function PresenceDot({ status, size = 'small' }: PresenceDotProps) {
  const colorMap = {
    online: 'text-emerald-500',
    offline: 'text-slate-500',
    in_call: 'text-amber-500',
  };

  const sizeMap = {
    small: 'text-[10px]',
    medium: 'text-[14px]',
    large: 'text-[18px]',
  };

  return (
    <FiberManualRecordIcon 
      className={`${colorMap[status]} ${sizeMap[size]} transition-colors duration-300`} 
    />
  );
}

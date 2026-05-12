import { IconLoader2 } from '@tabler/icons-react';

export function Spinner({ size = 16, color }: { size?: number; color?: string }) {
  return (
    <IconLoader2
      size={size}
      stroke={1.5}
      className="spinner"
      style={color ? { color } : undefined}
    />
  );
}

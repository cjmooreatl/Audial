import type { CSSProperties, ReactNode } from 'react';

interface Props {
  num?: string | number;
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// `01 / LABEL` — the canonical section/tab label format.
export function MonoLabel({ num, children, trailing, className = '', style }: Props) {
  return (
    <span className={`mono-label ${className}`} style={style}>
      {num !== undefined && (
        <>
          <span className="ink">{typeof num === 'number' ? String(num).padStart(2, '0') : num}</span>{' '}
          /{' '}
        </>
      )}
      {children}
      {trailing && <> {trailing}</>}
    </span>
  );
}

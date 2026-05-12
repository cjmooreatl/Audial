import type { ReactNode } from 'react';
import { MonoLabel } from './MonoLabel';

interface Props {
  num?: string | number;
  label: ReactNode;
  right?: ReactNode;
  loading?: boolean;
  ruleStyle?: 'ink' | 'mist';
}

// `01 / LABEL    ___________________ [right metadata]` — the magazine
// section header, with the receiving suffix during loading.
export function SectionHeader({ num, label, right, loading, ruleStyle = 'ink' }: Props) {
  return (
    <>
      <div className="section-header">
        <div className="left">
          <MonoLabel num={num}>
            <span className="label-text">{label}</span>
            {loading && <span className="smoke" style={{ marginLeft: 8 }}>· RECEIVING.</span>}
          </MonoLabel>
        </div>
        {right && <div className="mono-label">{right}</div>}
      </div>
      <div className={ruleStyle === 'mist' ? 'rule rule-mist' : 'rule'} />
    </>
  );
}

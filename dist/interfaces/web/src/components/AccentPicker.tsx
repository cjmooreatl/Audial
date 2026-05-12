import { useState } from 'react';
import { ACCENT_SWATCHES, validateAccent } from '../brand/accent';

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

export function AccentPicker({ value, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customHex, setCustomHex] = useState(value);
  const [customError, setCustomError] = useState<string | null>(null);

  const handleCustomChange = (v: string) => {
    let cleaned = v.trim();
    if (!cleaned.startsWith('#')) cleaned = `#${cleaned}`;
    setCustomHex(cleaned);
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      const err = validateAccent(cleaned);
      if (err) {
        setCustomError(err);
      } else {
        setCustomError(null);
        onChange(cleaned);
      }
    } else if (cleaned.length === 7) {
      setCustomError('Out of range.');
    } else {
      setCustomError(null);
    }
  };

  return (
    <div className="accent-picker">
      <div className="swatch-strip">
        {ACCENT_SWATCHES.map((s) => (
          <button
            key={s.hex}
            type="button"
            className={`swatch ${value.toLowerCase() === s.hex.toLowerCase() ? 'selected' : ''}`}
            style={{ background: s.hex }}
            title={s.name}
            onClick={() => {
              onChange(s.hex);
              setCustomHex(s.hex);
              setCustomError(null);
            }}
          />
        ))}
      </div>
      <button type="button" className="custom-toggle mono-label" onClick={() => setShowCustom(!showCustom)}>
        {showCustom ? '▪ HIDE CUSTOM' : '▪ CUSTOM'}
      </button>
      {showCustom && (
        <div style={{ marginTop: 12 }}>
          <input
            className="input-text"
            value={customHex}
            placeholder="#7A1F1F"
            onChange={(e) => handleCustomChange(e.target.value)}
            spellCheck={false}
            style={{ fontFamily: 'var(--font-mono)', maxWidth: 200 }}
          />
          {customError && (
            <div className="mono-label heat" style={{ marginTop: 8 }}>
              <span className="heat">▪</span> {customError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, type ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'narrow' | 'wide' | 'full';
}

export function Modal({ open, onClose, title, children, footer, width = 'narrow' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const widthClass = width === 'wide' ? 'wide' : width === 'full' ? 'full' : '';
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-sheet ${widthClass}`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <div className="mono-label">{title}</div>
            <button className="btn-text" onClick={onClose} aria-label="Close">
              <IconX size={16} stroke={1.5} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

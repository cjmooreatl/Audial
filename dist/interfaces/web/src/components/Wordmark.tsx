import { useAudio } from '../store/audio';

interface Props {
  size?: number;
  className?: string;
}

// The brand mark — typeset, never an image. Pulses when audio is active.
export function Wordmark({ size = 22, className = '' }: Props) {
  const isPlaying = useAudio((s) => s.isPlaying);
  return (
    <span
      className={`wordmark ${isPlaying ? 'pulsing' : ''} ${className}`}
      style={{ fontSize: size }}
      aria-label="Audial"
    >
      Audial.
    </span>
  );
}

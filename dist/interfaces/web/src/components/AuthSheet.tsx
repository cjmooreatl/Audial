import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { AccentPicker } from './AccentPicker';
import { useUI } from '../store/ui';
import { useAuth } from '../store/auth';
import api from '../api';

type Step = 'email' | 'code' | 'channel';

// Multi-state auth modal: email input → 6-digit code → set channel.
export function AuthSheet() {
  const open = useUI((s) => s.authOpen);
  const intent = useUI((s) => s.authIntent);
  const closeAuth = useUI((s) => s.closeAuth);
  const refreshAuth = useAuth((s) => s.refresh);
  const channel = useAuth((s) => s.channel);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Channel setup state
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [notes, setNotes] = useState('');
  const [accent, setAccent] = useState('#7A1F1F');
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const handleCheckTimer = useRef<number | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);
      // If user is signed in but missing handle, jump straight to channel setup
      if (channel && !channel.onboardingComplete) {
        setStep('channel');
      } else {
        setStep('email');
      }
    } else {
      setEmail('');
      setVerificationId('');
      setCode(['', '', '', '', '', '', '', '']);
      setHandle('');
      setDisplayName('');
      setNotes('');
      setAccent('#7A1F1F');
      setHandleStatus('idle');
    }
  }, [open, channel]);

  const handleSendCode = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
      })
      
      if (error) {
        console.error(error)
        alert(error.message)
        return
      };
      setVerificationId(verificationId);
      setStep('code');
    } catch (err: any) {
      if (err?.code === 'rate_limited') setError('Too many attempts. Try again later.');
      else setError(err?.message ?? 'Signal lost. Retry.');
    } finally {
      setSubmitting(false);
    }
  };

  // Code input handlers
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const handleCodeChange = (i: number, v: string) => {
    const cleaned = v.replace(/\D/g, '').slice(0, 1);
    const next = [...code];
    next[i] = cleaned;
    setCode(next);
    if (cleaned && i < 7) codeRefs.current[i + 1]?.focus();
    // Auto-submit when full
    if (next.every((c) => c) && next.join('').length === 8) {
      submitCode(next.join(''));
    }
  };
  const handleCodePaste = (i: number, e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    if (pasted.length === 8) {
      e.preventDefault();
      const next = pasted.split('');
      setCode(next);
      submitCode(pasted);
    }
  };
  const handleCodeKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
    }
  };

  const submitCode = async (codeStr: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: codeStr,
        type: 'email',
      })
      
      if (error) {
        console.error(error)
        alert(error.message)
        return
        };
      setSuccess(true);
      // Slight pause so the success animation registers
      window.setTimeout(async () => {
        await refreshAuth();
        const fresh = useAuth.getState().channel;
        if (fresh && !fresh.onboardingComplete) {
          setStep('channel');
          setSuccess(false);
        } else {
          intent?.();
          closeAuth();
        }
      }, 600);
    } catch (err: any) {
      if (err?.code === 'invalid_code') setError('Wrong code. Try again.');
      else if (err?.code === 'verification_expired') setError('Code expired. Resend.');
      else if (err?.code === 'max_attempts_exceeded') setError('Too many attempts. Resend.');
      else setError(err?.message ?? 'Signal lost. Retry.');
      setCode(['', '', '', '', '', '', '', '']);
      codeRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  // Handle availability check
  useEffect(() => {
    if (handleCheckTimer.current) {
      window.clearTimeout(handleCheckTimer.current);
    }
    const trimmed = handle.trim().toLowerCase();
    if (!trimmed) {
      setHandleStatus('idle');
      return;
    }
    if (!/^[a-z0-9._]{3,20}$/.test(trimmed)) {
      setHandleStatus('invalid');
      return;
    }
    setHandleStatus('checking');
    handleCheckTimer.current = window.setTimeout(async () => {
      try {
        await api.getChannel({ handle: trimmed });
        setHandleStatus('taken');
      } catch {
        // Not found = available
        setHandleStatus('available');
      }
    }, 500);
    return () => {
      if (handleCheckTimer.current) window.clearTimeout(handleCheckTimer.current);
    };
  }, [handle]);

  const submitOnboarding = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: dbError } = await supabase
        .from('channels')
        .upsert({
          id: user.id,
          email: user.email,
          handle: handle.trim().toLowerCase(),
          display_name: displayName.trim(),
          notes: notes.trim() || null,
          accent_color: accent,
          onboarding_complete: true,
        });

      await refreshAuth();

      intent?.();

      closeAuth();
      
    } catch (err: any) {
      if (err?.code === '23505') 
        setError('Handle is in use. Try another.');
      else 
        setError(err?.message ?? 'Signal lost. Retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    step === 'email' ? 'TUNE IN. ▪' :
    step === 'code' ? 'VERIFY. ▪' :
    'SET YOUR CHANNEL. ▪';

  return (
    <Modal open={open} onClose={closeAuth} title={title} width={step === 'channel' ? 'wide' : 'narrow'}>
      {step === 'email' && (
        <div>
          <h2 className="display" style={{ fontSize: 36, marginBottom: 16 }}>Tune in.</h2>
          <p className="caption smoke" style={{ marginBottom: 32, maxWidth: 380 }}>
            Audial is a community for music people. Compile, broadcast, drift.
          </p>
          <input
            className="input-text"
            type="email"
            placeholder="your@email"
            value={email}
            autoFocus
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && email.trim()) handleSendCode();
            }}
          />
          {error && <div className="mono-label heat" style={{ marginTop: 16 }}><span className="heat">▪</span> {error}</div>}
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-fill"
              onClick={handleSendCode}
              disabled={!email.trim() || submitting}
              style={{ minWidth: 140 }}
            >
              {submitting ? <Spinner /> : 'SEND CODE'}
            </button>
          </div>
        </div>
      )}

      {step === 'code' && (
        <div>
          <p className="caption smoke" style={{ marginBottom: 32 }}>
            Code sent to <span className="ink">{email}</span>.
          </p>
          <div className="code-input">
            {code.map((c, i) => (
              <input
                key={i}
                ref={(el) => { codeRefs.current[i] = el; }}
                className={`code-box ${success ? 'success' : ''}`}
                inputMode="numeric"
                maxLength={1}
                value={c}
                autoFocus={i === 0}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onPaste={(e) => handleCodePaste(i, e)}
                onKeyDown={(e) => handleCodeKey(i, e)}
              />
            ))}
          </div>
          {error && <div className="mono-label heat" style={{ marginTop: 16 }}><span className="heat">▪</span> {error}</div>}
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn-text" onClick={() => setStep('email')}>← BACK</button>
            <button className="btn-text" onClick={handleSendCode} disabled={submitting}>
              RESEND
            </button>
          </div>
        </div>
      )}

      {step === 'channel' && (
        <div>
          <p className="caption smoke" style={{ marginBottom: 24 }}>
            Welcome to Audial. Set your channel.
          </p>
          <div className="form-row">
            <label className="mono-label">HANDLE</label>
            <input
              className="input-text"
              placeholder="your.handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9._]/gi, '').toLowerCase())}
              autoFocus
            />
            <div className="mono-label" style={{ marginTop: 8 }}>
              {handleStatus === 'idle' && <span className="smoke">3-20 chars. Lowercase, numbers, dot, underscore.</span>}
              {handleStatus === 'checking' && <span className="smoke">▪ CHECKING.</span>}
              {handleStatus === 'available' && <span><span className="accent">▪</span> AVAILABLE.</span>}
              {handleStatus === 'taken' && <span><span className="heat">▪</span> IN USE. TRY ANOTHER.</span>}
              {handleStatus === 'invalid' && <span><span className="heat">▪</span> FORMAT. 3-20 CHARS, A-Z 0-9 . _</span>}
            </div>
          </div>

          <div className="form-row">
            <label className="mono-label">DISPLAY NAME</label>
            <input
              className="input-text"
              placeholder="What we call you on air"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label className="mono-label">NOTES — OPTIONAL</label>
            <textarea
              className="input-textarea"
              placeholder="Your channel. What's on rotation, what's broadcasting, who you ride for."
              value={notes}
              maxLength={280}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-row">
            <label className="mono-label">ACCENT</label>
            <AccentPicker value={accent} onChange={setAccent} />
          </div>

          {error && <div className="mono-label heat" style={{ marginTop: 16 }}><span className="heat">▪</span> {error}</div>}
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-fill"
              onClick={submitOnboarding}
              disabled={!handle.trim() || !displayName.trim() || handleStatus !== 'available' || submitting}
              style={{ minWidth: 180 }}
            >
              {submitting ? <Spinner /> : 'COMPILE CHANNEL'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

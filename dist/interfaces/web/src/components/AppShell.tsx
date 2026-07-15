import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { IconHome, IconUserCircle, IconSearch } from '@tabler/icons-react';
import { Wordmark } from './Wordmark';
import { OnAirBar } from './OnAirBar';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { useAudio } from '../store/audio';
import { Avatar } from './Avatar';
import { formatDateline } from '../brand/format';

export function AppShell({ children }: { children: ReactNode }) {
  const channel = useAuth((s) => s.channel);
  const isAuth = useAuth((s) => s.isAuthenticated);
  const signOut = useAuth((s) => s.signOut);
  const openAuth = useUI((s) => s.openAuth);
  const markInteracted = useAudio((s) => s.markInteracted);
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Mark first interaction so autoplay-blocked audio can later resume.
  useEffect(() => {
    const onAny = () => markInteracted();
    window.addEventListener('pointerdown', onAny, { once: true });
    window.addEventListener('keydown', onAny, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onAny);
      window.removeEventListener('keydown', onAny);
    };
  }, [markInteracted]);

  const goChannel = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!isAuth) {
      openAuth(() => {
        navigate('/c/me');
      });
      return;
    }

    navigate('/c/me');
  };

  return (
    <div className="app-shell">
      {/* Top nav */}
      <header className="top-nav">
        <div className="container top-nav-inner">
          <div className="wordmark-group">
            <Link href="/" onClick={() => setMenuOpen(false)}>
              <Wordmark size={22} />
            </Link>
            <span className="mono-label beta-tag">BETA</span>
          </div>
          <nav className="top-nav-links">
            <Link
              href="/"
              className={`nav-link mono-label ${location === '/' ? 'active' : ''}`}
            >
              HOME
            </Link>
            <a
              href="#"
              className={`nav-link mono-label ${location.startsWith('/c/') ? 'active' : ''}`}
              onClick={goChannel}
            >
              CHANNEL
            </a>
            <Link
              href="/search"
              className={`nav-link mono-label ${location === '/search' ? 'active' : ''}`}
            >
              SEARCH
            </Link>
          </nav>
          <div className="top-nav-right">
            <span className="mono-label hide-mobile">{formatDateline()}</span>
            {!isAuth ? (
              <button className="btn btn-line" onClick={() => openAuth()}>TUNE IN</button>
            ) : (
              <div style={{ position: 'relative' }}>
                <button
                  className="avatar-button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Channel menu"
                >
                  <Avatar
                    url={channel?.avatarUrl}
                    size={36}
                    accent={channel?.accentColor ?? '#DCFF1A'}
                    handle={channel?.handle}
                    displayName={channel?.displayName}
                  />
                </button>
                {menuOpen && (
                  <div className="user-menu" onMouseLeave={() => setMenuOpen(false)}>
                    <button
                      className="user-menu-item mono-label"
                      onClick={() => {
                        setMenuOpen(false);
                        if (channel?.handle) navigate(`/c/${channel.handle}`);
                      }}
                    >
                      ▪ CHANNEL
                    </button>
                    <button
                      className="user-menu-item mono-label"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        setMenuOpen(false);

                        setTimeout(() => {
                          navigate('/c/me');
                        }, 0);
                      }}
                    >
                      ▪ EDIT CHANNEL
                    </button>
                    <button
                      className="user-menu-item mono-label"
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                    >
                      ▪ SIGN OFF
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="page">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="bottom-nav">
        <Link href="/" className={`bn-link ${location === '/' ? 'active' : ''}`}>
          <IconHome size={22} stroke={1.5} />
          <span>HOME</span>
        </Link>
        <a
          href="#"
          className={`bn-link ${location.startsWith('/c/') ? 'active' : ''}`}
          onClick={goChannel}
        >
          <IconUserCircle size={22} stroke={1.5} />
          <span>CHANNEL</span>
        </a>
        <Link href="/search" className={`bn-link ${location === '/search' ? 'active' : ''}`}>
          <IconSearch size={22} stroke={1.5} />
          <span>SEARCH</span>
        </Link>
      </nav>

      {/* On Air bar (or 72px reservation) */}
      <OnAirBar />
    </div>
  );
}

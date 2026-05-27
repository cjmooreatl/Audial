import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useLocation, useRoute } from 'wouter';
import { motion } from 'motion/react';
import { IconBrandSpotify, IconShare, IconVolume, IconVolumeOff } from '@tabler/icons-react';
import api, { type ChannelSetSummary } from '../api';
import { SectionHeader } from '../components/SectionHeader';
import { CoverArt } from '../components/CoverArt';
import { Avatar } from '../components/Avatar';
import { ConnectSpotifyModal } from '../components/ConnectSpotifyModal';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { useAudio } from '../store/audio';
import { formatDuration } from '../brand/format';
import { supabase } from '../lib/supabase';

// Stagger config for the channel-entry "tuning in" choreography. Each section
// fades in with a left-to-right rule animation that feels like ink being laid
// down on a fresh page.
const SECTION_STAGGER = 0.08; // seconds between sections
const SECTION_DURATION = 0.32;

function Section({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="channel-section"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: SECTION_DURATION,
        delay: 0.08 + index * SECTION_STAGGER,
        ease: [0.2, 0.85, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

export function ChannelPage() {
  const [, params] = useRoute('/c/:handle');
  const [, navigate] = useLocation();
  const handleParam = params?.handle ?? '';
  const isAuth = useAuth((s) => s.isAuthenticated);
  const isReady = useAuth((s) => s.isReady);
  const myChannel = useAuth((s) => s.channel);
  const openAuth = useUI((s) => s.openAuth);
  const openEditChannel = useUI((s) => s.openEditChannel);
  const playChannel = useAudio((s) => s.playChannel);
  const pause = useAudio((s) => s.pause);
  const audioCurrent = useAudio((s) => s.current);
  const isPlaying = useAudio((s) => s.isPlaying);
  const hasInteracted = useAudio((s) => s.hasInteracted);
  const [muted, setMuted] = useState(false);
  const [connectSpotifyOpen, setConnectSpotifyOpen] = useState(false);

  // Special handle "me" → redirect to current user, or auth modal
  useEffect(() => {
    if (handleParam === 'me') {
      if (!isReady) return; // wait until we know for sure

      if (isAuth && myChannel?.handle) {
        navigate('/c/${myChannel.handle}', { replace: true });
      } else if (!isAuth) {
        openAuth(() => {
          const c = useAuth.getState().channel;

          if (c?.handle) {
            navigate('/c/${c.handle}', { replace: true });
          }
        });
      }
    }
  }, [handleParam, isAuth, myChannel, navigate, openAuth]);

  const { data, error, mutate, isLoading } = useSWR(
    handleParam && handleParam !== 'me'
    ? ['channel', handleParam]
    : null,

    async () => {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('handle', handleParam.toLowerCase())
        .single();
      
      if (profileError || !profile) {
        throw profileError || new Error('Channel not found');
      }
      
      return {
        channel: {
          id: profile.id,
          email: profile.email,
          handle: profile.handle,
          displayName: profile.display_name,
          notes: profile.notes,
          accentColor: profile.accent_color || '#000000',
          featuredSetId: profile.featured_set_id,
          coSigns: [],
          avatarUrl: profile.avatar_url,
          onboardingComplete: profile.onboarding_complete,
          counts: {
            sets: 0,
            tunedIn: 0,
            tunedTo: 0,
          },
        },
        sets: [],
        featuredSet: null,
        viewerHasSubscribed: false,
        viewerIsOwner:
          myChannel?.id === profile.id,
      };
    }
  );

  console.log('CHANNEL DATA:', data);
  console.log('CHANNEL ERROR:', error);
  console.log('HANDLE PARAM:', handleParam);
  console.log('MY CHANNEL:', myChannel);

  const [autoPlayed, setAutoPlayed] = useState(false);

  // Auto-play featured set on entry, but only after the user has interacted
  // (so we don't fight browser autoplay policy on first load).
  useEffect(() => {
    if (!data || autoPlayed || muted) return;
    if (!hasInteracted) return; // wait until something gets us past the gate
    const ch = (data as any).channel;
    const featured = (data as any).featuredSet;
    if (featured && featured.tracks?.length) {
      playChannel(featured.tracks, {
        setId: featured.id,
        setTitle: featured.title,
        ownerHandle: ch.handle,
        ownerAccentColor: ch.accent_color,
      });
      setAutoPlayed(true);
    }
  }, [data, autoPlayed, hasInteracted, muted, playChannel]);

  const subscribe = async () => {
    if (!data) return;
    if (!isAuth) {
      openAuth(() => subscribe());
      return;
    }
    const ch = (data as any).channel;
    if ((data as any).viewerHasSubscribed) {
      await api.unsubscribe({ channelId: ch.id });
    } else {
      await api.subscribe({ channelId: ch.id });
    }
    mutate();
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: `Audial — ${(data as any)?.channel?.displayName}` });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {}
    }
  };

  if (handleParam === 'me') return null;

  if (error) {
    return (
      <div className="container" style={{ padding: '96px 0' }}>
        <h2 className="heading">Channel not found.</h2>
        <button className="btn-text" onClick={() => navigate('/')} style={{ marginTop: 16 }}>← BACK</button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="container">
        <div className="channel-masthead">
          <div>
            <div className="skeleton" style={{ width: 120, height: 120, borderRadius: '50%' }} />
            <div className="skeleton" style={{ height: 64, width: 280, marginTop: 24 }} />
            <div className="skeleton" style={{ height: 14, width: 120, marginTop: 12 }} />
          </div>
        </div>
      </div>
    );
  }

  const ch = (data as any).channel;

  if (!ch) {
    return (
      <div className="container" style={{ padding: '96px 0' }}>
        <h2 className="heading">Channel unavailable.</h2>
      </div>
    );
  }
  
  const sets: ChannelSetSummary[] = (data as any).sets;
  const featured = (data as any).featuredSet;
  const viewerHasSubscribed: boolean = (data as any).viewerHasSubscribed;
  const viewerIsOwner: boolean = (data as any).viewerIsOwner;

  // Section index — used by the staggered reveal so each section enters in
  // sequence after the masthead.
  let sectionIdx = 0;

  return (
    <div
      className="channel-page"
      style={{ '--accent': ch.accent_color } as React.CSSProperties}
    >
      <div className="channel-accent-bar" key={ch.handle} />
      <div className="container">
        {/* Masthead — fades in immediately, no stagger */}
        <motion.div
          className="channel-masthead"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.2, 0.85, 0.25, 1] }}
        >
          <div>
            <Avatar
              url={ch.avatarUrl}
              size={120}
              accent={ch.accentColor}
              handle={ch.handle}
              displayName={ch.displayName}
            />
            <h1 className="display" style={{ marginTop: 24, fontSize: 'clamp(40px, 7vw, 64px)' }}>
              {ch.displayName}
            </h1>
            <div className="mono-meta smoke" style={{ marginTop: 8 }}>@{ch.handle}</div>
            {ch.notes && (
              <p className="caption" style={{ marginTop: 16, maxWidth: 480 }}>{ch.notes}</p>
            )}
          </div>
          <div>
            <div className="mono-meta smoke" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 24 }}>
              {ch.counts.sets} SETS · {ch.counts.tunedIn} TUNED IN · {ch.counts.tunedTo} TUNED TO
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {viewerIsOwner ? (
                <>
                  <button className="btn btn-line" onClick={openEditChannel}>EDIT CHANNEL</button>
                  <button
                    className="btn btn-line"
                    onClick={() => setConnectSpotifyOpen(true)}
                  >
                    <IconBrandSpotify size={14} stroke={1.5} /> CONNECT SPOTIFY
                  </button>
                </>
              ) : (
                <button
                  className={viewerHasSubscribed ? 'btn btn-fill' : 'btn btn-line'}
                  onClick={subscribe}
                >
                  {viewerHasSubscribed ? 'TUNED IN' : 'SUBSCRIBE'}
                </button>
              )}
              <button className="btn btn-line" onClick={share}>
                <IconShare size={14} stroke={1.5} /> SHARE
              </button>
            </div>
          </div>
        </motion.div>

        {/* Now Playing */}
        {featured && (
          <Section index={sectionIdx++}>
            <SectionHeader num={1} label="NOW PLAYING" />
            <div className="channel-featured" style={{ marginTop: 24 }}>
              <div className="cover-wrap">
                <div className="now-playing-tab">
                  {audioCurrent?.setId === featured.id && isPlaying ? 'ON AIR' : 'NOW PLAYING'}
                </div>
                <button
                  className="mute-toggle"
                  onClick={() => {
                    if (muted) {
                      setMuted(false);
                    } else {
                      setMuted(true);
                      pause();
                    }
                  }}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? <IconVolumeOff size={14} stroke={1.5} /> : <IconVolume size={14} stroke={1.5} />}
                </button>
                <CoverArt
                  url={featured.coverUrl}
                  size={800}
                  isPlaying={audioCurrent?.setId === featured.id && isPlaying}
                  hover={false}
                  alt={featured.title}
                  onClick={() => navigate(`/s/${featured.id}`)}
                />
              </div>
              <div>
                <h2 className="heading" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => navigate(`/s/${featured.id}`)}>
                  {featured.title}
                </h2>
                <div className="mono-meta smoke" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                  {featured.trackCount} CUTS · {formatDuration(featured.totalDurationMs)}
                </div>
                {featured.description && (
                  <p className="caption" style={{ marginBottom: 24 }}>{featured.description}</p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-fill"
                    onClick={() => {
                      setMuted(false);
                      playChannel(featured.tracks, {
                        setId: featured.id,
                        setTitle: featured.title,
                        ownerHandle: ch.handle,
                        ownerAccentColor: ch.accentColor,
                      });
                    }}
                  >
                    ▶ PLAY
                  </button>
                  <button className="btn btn-line" onClick={() => navigate(`/s/${featured.id}`)}>
                    OPEN SET
                  </button>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Co-signs */}
        {ch.coSigns?.length > 0 && (
          <Section index={sectionIdx++}>
            <SectionHeader num={featured ? 2 : 1} label="CO-SIGNS" />
            <div className="cosign-strip" style={{ marginTop: 24 }}>
              {ch.coSigns.map((c: any, i: number) => (
                <div key={i} className="cosign">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt={c.name} />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--mist)' }} />
                  )}
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* In rotation (all sets) */}
        <Section index={sectionIdx++}>
          <SectionHeader
            num={(featured ? 1 : 0) + (ch.coSigns?.length ? 1 : 0) + 1}
            label="IN ROTATION"
            right={`${sets.length} SETS`}
          />
          {sets.length === 0 ? (
            <div className="empty-state">
              <h3 className="heading">No transmissions yet.</h3>
              {viewerIsOwner && (
                <button className="cta" onClick={() => useUI.getState().openCompile()}>
                  COMPILE A SET
                </button>
              )}
            </div>
          ) : (
            <div className="sets-grid">
              {sets.map((s) => (
                <div key={s.setId} className="sets-grid-card" onClick={() => navigate(`/s/${s.setId}`)}>
                  <CoverArt url={s.coverUrl} size={400} alt={s.title} />
                  <div className="mono-meta smoke" style={{ fontSize: 11, marginTop: 12 }}>
                    {s.trackCount} CUTS · {formatDuration(s.totalDurationMs)}
                  </div>
                  <div className="subhead" style={{ marginTop: 4 }}>{s.title}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
      <ConnectSpotifyModal
        open={connectSpotifyOpen}
        onClose={() => setConnectSpotifyOpen(false)}
      />
    </div>
  );
}

import { useState } from 'react';
import useSWR from 'swr';
import { motion } from 'motion/react';
import { IconPlus } from '@tabler/icons-react';
import api, { type FeedTab, type FeedCard } from '../api';
import { SetCardCompact, SetCardHero } from '../components/SetCard';
import { CoverArt } from '../components/CoverArt';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { phraseForToday, sectionThemeFor, issueNumber } from '../brand/phrases';
import { formatDateline, formatDuration } from '../brand/format';
import { useLocation } from 'wouter';


const TABS: { id: FeedTab; label: string }[] = [
  { id: 'subscribed', label: 'SUBSCRIBED' },
  { id: 'on-rotation', label: 'ON ROTATION' },
  { id: 'heavy-rotation', label: 'HEAVY ROTATION' },
  { id: 'drift', label: 'DRIFT' },
];

export function HomePage() {
  const [tab, setTab] = useState<FeedTab>('on-rotation');
  const isAuth = useAuth((s) => s.isAuthenticated);
  const openAuth = useUI((s) => s.openAuth);
  const openShare = useUI((s) => s.openShare);

  const { data, isLoading } = useSWR(['/getHomeFeed', tab], () => api.getHomeFeed({ tab, limit: 24 }));
  const cards: FeedCard[] = (data as any)?.cards ?? [];
  const substituted: boolean = (data as any)?.substituted ?? false;

  const phrase = phraseForToday();

  const handlePlus = () => {
    if (!isAuth) { openAuth(() => openShare()); return; }
    openShare();
  };

  return (
    <div className="container">
      {/* Utility strip */}
      <div className="home-utility">
        <div>
          {formatDateline()} — <b>ISSUE {issueNumber()}</b>
        </div>
        <div>
          WORLDWIDE EDITION <span className="blk">▪</span> VOL.1
        </div>
      </div>

      {/* Masthead */}
      <div className="home-masthead">
        <div className="issue-watermark">{issueNumber()}</div>
        <h1 className="display-xl">
          <span className="display-emph-lead">{phrase.before}</span>
          <em className="display-emph">{phrase.emph}</em>
          {phrase.after}
        </h1>
      </div>

      {/* Tab row — the active underline animates between tabs via motion's
         shared layoutId, so it slides smoothly rather than snapping. */}
      <div className="home-tabs">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            className={`home-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="num">{String(i + 1).padStart(2, '0')}</span> / {t.label}
            {tab === 'subscribed' && t.id === 'subscribed' && substituted && !isAuth && (
              <span className="smoke" style={{ marginLeft: 6 }}>(PREVIEW)</span>
            )}
            {tab === t.id && (
              <motion.div
                layoutId="home-tab-underline"
                className="tab-underline"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
          </button>
        ))}
        <div className="home-plus-wrap">
          <button
            className="home-plus"
            onClick={handlePlus}
            aria-label="Share a set"
          >
            <IconPlus size={18} stroke={1.5} />
          </button>
        </div>
      </div>

      {/* Feed — content fades on tab switch but layout stays stable */}
      <div style={{ minHeight: '70vh' }}>
        {isLoading && !cards.length && <FeedSkeleton />}

        {cards.length === 0 && !isLoading && (
          <div className="empty-state">
            <h2 className="heading">
              {tab === 'subscribed' ? 'Tune to a channel to fill this feed.' : 'No transmissions yet.'}
            </h2>
            <button className="cta" onClick={handlePlus}>
              SHARE A SET
            </button>
          </div>
        )}

        {cards.length > 0 && (
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16 }}
          >
            <FeedBlocks cards={cards} tab={tab} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function FeedBlocks({ cards, tab }: { cards: FeedCard[]; tab: FeedTab }) {
  if (!cards.length) return null;
  const [hero, ...rest] = cards;
  const grid1 = rest.slice(0, 8);
  const editorialPicks = rest.slice(8, 13);
  const grid2 = rest.slice(13, 21);

  return (
    <>
      <SetCardHero card={hero} isFirstHero />
      {grid1.length > 0 && (
        <div className="compact-grid">
          {grid1.map((c, i) => (
            <SetCardCompact key={c.setId} card={c} index={i + 1} tab={tab} isPick={i === 1} />
          ))}
        </div>
      )}
      {editorialPicks.length > 0 && (
        <EditorialRow cards={editorialPicks} tab={tab} sectionIdx={2} />
      )}
      {grid2.length > 0 && (
        <div className="compact-grid">
          {grid2.map((c, i) => (
            <SetCardCompact key={c.setId} card={c} index={grid1.length + editorialPicks.length + i + 1} tab={tab} />
          ))}
        </div>
      )}
    </>
  );
}

function EditorialRow({
  cards,
  tab,
  sectionIdx,
}: {
  cards: FeedCard[];
  tab: FeedTab;
  sectionIdx: number;
}) {
  const [, navigate] = useLocation();
  const themeIdx = sectionIdx + 4;
  return (
    <div className="editorial-row">
      <div className="ed-left">
        <div className="ed-rotated">{String(themeIdx).padStart(2, '0')}</div>
        <div className="mono-label" style={{ marginBottom: 14 }}>
          <span className="ink">{String(themeIdx).padStart(2, '0')}</span> / {sectionThemeFor(tab, sectionIdx)}
        </div>
        <p className="caption smoke" style={{ maxWidth: 360 }}>
          Selectors broadcasting deep into the morning. Filed across the platform.
        </p>
      </div>
      <div className="ed-strip">
        {cards.map((c) => (
          <div key={c.setId} className="ed-card" onClick={() => navigate(`/s/${c.setId}`)}>
            <CoverArt url={c.coverUrl} size={400} alt={c.title} />
            <div className="mono-meta smoke" style={{ fontSize: 10, marginTop: 8 }}>
              {c.trackCount} · {formatDuration(c.totalDurationMs)}
            </div>
            <div className="subhead" style={{ fontSize: 15, marginTop: 4 }}>{c.title}</div>
            <div className="caption smoke" style={{ marginTop: 4 }}>by @{c.owner.handle}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <>
      <div className="set-card-hero">
        <div className="cover skeleton" style={{ aspectRatio: '1 / 1' }} />
        <div className="hero-meta">
          <div className="skeleton" style={{ height: 11, width: 120, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 56, width: '80%', marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 14, width: 200, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 14, width: 280 }} />
        </div>
      </div>
      <div className="compact-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="set-card-compact">
            <div className="skeleton" style={{ height: 11, width: 100, marginBottom: 12 }} />
            <div className="cover skeleton" style={{ aspectRatio: '1 / 1' }} />
            <div className="skeleton" style={{ height: 11, width: 100, marginTop: 12 }} />
            <div className="skeleton" style={{ height: 17, width: 160, marginTop: 8 }} />
          </div>
        ))}
      </div>
    </>
  );
}

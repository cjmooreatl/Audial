import { useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { motion } from 'motion/react';
import { AppShell } from './components/AppShell';
import { AudioController } from './components/AudioController';
import { AuthSheet } from './components/AuthSheet';
import { CompileSetModal } from './components/CompileSetModal';
import { ShareSetModal } from './components/ShareSetModal';
import { EditChannelModal } from './components/EditChannelModal';
import { EditSetModal } from './components/EditSetModal';
import { LinksModal } from './components/LinksModal';
import { AddToHomeScreenModal } from './components/AddToHomeScreenModal';
import { HomePage } from './pages/Home';
import { ChannelPage } from './pages/Channel';
import { SearchPage } from './pages/Search';
import { SetDetailPage } from './pages/SetDetail';
import { useAuth, bootstrapAuth } from './store/auth';
import './index.css';
import './pages.css';

// Wrap each routed page in a short opacity fade-in. The motion.div remounts
// on every location change (key={location}), so the new page starts at opacity
// 0 and animates to 1. We deliberately do NOT use AnimatePresence with an exit
// animation here: under mode="wait" the exit promise can fail to resolve when
// other state updates interleave with the transition (e.g. the on-air bar's
// progress interval firing during navigation), leaving the new page unmounted
// and the screen blank until refresh. Enter-only is stable and visually
// indistinguishable for a 120ms fade.
function PageFrame({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return (
    <motion.div
      key={location}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const refresh = useAuth((s) => s.refresh);

  useEffect(() => {
    refresh();
    bootstrapAuth();
  }, [refresh]);

  return (
    <>
      <AppShell>
        <PageFrame>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/search" component={SearchPage} />
            <Route path="/c/:handle" component={ChannelPage} />
            <Route path="/s/:setId" component={SetDetailPage} />
            <Route>
              <div style={{ padding: '96px 24px' }}>
                <h1 className="display">Off air.</h1>
                <p className="caption smoke" style={{ marginTop: 16 }}>Page not found.</p>
              </div>
            </Route>
          </Switch>
        </PageFrame>
      </AppShell>
      <AudioController />
      <AuthSheet />
      <CompileSetModal />
      <ShareSetModal />
      <EditChannelModal />
      <EditSetModal />
      <LinksModal />
      <AddToHomeScreenModal />
    </>
  );
}

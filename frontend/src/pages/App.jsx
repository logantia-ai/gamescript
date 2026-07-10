// Authenticated app shell: Header + Sidebar (desktop) / BottomNav (mobile) + module routes.
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { BottomNav } from '../components/layout/BottomNav';
import { ModuleWatermark } from '../components/ui/Effects';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';

import { Dashboard } from '../components/modules/Dashboard';
import { SharpReport } from '../components/modules/SharpReport';
import { FilmRoom } from '../components/modules/FilmRoom';
import { ScoutReport } from '../components/modules/ScoutReport';
import { Chalkbreaker } from '../components/modules/Chalkbreaker';
import { RedZone } from '../components/modules/RedZone';
import { Coordinator } from '../components/modules/Coordinator';
import { SundayMode } from '../components/modules/SundayMode';
import { TheRecord } from '../components/modules/TheRecord';
import { StackBuilder } from '../components/modules/StackBuilder';
import { LateSwap } from '../components/modules/LateSwap';
import { Bankroll } from '../components/modules/Bankroll';
import { PortfolioBuilder } from '../components/modules/PortfolioBuilder';
import { ContestIQ } from '../components/modules/ContestIQ';
import { ContestSim } from '../components/modules/ContestSim';
import { Debrief } from '../components/modules/Debrief';
import { GTOMode } from '../components/modules/GTOMode';
import { OpponentModel } from '../components/modules/OpponentModel';
import { BiasReport } from '../components/modules/BiasReport';

export function App() {
  const { profile } = useAuth();
  const { tier } = useSubscription();

  // Redirect to onboarding if not yet completed (skipped in mock mode where it's true).
  if (profile && profile.onboarding_complete === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header tier={tier} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div className="gs-sidebar" style={{ display: 'flex' }}>
          <Sidebar />
        </div>
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 80px' }}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="sharp-report" element={<SharpReport />} />
            <Route path="film-room" element={<FilmRoom />} />
            <Route path="scout-report" element={<ScoutReport />} />
            <Route path="chalkbreaker" element={<Chalkbreaker />} />
            <Route path="red-zone" element={<RedZone />} />
            <Route path="coordinator" element={<Coordinator />} />
            <Route path="sunday-mode" element={<SundayMode />} />
            <Route path="the-record" element={<TheRecord />} />
            <Route path="stack-builder" element={<StackBuilder />} />
            <Route path="late-swap" element={<LateSwap />} />
            <Route path="bankroll" element={<Bankroll />} />
            <Route path="portfolio-builder" element={<PortfolioBuilder />} />
            <Route path="contest-iq" element={<ContestIQ />} />
            <Route path="contest-sim" element={<ContestSim />} />
            <Route path="debrief" element={<Debrief />} />
            <Route path="gto-mode" element={<GTOMode />} />
            <Route path="opponent-model" element={<OpponentModel />} />
            <Route path="bias-report" element={<BiasReport />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </main>
      </div>
      <div className="gs-bottomnav">
        <BottomNav />
      </div>
      {/* Faint GS_Shield watermark, fixed bottom-right on every module */}
      <ModuleWatermark />
    </div>
  );
}

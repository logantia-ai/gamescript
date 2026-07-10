// Onboarding — GS_Crest splash, 8 module screens, profile, then redirect.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';

const MODULES = [
  { icon: '◈', name: 'Sharp Report', desc: 'What the smart money already knows. Top 5 decisions every week before you touch an optimizer.' },
  { icon: '◎', name: 'Film Room', desc: 'Where champions prepare before Sunday arrives. Seven step research process. Every source. Every signal.' },
  { icon: '◆', name: 'Scout Report', desc: "Know exactly who you're starting and why. Data-supported play or emotional bias — get the verdict." },
  { icon: '⬡', name: 'Chalkbreaker', desc: 'Everyone else is on chalk. Break it. Contrarian GPP engine that finds leverage before the field catches on.' },
  { icon: '◻', name: 'Red Zone', desc: 'Get your lineup where it needs to score. Full audit covering correlation, salary, bias, and game script.' },
  { icon: '▲', name: 'The Coordinator', desc: 'Your AI strategist. In your ear. Every week. Direct, opinionated, relentlessly focused on your edge.' },
  { icon: '⊕', name: 'Sunday Mode', desc: "Time's short. Three steps to a locked lineup. Your fast path when Sunday morning hits." },
  { icon: '▣', name: 'The Record', desc: "Receipts don't lie. Every lineup. Every week. Every result. Your proof of concept building all season." },
];

const center = {
  minHeight: '100vh',
  background: 'transparent',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 24px',
  fontFamily: 'var(--font-data)',
  color: 'var(--chalk)',
  textAlign: 'center',
};

export function Onboarding() {
  const [step, setStep] = useState(0); // 0=splash, 1-8=modules, 9=profile
  const [profileForm, setProfileForm] = useState({ favorite_team: 'BUF', experience_level: 'intermediate', primary_contest_type: 'gpp', bankroll_range: '50-200' });
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  async function complete() {
    if (isSupabaseConfigured && user) {
      await supabase.from('profiles').update({ ...profileForm, onboarding_complete: true }).eq('id', user.id);
      await refreshProfile?.();
    }
    navigate('/app');
  }

  if (step === 0) {
    return (
      <div style={center}>
        <div className="gs-crest-glow" style={{ position: 'relative', width: '260px', maxWidth: '100%', margin: '0 auto 20px' }}>
          <img src="/assets/GS_Crest.png" width="260" alt="" aria-hidden="true" style={{ position: 'relative', zIndex: 1, display: 'block', width: '260px', maxWidth: '100%', margin: '0 auto', objectFit: 'contain', mixBlendMode: 'screen', background: 'transparent' }} />
        </div>
        <img src="/assets/GS_Name.png" height="70" alt="Game Script" style={{ maxWidth: '100%', objectFit: 'contain', marginBottom: '28px', mixBlendMode: 'screen', background: 'transparent' }} />
        <div style={{ fontSize: '10px', letterSpacing: '5px', color: 'var(--copper)', marginBottom: '12px' }}>NFL · DRAFTKINGS · INTELLIGENCE</div>
        <div style={{ fontSize: '13px', color: 'var(--silver)', lineHeight: 1.8, marginBottom: '28px', maxWidth: '320px' }}>
          Stop paying for 36 websites.<br />Start understanding one process.
        </div>
        <Button onClick={() => setStep(1)}>Read The Script</Button>
      </div>
    );
  }

  if (step >= 1 && step <= 8) {
    const mod = MODULES[step - 1];
    return (
      <div style={center}>
        <div style={{ maxWidth: '380px', width: '100%' }}>
          <div style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--chalk-dim)', marginBottom: '20px' }}>
            YOUR PLATFORM — {step} OF 8
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '16px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>{mod.icon}</div>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--copper)', marginBottom: '6px' }}>{mod.name}</div>
            <div style={{ fontSize: '14px', color: 'var(--chalk)', lineHeight: 1.7 }}>{mod.desc}</div>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
            {MODULES.map((_, i) => (
              <div key={i} style={{ flex: 1, height: '2px', background: i < step ? 'var(--copper)' : 'var(--border)', transition: 'background 0.3s' }} />
            ))}
          </div>
          <Button onClick={() => setStep(step + 1)}>{step === 8 ? 'Set Up Your Profile' : 'Next'}</Button>
        </div>
      </div>
    );
  }

  // Step 9 — profile setup
  return (
    <div style={center}>
      <div style={{ maxWidth: '380px', width: '100%', textAlign: 'left' }}>
        <div style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--copper)', marginBottom: '20px', textAlign: 'center' }}>SET UP YOUR PROFILE</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <Label>Favorite team</Label>
            <Input value={profileForm.favorite_team} onChange={(e) => setProfileForm({ ...profileForm, favorite_team: e.target.value })} />
          </div>
          <div>
            <Label>Experience level</Label>
            <Select value={profileForm.experience_level} onChange={(e) => setProfileForm({ ...profileForm, experience_level: e.target.value })} options={['beginner', 'intermediate', 'advanced']} />
          </div>
          <div>
            <Label>Primary contest type</Label>
            <Select value={profileForm.primary_contest_type} onChange={(e) => setProfileForm({ ...profileForm, primary_contest_type: e.target.value })} options={[{ value: 'gpp', label: 'GPP' }, { value: 'cash', label: 'Cash' }]} />
          </div>
          <div>
            <Label>Bankroll range</Label>
            <Select value={profileForm.bankroll_range} onChange={(e) => setProfileForm({ ...profileForm, bankroll_range: e.target.value })} options={['0-50', '50-200', '200-1000', '1000+']} />
          </div>
          <Button onClick={complete} style={{ marginTop: '8px' }}>Enter Game Script</Button>
        </div>
      </div>
    </div>
  );
}

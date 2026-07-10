// Register page → onboarding.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { AuthShell } from './_AuthShell';

export function Register() {
  const { signUp, isMockMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await signUp(email, password);
    setBusy(false);
    if (error) setErr(error.message);
    else navigate('/onboarding');
  }

  return (
    <AuthShell title="Create Account" subtitle="Start free. No card required.">
      {isMockMode && (
        <div style={{ fontSize: '11px', color: 'var(--copper)', marginBottom: '16px', textAlign: 'center' }}>
          Mock mode — registration jumps straight to onboarding.
        </div>
      )}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <Label>Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        {err && <div style={{ fontSize: '11px', color: 'var(--red-bright)' }}>{err}</div>}
        <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Start Free'}</Button>
      </form>
      <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--silver)', textAlign: 'center' }}>
        Already have an account? <Link to="/login">Sign In</Link>
      </div>
    </AuthShell>
  );
}

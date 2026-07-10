// Generic scaffold body for modules not yet fully built.
// Renders the module's purpose + a spec checklist, gated by tier.
import { PageWrapper } from '../layout/PageWrapper';
import { PaywallGate } from '../ui/PaywallGate';
import { Card } from '../ui/Card';
import { MODULE_BY_KEY } from './registry';

export function ModuleStub({ moduleKey, eyebrow = 'MODULE', spec = [] }) {
  const m = MODULE_BY_KEY[moduleKey];

  const body = (
    <PageWrapper eyebrow={eyebrow} title={m.name} desc={m.desc}>
      <Card>
        <div className="eyebrow" style={{ marginBottom: '12px' }}>Scaffold — spec outline</div>
        <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--silver)', fontFamily: 'var(--font-data)', fontSize: '13px', lineHeight: 2 }}>
          {spec.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--chalk-dim)', fontFamily: 'var(--font-data)' }}>
          This module is wired into nav, routing, and tier gating. Build out the UI + Claude/Supabase calls here.
        </div>
      </Card>
    </PageWrapper>
  );

  return m.feature ? <PaywallGate feature={m.feature}>{body}</PaywallGate> : body;
}

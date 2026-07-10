// MODULE 7 — The Coordinator. AI strategy chat.
import { useState, useRef, useEffect } from 'react';
import { PageWrapper } from '../../layout/PageWrapper';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { Spinner } from '../../ui/Spinner';
import { useSubscription } from '../../../hooks/useSubscription';
import { askClaude } from '../../../lib/claude';
import ReactMarkdown from 'react-markdown';

const SYSTEM = `You are The Coordinator — the elite AI strategy engine inside Game Script.
Direct. Opinionated. Proactive. Challenge assumptions aggressively. Correct bias immediately.
Surface opportunities the user is missing. Call out mistakes by name. Teach the process. Make users better.

INCENTIVE CLAUSE AWARENESS:
Late in NFL seasons (Weeks 12-18), many players are chasing contract incentives.
A receiver 50 yards from a 1,000-yard incentive target will run harder routes
and fight for targets. A QB near a passing yards incentive will stay in games
longer. When relevant, factor incentive situations into your analysis.
Signs of incentive hunting: targets to specific players increase late season,
players returning from injury push through minor issues, game script abandonment
to get stats even in blowouts. Always mention if a player appears to be in
an incentive-relevant situation.`;

export function Coordinator() {
  const { hasFeature } = useSubscription();
  const unlimited = hasFeature('coordinator_unlimited');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "I'm The Coordinator. Tell me your slate plan and I'll tell you where you're wrong." },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(0);
  const endRef = useRef(null);

  const remaining = unlimited ? Infinity : Math.max(0, 5 - used);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || remaining <= 0) return;
    const userMsg = { role: 'user', text: input };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setBusy(true);
    if (!unlimited) setUsed((u) => u + 1);

    const convo = history.map((m) => `${m.role === 'user' ? 'User' : 'Coordinator'}: ${m.text}`).join('\n');
    const { text } = await askClaude({ module: 'coordinator', system: SYSTEM, prompt: convo });
    setMessages((m) => [...m, { role: 'assistant', text }]);
    setBusy(false);
  }

  return (
    <PageWrapper
      eyebrow="AI STRATEGIST"
      title="The Coordinator"
      desc="Direct. Opinionated. In your ear every week."
      actions={<Badge color={remaining ? 'var(--copper)' : 'var(--red-bright)'}>{unlimited ? 'UNLIMITED' : `${remaining}/5 msgs left`}</Badge>}
    >
      <Card style={{ display: 'flex', flexDirection: 'column', height: '60vh', padding: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Brand watermark — centered GS_Shield behind the chat, felt not seen */}
        <img
          src="/assets/GS_Shield.png"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '220px',
            height: 'auto',
            objectFit: 'contain',
            opacity: 0.08,
            pointerEvents: 'none',
            zIndex: 0,
            filter: 'drop-shadow(0 0 20px rgba(196,118,42,0.15))',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                background: m.role === 'user' ? 'var(--green-bg)' : 'var(--navy)',
                border: `1px solid ${m.role === 'user' ? 'var(--green-bright)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '10px 14px',
                fontFamily: 'var(--font-data)',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--chalk)',
              }}
            >
              <ReactMarkdown>{m.text}</ReactMarkdown>
            </div>
          ))}
          {busy && <Spinner size={16} />}
          <div ref={endRef} />
        </div>
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px', display: 'flex', gap: '8px' }}>
          <Input
            voice
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={remaining > 0 ? 'Ask The Coordinator…' : 'Weekly limit reached — upgrade to Coordinator'}
            disabled={remaining <= 0}
          />
          <Button onClick={send} disabled={busy || remaining <= 0}>Send</Button>
        </div>
      </Card>
    </PageWrapper>
  );
}

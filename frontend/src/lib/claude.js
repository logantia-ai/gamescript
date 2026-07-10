// ============================================================
// Claude client — hybrid mode.
// Calls go through the backend (api/claude) so the API key never
// ships to the browser. Without a backend, returns a mock response
// so Claude-powered modules remain explorable.
// ============================================================

const apiBase = import.meta.env.VITE_API_BASE_URL || '';
export const isClaudeConfigured = Boolean(apiBase);

export const MODEL = 'claude-opus-4-8';

/**
 * Ask Claude a question through the backend proxy.
 * @param {object} args
 * @param {string} args.system  System prompt.
 * @param {string} args.prompt  User message.
 * @param {string} [args.module] Which module is calling (for logging/routing).
 * @returns {Promise<{text: string, mock?: boolean}>}
 */
export async function askClaude({ system, prompt, module = 'generic' }) {
  if (!isClaudeConfigured) return mockResponse(module, prompt);

  try {
    const res = await fetch(`${apiBase}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, prompt, module, model: MODEL }),
    });
    if (!res.ok) throw new Error(`Claude proxy ${res.status}`);
    const data = await res.json();
    return { text: data.text };
  } catch (err) {
    // Graceful fallback so the UI never hard-fails in dev.
    // eslint-disable-next-line no-console
    console.warn('[Game Script] Claude call failed, using mock:', err.message);
    return mockResponse(module, prompt);
  }
}

function mockResponse(module, prompt) {
  const text = `**[MOCK — ${module}]**

This is a placeholder response. Wire up the backend \`/api/claude\` proxy
(and set \`VITE_API_BASE_URL\`) to get live Claude output.

Echoing your input so the UI is testable:

> ${(prompt || '').slice(0, 280)}${prompt && prompt.length > 280 ? '…' : ''}

---
*Sample structured output:*

- **GRADE:** B
- **VERDICT:** Data-supported with one flag
- **CONFIDENCE:** 72% data-backed / 28% speculative
- **RED FLAGS:** Ownership spike risk if news breaks
- **RECOMMENDATION:** Hold in GPP, fade in cash`;
  return Promise.resolve({ text, mock: true });
}

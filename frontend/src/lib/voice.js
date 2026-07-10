// Helpers for writing speech-transcribed text into controlled React inputs.

// React overrides the `value` setter on input/textarea elements, so assigning
// `el.value = x` directly won't fire onChange. Use the native prototype setter
// and dispatch a bubbling `input` event so React's onChange picks up the change.
export function setNativeFieldValue(el, text, { numeric = false } = {}) {
  if (!el || !text) return;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

  let next;
  if (numeric) {
    // Number fields: keep digits/decimal/sign only, replace rather than append.
    next = text.replace(/[^0-9.\-]/g, '');
  } else {
    const current = el.value || '';
    next = current ? `${current.replace(/\s+$/, '')} ${text}` : text;
  }

  if (setter) setter.call(el, next);
  else el.value = next;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

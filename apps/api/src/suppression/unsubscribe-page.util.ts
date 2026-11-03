/**
 * Self-contained unsubscribe confirmation page.
 *
 * RFC 8058 one-click (POST /unsubscribe/:token) stays immediate for mail
 * clients, but the human-facing link in the campaign footer lands here
 * first. The actual suppression only happens when the recipient finishes a
 * short 3-step confirmation (intent → reason → type the address), which
 * stops link-scanner prefetches and accidental clicks from silently
 * unsubscribing someone.
 *
 * Everything is inline on purpose: this page is served by the API on the
 * tracking host, with no frontend bundle or build step involved.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** JSON.stringify + the characters that can prematurely close a <script>
 *  block. The values come from a signed token, but the page should stay
 *  safe even if the signing secret is ever rotated/leaked. */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** jane@example.com → ja**@example.com — enough to recognise the address
 *  without printing it in full on the first screen. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 2))}@${domain}`;
}

function shell(body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Unsubscribe</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #f4f5f7;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #111827;
  }
  .card {
    width: 100%;
    max-width: 460px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    box-shadow: 0 12px 32px rgba(17, 24, 39, .08);
    padding: 28px;
  }
  .brand { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6b7280; }
  h1 { font-size: 21px; line-height: 1.3; margin: 18px 0 8px; }
  h2 { font-size: 18px; line-height: 1.35; margin: 18px 0 8px; }
  p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 14px; }
  strong { color: #111827; word-break: break-all; }
  .progress { display: flex; gap: 6px; margin: 20px 0 4px; }
  .progress span { height: 4px; flex: 1; border-radius: 999px; background: #e5e7eb; }
  .progress span.on { background: #111827; }
  .step-label { font-size: 11px; font-weight: 600; color: #9ca3af; margin: 6px 0 0; }
  .choice { display: flex; flex-direction: column; gap: 8px; margin: 6px 0 18px; }
  .choice label {
    display: flex; align-items: center; gap: 10px; padding: 11px 12px;
    border: 1px solid #e5e7eb; border-radius: 9px; font-size: 13.5px;
    cursor: pointer; color: #374151;
  }
  .choice label:hover { border-color: #9ca3af; }
  .choice input { accent-color: #111827; }
  input[type="email"], input[type="text"] {
    width: 100%; height: 42px; padding: 0 12px; font-size: 14px;
    border: 1px solid #d1d5db; border-radius: 8px; margin: 0 0 6px;
  }
  input[type="email"]:focus, input[type="text"]:focus { outline: 2px solid #111827; outline-offset: 0; border-color: #111827; }
  .error { color: #b91c1c; font-size: 12.5px; min-height: 17px; margin: 0 0 8px; }
  .actions { display: flex; gap: 10px; margin-top: 18px; }
  button {
    font: inherit; font-size: 13.5px; font-weight: 600; height: 42px;
    border-radius: 8px; padding: 0 16px; cursor: pointer; border: 1px solid transparent;
  }
  button:disabled { opacity: .45; cursor: not-allowed; }
  .primary { flex: 1; background: #111827; color: #fff; }
  .primary:hover:not(:disabled) { background: #1f2937; }
  .secondary { flex: 1; background: #fff; color: #374151; border-color: #d1d5db; }
  .secondary:hover { background: #f9fafb; }
  .link {
    display: inline-block; margin-top: 14px; background: none; border: 0;
    height: auto; padding: 0; color: #6b7280; font-size: 12.5px;
    text-decoration: underline; cursor: pointer;
  }
  .icon {
    width: 44px; height: 44px; border-radius: 50%; display: flex;
    align-items: center; justify-content: center; margin-bottom: 14px;
    font-size: 22px;
  }
  .icon.check { background: #ecfdf5; color: #047857; }
  .icon.warn { background: #fef2f2; color: #b91c1c; }
  .hidden { display: none !important; }
  .muted { font-size: 12px; color: #9ca3af; margin-top: 18px; line-height: 1.5; }
  @media (max-width: 420px) { .card { padding: 22px; } .actions { flex-direction: column-reverse; } }
</style>
</head>
<body>
<main class="card">
  <div class="brand">Genius Campaign</div>
${body}
</main>
</body>
</html>`;
}

export function renderInvalidUnsubscribePage(
  message = 'This unsubscribe link is invalid or has expired.',
): string {
  return shell(`
  <div class="icon warn" aria-hidden="true">!</div>
  <h1>We couldn't process that link</h1>
  <p>${escapeHtml(message)}</p>
  <p class="muted">If you keep receiving emails and want to opt out, reply to any of our emails and ask us to remove you.</p>`);
}

export function renderUnsubscribePage(token: string, email: string): string {
  const masked = escapeHtml(maskEmail(email));
  const tokenJson = jsonForScript(token);

  return shell(`
  <div id="wizard">
    <div class="progress" aria-hidden="true">
      <span class="on" data-bar="1"></span><span data-bar="2"></span><span data-bar="3"></span>
    </div>

    <section data-step="1">
      <p class="step-label">STEP 1 OF 3</p>
      <h1>Unsubscribe from emails?</h1>
      <p>This will stop all future campaign and sequence emails to <strong>${masked}</strong>.</p>
      <div class="actions">
        <button type="button" class="secondary" id="keep">Keep receiving emails</button>
        <button type="button" class="primary" id="next-1">Continue</button>
      </div>
    </section>

    <section data-step="2" class="hidden">
      <p class="step-label">STEP 2 OF 3</p>
      <h2>Before you go, what's the reason?</h2>
      <p>This helps us send better emails to everyone else.</p>
      <div class="choice" role="radiogroup" aria-label="Reason for unsubscribing">
        <label><input type="radio" name="reason" value="too_many_emails" /> I get too many emails</label>
        <label><input type="radio" name="reason" value="not_relevant" /> The content isn't relevant to me</label>
        <label><input type="radio" name="reason" value="did_not_sign_up" /> I don't remember signing up</label>
        <label><input type="radio" name="reason" value="other" /> Other</label>
      </div>
      <div class="actions">
        <button type="button" class="secondary" data-back="1">Back</button>
        <button type="button" class="primary" id="next-2" disabled>Continue</button>
      </div>
    </section>

    <section data-step="3" class="hidden">
      <p class="step-label">STEP 3 OF 3</p>
      <h2>Confirm your email address</h2>
      <p>For your security, type <strong>${escapeHtml(email)}</strong> below to finish unsubscribing.</p>
      <label for="confirm-email" class="step-label">EMAIL ADDRESS</label>
      <input id="confirm-email" type="email" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="you@example.com" />
      <p class="error" id="confirm-error" role="alert"></p>
      <div class="actions">
        <button type="button" class="secondary" data-back="2">Back</button>
        <button type="button" class="primary" id="confirm" disabled>Unsubscribe</button>
      </div>
    </section>

    <button type="button" class="link" id="cancel">Cancel and keep my subscription</button>
  </div>

  <div id="kept" class="hidden">
    <div class="icon check" aria-hidden="true">✓</div>
    <h1>No changes made</h1>
    <p>You'll keep receiving emails from us. You can use the unsubscribe link in any future email whenever you change your mind.</p>
  </div>

  <div id="done" class="hidden">
    <div class="icon check" aria-hidden="true">✓</div>
    <h1>You're unsubscribed</h1>
    <p><strong>${escapeHtml(email)}</strong> has been removed and will no longer receive emails from us.</p>
    <p class="muted">It may take a few minutes for this to take effect. You can close this page.</p>
  </div>

  <noscript>
    <p class="error">Please enable JavaScript to complete the unsubscribe process.</p>
  </noscript>

<script>
(function () {
  var token = ${tokenJson};
  var expectedEmail = ${jsonForScript(email.toLowerCase())};
  var current = 1;
  var reason = '';
  var sections = document.querySelectorAll('#wizard section[data-step]');
  var bars = document.querySelectorAll('[data-bar]');

  function show(step) {
    current = step;
    sections.forEach(function (section) {
      section.classList.toggle('hidden', Number(section.getAttribute('data-step')) !== step);
    });
    bars.forEach(function (bar) {
      bar.classList.toggle('on', Number(bar.getAttribute('data-bar')) <= step);
    });
    if (step === 3) {
      var input = document.getElementById('confirm-email');
      if (input) input.focus();
    }
  }

  function showPanel(id) {
    document.getElementById('wizard').classList.add('hidden');
    document.getElementById(id).classList.remove('hidden');
  }

  document.getElementById('next-1').addEventListener('click', function () { show(2); });
  document.getElementById('keep').addEventListener('click', function () { showPanel('kept'); });
  document.getElementById('cancel').addEventListener('click', function () { showPanel('kept'); });

  document.querySelectorAll('input[name="reason"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      reason = radio.value;
      document.getElementById('next-2').disabled = false;
    });
  });

  document.getElementById('next-2').addEventListener('click', function () { show(3); });

  document.querySelectorAll('[data-back]').forEach(function (button) {
    button.addEventListener('click', function () { show(Number(button.getAttribute('data-back'))); });
  });

  var emailInput = document.getElementById('confirm-email');
  var confirmButton = document.getElementById('confirm');
  var errorBox = document.getElementById('confirm-error');

  function typedEmailMatches() {
    return emailInput.value.trim().toLowerCase() === expectedEmail;
  }

  emailInput.addEventListener('input', function () {
    confirmButton.disabled = !typedEmailMatches();
    errorBox.textContent = '';
  });

  confirmButton.addEventListener('click', function () {
    if (!typedEmailMatches()) {
      errorBox.textContent = 'That does not match the email address this link was sent to.';
      return;
    }

    confirmButton.disabled = true;
    confirmButton.textContent = 'Unsubscribing…';

    fetch(window.location.pathname.replace(/\\/+$/, '') + '/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
          return data;
        });
      })
      .then(function () { showPanel('done'); })
      .catch(function (err) {
        errorBox.textContent = err.message || 'Something went wrong. Please try again.';
        confirmButton.disabled = false;
        confirmButton.textContent = 'Unsubscribe';
      });
  });
})();
</script>`);
}

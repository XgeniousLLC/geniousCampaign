export interface SettingDef {
  key: string;
  label: string;
  secret: boolean;
  placeholder?: string;
  // Static option list for fields that should render as a <select> instead
  // of a free-text input (e.g. LLM_PROVIDER). Fields whose valid options
  // depend on another field's current value (e.g. LLM_MODEL depends on
  // LLM_PROVIDER) are left without `options` here and handled by
  // category-specific rendering logic on the frontend instead.
  options?: string[];
  // Set on fields that can never be saved through the generic bulk PATCH —
  // e.g. TRACKING_DOMAIN, which must pass a DNS CNAME check first. The
  // frontend renders these with a dedicated component instead of a plain
  // input, and excludes them from the category's normal "Save" payload.
  verifyOnly?: boolean;
}

export interface SettingCategory {
  key: string;
  label: string;
  description: string;
  fields: SettingDef[];
  // Ordered setup steps shown in a "How to configure" dialog next to the
  // category header — plain text, one entry per step. Optional: only the
  // categories where the steps live outside this app (an external
  // dashboard) need this; DB-only fields are self-explanatory.
  instructions?: string[];
}

// The full set of credential/config keys this app can read from either
// process.env (.env, the original source) or a DB override set via the
// Settings > Integrations UI (GC-071). Kept in sync with CLAUDE.md's
// "Environment variables (consolidated)" list — every key here is one
// that list already names.
export const SETTING_CATEGORIES: SettingCategory[] = [
  {
    key: 'r2',
    label: 'Cloudflare R2',
    description: 'Template image uploads.',
    fields: [
      { key: 'CLOUDFLARE_R2_ACCOUNT_ID', label: 'Account ID', secret: false },
      { key: 'CLOUDFLARE_R2_ACCESS_KEY_ID', label: 'Access key ID', secret: true },
      { key: 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', label: 'Secret access key', secret: true },
      { key: 'CLOUDFLARE_R2_BUCKET', label: 'Bucket', secret: false },
      { key: 'CLOUDFLARE_R2_PUBLIC_BASE_URL', label: 'Public base URL', secret: false, placeholder: 'https://assets.yourdomain.com' },
    ],
    instructions: [
      'Log into the Cloudflare dashboard and open "R2 Object Storage".',
      'Create a bucket (or use an existing one) — its name is your Bucket value.',
      'Your Account ID is shown in the R2 overview page, in the right-hand sidebar.',
      'Go to R2 > "Manage API tokens" and create a token scoped to Object Read & Write for that bucket. This gives you the Access key ID and Secret access key (the secret is only shown once).',
      'Enable public access on the bucket, or attach a custom domain to it, to get a Public base URL — this is the URL prefix used to serve uploaded template images.',
    ],
  },
  {
    key: 'ai',
    label: 'AI-assisted copy',
    description: 'Template editor AI Assist + variant generation.',
    fields: [
      { key: 'LLM_PROVIDER', label: 'Provider', secret: false, options: ['openai', 'deepseek'] },
      { key: 'LLM_MODEL', label: 'Model', secret: false, placeholder: 'gpt-5.4-mini' },
      { key: 'OPENAI_API_KEY', label: 'OpenAI API key', secret: true },
      { key: 'DEEPSEEK_API_KEY', label: 'DeepSeek API key', secret: true },
    ],
  },
  {
    key: 'verification',
    label: 'Email verification',
    description: 'Paid deliverability checks (Reoon primary, NeverBounce fallback).',
    fields: [
      { key: 'REOON_API_KEY', label: 'Reoon API key', secret: true },
      { key: 'NEVERBOUNCE_API_KEY', label: 'NeverBounce API key', secret: true },
    ],
    instructions: [
      'Reoon (primary, cheapest — required to get started): sign up at reoon.com, open the API section of your dashboard, and copy your API key.',
      'NeverBounce (fallback — optional): sign up at neverbounce.com, go to Account > API, and copy your API key. It is only called automatically when Reoon fails or errors on a check.',
      'A local syntax/MX-record/disposable-domain pre-filter always runs before either paid API is called, so most obviously-invalid addresses never spend a credit.',
    ],
  },
  {
    key: 'google_oauth',
    label: 'Gmail sending (Google OAuth)',
    description: 'OAuth app used to connect Gmail Workspace mailboxes as sender accounts.',
    fields: [
      { key: 'GOOGLE_OAUTH_CLIENT_ID', label: 'Client ID', secret: false },
      { key: 'GOOGLE_OAUTH_CLIENT_SECRET', label: 'Client secret', secret: true },
      {
        key: 'GOOGLE_OAUTH_REDIRECT_URI',
        label: 'Redirect URI',
        secret: false,
        placeholder: 'https://your-api-host/sender-accounts/gmail/callback',
      },
    ],
    instructions: [
      'This is one shared OAuth app — every Gmail mailbox you connect from Sender Accounts goes through it. You only need to set this up once.',
      'In Google Cloud Console (https://console.developers.google.com/), create (or pick) a project, then open "APIs & Services" > "Enabled APIs" and enable the Gmail API.',
      'Under "APIs & Services" > "OAuth consent screen", set the app to Internal user type (or Testing, if this is a personal Google account without Workspace) and add the mailboxes you plan to connect as test users.',
      'Under "APIs & Services" > "Credentials", create an OAuth client ID of type "Web application".',
      'Add an Authorized redirect URI of exactly "<your API\'s public URL>/sender-accounts/gmail/callback" (e.g. http://localhost:3002/sender-accounts/gmail/callback in local dev). Paste that same value into the Redirect URI field here — it must match exactly, including http vs https.',
      'Copy the Client ID and Client secret shown after creation into the two fields here, then Save.',
      'Once saved, "Connect Gmail account" on the Sender Accounts page will open a real Google consent popup for each mailbox you add — no further setup needed per mailbox.',
    ],
  },
  {
    key: 'tracking',
    label: 'Open/click tracking',
    description: 'Pixel + link tracking and unsubscribe link signing.',
    fields: [
      { key: 'TRACKING_DOMAIN', label: 'Tracking domain', secret: false, verifyOnly: true },
      { key: 'TRACKING_SIGNING_SECRET', label: 'Signing secret', secret: true },
    ],
    instructions: [
      'Pick a subdomain of your actual sending domain for this — e.g. track.yourdomain.com, not an unrelated third-party-looking domain. Every open pixel and click-through link in outgoing email points here, so it needs to resolve to this app and hold a valid TLS certificate.',
      'Type the domain below and click "Check DNS" — this shows the exact CNAME record to add at your DNS provider (host = your tracking domain, value = this API\'s own hostname).',
      'Add that CNAME record at your registrar/DNS provider. Propagation can take a few minutes to a few hours depending on the provider.',
      'Click "Check DNS" again once it\'s live — the domain is only saved here after the CNAME actually resolves, so a typo or a domain you don\'t control can\'t silently become the tracking host.',
      'No SPF/DKIM/DMARC records are needed for this domain — that\'s a separate concern handled by your sending domain (SES), not the tracking domain.',
      'Signing secret below is generated internally (not something you fetch from an external dashboard) — leave it blank to keep the current one, or paste a replacement if you\'re rotating it.',
    ],
  },
];

export const ALL_SETTING_KEYS = new Set(SETTING_CATEGORIES.flatMap((c) => c.fields.map((f) => f.key)));

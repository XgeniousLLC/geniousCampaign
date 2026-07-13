import { useState } from 'react';
import { resolvePersonalization, resolveSpintax } from '@genius-campaign/shared';
import { CloseIcon } from './icons';
import { SendTestEmailModal } from './SendTestEmailModal';

// Same placeholder shape the backend's send-test resolves against
// (TemplatesService.SAMPLE_CONTACT) — kept in sync manually since it's a
// tiny, low-drift-risk display default, not core resolution logic.
const SAMPLE_CONTACT = { firstName: 'Alex', lastName: 'Doe', email: 'alex@example.com' };

const CLIENTS = [
  { key: 'gmail', label: 'Gmail' },
  { key: 'outlook', label: 'Outlook' },
  { key: 'apple', label: 'Apple Mail' },
] as const;

const VIEWPORTS = [
  { key: 'desktop', label: 'Desktop', width: 640 },
  { key: 'mobile', label: 'Mobile', width: 375 },
] as const;

type ClientKey = (typeof CLIENTS)[number]['key'];
type ViewportKey = (typeof VIEWPORTS)[number]['key'];

function ClientChrome({ client, subject, senderName, senderEmail }: { client: ClientKey; subject: string; senderName: string; senderEmail: string }) {
  if (client === 'gmail') {
    return (
      <div className="border-b border-[#e0e0e0] bg-white px-4 py-3" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <div className="text-[18px] font-normal text-[#202124]">{subject || '(no subject)'}</div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7baaf7] text-xs font-medium text-white">
            {senderName.charAt(0).toUpperCase()}
          </div>
          <div className="text-[13px] text-[#202124]">
            <span className="font-medium">{senderName}</span> <span className="text-[#5f6368]">&lt;{senderEmail}&gt;</span>
            <div className="text-[12px] text-[#5f6368]">to me</div>
          </div>
        </div>
      </div>
    );
  }
  if (client === 'outlook') {
    return (
      <div className="border-b border-[#e1dfdd] bg-white px-4 py-3" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <div className="text-[17px] font-semibold text-[#1b1a19]">{subject || '(no subject)'}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0078d4] text-[11px] font-semibold text-white">
            {senderName.charAt(0).toUpperCase()}
          </div>
          <div className="text-[13px] text-[#1b1a19]">
            <span className="font-semibold">{senderName}</span>
            <span className="ml-1.5 text-[11px] text-[#605e5c]">&lt;{senderEmail}&gt;</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="border-b border-[#d1d1d6] bg-white px-4 py-3 text-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div className="text-[15px] font-semibold text-[#1d1d1f]">{subject || '(no subject)'}</div>
      <div className="mt-1 text-[12.5px] text-[#6e6e73]">
        From: {senderName} &lt;{senderEmail}&gt;
      </div>
    </div>
  );
}

export function TemplatePreviewModal({
  subject,
  bodyHtml,
  bodyText,
  defaultTestEmail,
  senderName = 'Ryan',
  senderEmail = 'ryan@orbit.example.com',
  onClose,
}: {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  defaultTestEmail: string;
  senderName?: string;
  senderEmail?: string;
  onClose: () => void;
}) {
  const [client, setClient] = useState<ClientKey>('gmail');
  const [viewport, setViewport] = useState<ViewportKey>('desktop');
  const [showSendTest, setShowSendTest] = useState(false);

  const resolvedSubject = resolveSpintax(resolvePersonalization(subject, SAMPLE_CONTACT));
  const resolvedHtml = resolveSpintax(resolvePersonalization(bodyHtml, SAMPLE_CONTACT));
  const width = VIEWPORTS.find((v) => v.key === viewport)!.width;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-[760px] max-w-full flex-col rounded-xl border border-border-modal bg-panel2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default px-[18px] py-3.5">
          <h3 className="text-sm font-semibold text-text-heading">Preview</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowSendTest((s) => !s)}
                className="rounded-md border border-border-strong bg-field px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-raised"
              >
                Send test
              </button>
              {showSendTest && (
                <SendTestEmailModal
                  subject={subject}
                  bodyHtml={bodyHtml}
                  bodyText={bodyText}
                  defaultEmail={defaultTestEmail}
                  onClose={() => setShowSendTest(false)}
                />
              )}
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-border-default px-[18px] py-2.5">
          <div className="flex items-center gap-1">
            {CLIENTS.map((c) => (
              <button
                key={c.key}
                onClick={() => setClient(c.key)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  client === c.key ? 'bg-raised2 text-text-primary' : 'text-text-muted hover:bg-raised hover:text-text-primary'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border-subtle bg-surface p-0.5">
            {VIEWPORTS.map((v) => (
              <button
                key={v.key}
                onClick={() => setViewport(v.key)}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  viewport === v.key ? 'bg-raised2 text-text-primary' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#0c0d11] p-6">
          <div className="mx-auto overflow-hidden rounded-lg border border-border-subtle shadow-xl transition-[width]" style={{ width }}>
            <ClientChrome client={client} subject={resolvedSubject} senderName={senderName} senderEmail={senderEmail} />
            <iframe
              title="Email preview"
              srcDoc={`<html><body style="margin:0;padding:20px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#2b2b2b;background:#ffffff;">${resolvedHtml}</body></html>`}
              sandbox=""
              style={{ width, height: 480, border: 'none', background: '#fff' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

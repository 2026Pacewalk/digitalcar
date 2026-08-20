/* Branded "table-tent" QR standee — the shared look used by the customer
   dashboard (QR & Share) AND the public homepage QR/NFC section, so both stay
   identical. Pure strings so it can render via dangerouslySetInnerHTML or into
   a print window. */

export const STANDEE_STYLES = `
  .dc-tent{width:100%;max-width:420px;margin:0 auto;background:#fff;border-radius:26px;overflow:hidden;
    box-shadow:0 20px 60px rgba(15,23,42,.14);font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;border:1px solid #EEF2F7;}
  .dc-tent-head{background:linear-gradient(135deg,#F7B31C 0%,#F59E0B 55%,#EA9A08 100%);padding:26px 26px 38px;text-align:center;position:relative;}
  .dc-tent-brand{display:inline-flex;align-items:center;justify-content:center;background:#0F172A;border-radius:11px;padding:8px 15px;margin-bottom:16px;box-shadow:0 6px 16px rgba(15,23,42,.28);}
  .dc-tent-brand img{height:22px;width:auto;display:block;}
  .dc-tent-name{font-size:26px;line-height:1.15;font-weight:800;color:#0F172A;margin:0;word-break:break-word;}
  .dc-tent-sub{font-size:13px;font-weight:600;color:#0F172A;opacity:.72;margin-top:6px;}
  .dc-tent-body{padding:0 26px 22px;text-align:center;margin-top:-14px;}
  .dc-tent-pill{position:relative;z-index:2;display:inline-block;background:#0F172A;color:#F7B31C;font-size:12px;font-weight:800;letter-spacing:2px;padding:8px 20px;border-radius:999px;box-shadow:0 10px 22px rgba(15,23,42,.28);}
  .dc-tent-qr{background:#fff;border:1px solid #EEF2F7;border-radius:20px;padding:16px;margin:16px auto 0;width:fit-content;box-shadow:0 10px 30px rgba(15,23,42,.08);}
  .dc-tent-qr img{display:block;width:220px;height:220px;border-radius:8px;}
  .dc-tent-prompt{font-size:15px;font-weight:700;color:#0F172A;margin-top:16px;}
  .dc-tent-prompt small{display:block;font-size:12px;font-weight:500;color:#64748B;margin-top:3px;}
  .dc-tent-link{display:inline-block;margin-top:12px;background:#F1F5F9;color:#0F172A;font-weight:700;font-size:13px;padding:8px 16px;border-radius:10px;}
  .dc-tent-phone{font-size:13px;font-weight:600;color:#334155;margin-top:8px;}
  .dc-tent-foot{background:#0F172A;color:#94A3B8;font-size:11px;text-align:center;padding:12px;}
  .dc-tent-foot b{color:#F7B31C;}
`;

export type StandeeData = {
  brandName: string;
  subtitle?: string;
  phone?: string;
  linkText: string;
  qrSrc: string;   // fully-built QR image URL
  prompt?: string;   // editable call-to-action under the QR
};

export function standeeMarkup(o: StandeeData): string {
  const prompt = o.prompt || "Scan to view my digital card";
  return `
    <div class="dc-tent">
      <div class="dc-tent-head">
        <div class="dc-tent-brand"><img src="https://digitalcarda.in/logo.png" alt="DigitalCarda" /></div>
        <h2 class="dc-tent-name">${escapeHtml(o.brandName)}</h2>
        ${o.subtitle ? `<div class="dc-tent-sub">${escapeHtml(o.subtitle)}</div>` : ""}
      </div>
      <div class="dc-tent-body">
        <div class="dc-tent-pill">SCAN ME</div>
        <div class="dc-tent-qr"><img src="${o.qrSrc}" alt="QR code" crossorigin="anonymous" referrerpolicy="no-referrer" /></div>
        <div class="dc-tent-prompt">${escapeHtml(prompt)}<small>Save my contact · See products · Get directions</small></div>
        <div class="dc-tent-link">${escapeHtml(o.linkText)}</div>
        ${o.phone ? `<div class="dc-tent-phone">📞 ${escapeHtml(o.phone)}</div>` : ""}
      </div>
      <div class="dc-tent-foot">Powered by <b>DigitalCarda</b> · Your smart digital business card</div>
    </div>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

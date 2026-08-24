/*
 * Reusable "Share this card" sheet — the same beautiful modal used by the classic
 * scrolling templates, extracted so the premium single-screen designs (#48–51) can
 * share the identical UI (colored circular icons: WhatsApp, Telegram, Facebook, X,
 * LinkedIn, Pinterest, Message, Email) instead of the bare native-share/copy fallback.
 *
 * Self-contained: CSS + HTML + JS. The markup keeps the `#shareModal` id and the
 * `openShare()/closeShare()/copyShare()` functions, so any button can just call
 * `openShare()` (a `pwShare()` alias is provided for the premium cards).
 *
 * Each card is its own standalone HTML document (own iframe), so the shared ids
 * never collide across templates.
 */

const X_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true" style="display:inline-block;vertical-align:-2px"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.65l-5.21-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.16 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>`;

const esc = (v: unknown) =>
  String(v ?? "").trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type ShareSheetOpts = {
  /** Whose card — company or person name, e.g. "PACEWALK Pvt. Ltd." */
  shareName: string;
  /** Full public URL, e.g. https://digitalcarda.in/pacewalk */
  cardUrl: string;
  /** Pre-composed WhatsApp / email body. Falls back to a sensible default. */
  waShareText?: string;
  /** Accent used for the Copy button (defaults to a neutral dark). */
  accent?: string;
};

/** Modal styles. `accent` colours the Copy button. */
export function shareSheetCss(accent = "#111827"): string {
  return `
#shareModal{display:none;position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);z-index:99998;align-items:center;justify-content:center;padding:16px;}
#shareModal .dc-share-sheet{background:#fff;border-radius:22px;max-width:384px;width:100%;box-shadow:0 24px 64px rgba(2,6,23,.4);overflow:hidden;animation:dcSheetIn .22s cubic-bezier(.2,.8,.2,1);}
@keyframes dcSheetIn{from{opacity:0;transform:translateY(14px) scale(.97);}to{opacity:1;transform:none;}}
#shareModal .dc-sh-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 10px;}
#shareModal .dc-sh-title{margin:0;font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-.2px;font-family:inherit;}
#shareModal .dc-sh-x{width:32px;height:32px;border:none;background:#f1f5f9;border-radius:50%;color:#475569;font-size:19px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;transition:background .15s;}
#shareModal .dc-sh-x:hover{background:#e2e8f0;}
#shareModal .dc-sh-sub{margin:0 20px 14px;font-size:12.5px;color:#94a3b8;line-height:1.5;}
#shareModal .dc-sh-copy{display:flex;align-items:center;gap:9px;margin:0 20px 16px;background:#f8fafc;border:1px solid #e6e8eb;border-radius:12px;padding:7px 7px 7px 13px;}
#shareModal .dc-sh-copy > i{color:#94a3b8;font-size:13px;}
#shareModal .dc-sh-copy span{flex:1;min-width:0;font-size:12.5px;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;}
#shareModal .dc-sh-copy button{border:none;background:${accent};color:#fff;font-weight:700;font-size:12.5px;padding:8px 15px;border-radius:9px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;transition:filter .15s,transform .1s;font-family:inherit;}
#shareModal .dc-sh-copy button:hover{filter:brightness(1.08);}
#shareModal .dc-sh-copy button.dc-copied{background:#16a34a;color:#fff;}
#shareModal .dc-sh-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:0 12px 20px;}
#shareModal .dc-sh-item{display:flex;flex-direction:column;align-items:center;gap:7px;padding:11px 4px;border-radius:14px;text-decoration:none;transition:background .15s;}
#shareModal .dc-sh-item:hover{background:#f6f7f9;}
#shareModal .dc-sh-item:active{transform:scale(.95);}
#shareModal .dc-sh-ic{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:19px;box-shadow:0 5px 12px rgba(16,24,40,.16);}
#shareModal .dc-sh-ic svg{width:19px;height:19px;}
#shareModal .dc-sh-item > span:last-child{font-size:11px;font-weight:600;color:#475569;}`;
}

/** Modal markup. Append near the end of <body>. */
export function shareSheetHtml(opts: ShareSheetOpts): string {
  const { shareName, cardUrl } = opts;
  const waText = opts.waShareText || `Take a look at ${shareName}'s digital card — call, message or save the contact in one tap:\n${cardUrl}`;
  const u = encodeURIComponent(cardUrl);
  return `<div id="shareModal">
  <div class="dc-share-sheet">
    <div class="dc-sh-head">
      <h3 class="dc-sh-title">Share this card</h3>
      <button class="dc-sh-x" onclick="closeShare()" aria-label="Close">&times;</button>
    </div>
    <p class="dc-sh-sub">Send ${esc(shareName)}'s digital card to anyone — they can save the contact, call or message in a single tap.</p>
    <div class="dc-sh-copy"><i class="fa fa-link"></i><span>${esc(cardUrl.replace(/^https?:\/\//, ""))}</span><button id="dc-copy-btn" onclick="copyShare()"><i class="fa fa-copy"></i> Copy</button></div>
    <div class="dc-sh-grid">
      <a class="dc-sh-item" href="https://wa.me/?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener"><span class="dc-sh-ic" style="background:#25D366"><i class="fab fa-whatsapp"></i></span><span>WhatsApp</span></a>
      <a class="dc-sh-item" href="https://t.me/share/url?url=${u}&text=${encodeURIComponent("Take a look at " + shareName + "'s digital card")}" target="_blank" rel="noopener"><span class="dc-sh-ic" style="background:#229ED9"><i class="fab fa-telegram-plane"></i></span><span>Telegram</span></a>
      <a class="dc-sh-item" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener"><span class="dc-sh-ic" style="background:#1877F2"><i class="fab fa-facebook-f"></i></span><span>Facebook</span></a>
      <a class="dc-sh-item" href="https://twitter.com/intent/tweet?url=${u}" target="_blank" rel="noopener"><span class="dc-sh-ic" style="background:#000">${X_SVG}</span><span>X</span></a>
      <a class="dc-sh-item" href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" target="_blank" rel="noopener"><span class="dc-sh-ic" style="background:#0A66C2"><i class="fab fa-linkedin-in"></i></span><span>LinkedIn</span></a>
      <a class="dc-sh-item" href="https://pinterest.com/pin/create/link/?url=${u}" target="_blank" rel="noopener"><span class="dc-sh-ic" style="background:#E60023"><i class="fab fa-pinterest-p"></i></span><span>Pinterest</span></a>
      <a class="dc-sh-item" href="sms:?body=${encodeURIComponent(cardUrl)}"><span class="dc-sh-ic" style="background:#6366F1"><i class="fas fa-comment-dots"></i></span><span>Message</span></a>
      <a class="dc-sh-item" href="mailto:?subject=${encodeURIComponent(shareName + " — Digital Card")}&body=${encodeURIComponent(waText)}"><span class="dc-sh-ic" style="background:#EA4335"><i class="fa fa-envelope"></i></span><span>Email</span></a>
    </div>
  </div>
</div>`;
}

/**
 * Modal behaviour. Native share where allowed; otherwise (incl. the sandboxed
 * card iframe, where navigator.share exists but rejects) fall back to this modal.
 * Exposes openShare/closeShare/copyShare plus a pwShare() alias.
 */
export function shareSheetJs(cardUrl: string): string {
  return `
function dcShareModal(){var el=document.getElementById('shareModal');if(el)el.style.display='flex';}
function openShare(){try{if(navigator.share){navigator.share({title:(document.title||'Digital Card'),url:${JSON.stringify(cardUrl)}}).catch(dcShareModal);return;}}catch(_){}dcShareModal();}
function pwShare(){openShare();}
function closeShare(){var el=document.getElementById('shareModal');if(el)el.style.display='none';}
function copyShare(){var u=${JSON.stringify(cardUrl)},btn=document.getElementById('dc-copy-btn');
  function ok(){if(!btn)return;var h=btn.getAttribute('data-h')||btn.innerHTML;btn.setAttribute('data-h',h);btn.classList.add('dc-copied');btn.innerHTML='<i class="fa fa-check"></i> Copied';setTimeout(function(){btn.classList.remove('dc-copied');btn.innerHTML=h;},1600);}
  function ex(){try{var ta=document.createElement('textarea');ta.value=u;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();var r=document.execCommand('copy');document.body.removeChild(ta);return r;}catch(_){return false;}}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(ok,function(){if(ex())ok();});}else{if(ex())ok();}}
(function(){var m=document.getElementById('shareModal');if(m)m.addEventListener('click',function(e){if(e.target.id==='shareModal')closeShare();});})();`;
}

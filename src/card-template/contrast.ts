/*
 * Readable buttons on ANY card colour.
 *
 * Card templates were written for one theme colour each: some buttons had
 * white text (unreadable on gold, yellow or pastel cards), others near-black
 * text (unreadable on navy), and some mixed the colour toward brown because
 * they assumed gold (a muddy "Send Enquiry" on a blue card). Customers pick any
 * colour, so every button now takes its colours from here.
 *
 * Two parts:
 *  1. buttonPalette(accent) — the design rule for primary buttons, used in the
 *     templates' CSS. Light brand colours keep their colour with dark text;
 *     mid and dark colours are deepened just enough for WHITE text to read
 *     clearly (keeps the brand hue, and white-on-colour looks like a button).
 *  2. CONTRAST_GUARD_SCRIPT — a small script every card runs. Many buttons are
 *     styled per template (e.g. the CALL / WHATSAPP bar in 26 stylesheets), so
 *     after the card renders it measures each button's real text colour against
 *     the real colour behind it and, only where the text is unreadable,
 *     switches it to white or dark — whichever reads better.
 */

const HEX = /^#([0-9a-f]{6})$/i;

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** Blend two #rrggbb colours: pct 0 → a, 1 → b. */
export function mixHex(a: string, b: string, pct: number): string {
  const x = rgb(a), y = rgb(b);
  return "#" + x.map((v, i) => Math.round(v * (1 - pct) + y[i] * pct).toString(16).padStart(2, "0")).join("");
}

function luminance(hex: string): number {
  const ch = rgb(hex).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** WCAG contrast ratio between two #rrggbb colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
}

export const INK = "#111827";
export const WHITE = "#ffffff";

export type ButtonPalette = { bg: string; bg2: string; fg: string };

/** Primary-button colours for a brand colour: gradient start/end and text. */
export function buttonPalette(accent: unknown, fallback = "#F7B31C"): ButtonPalette {
  const a = typeof accent === "string" && HEX.test(accent.trim()) ? accent.trim() : fallback;
  // Light brand colours (gold, yellow, pastels) look right as-is with dark text.
  if (contrastRatio(a, INK) >= 7) {
    const bg2 = mixHex(a, "#000000", 0.12);
    return { bg: a, bg2: contrastRatio(bg2, INK) >= 4.5 ? bg2 : a, fg: INK };
  }
  // Everything else: deepen the colour just until white text reads clearly.
  let bg = a;
  for (let k = 0; k <= 0.8; k += 0.04) {
    bg = mixHex(a, "#000000", k);
    if (contrastRatio(bg, WHITE) >= 4.6) break;
  }
  return { bg, bg2: mixHex(bg, "#000000", 0.14), fg: WHITE };
}

/* The in-card safety net (plain ES5 — it runs inside every published card).
   Conservative on purpose: it only looks at links/buttons that paint their OWN
   solid or gradient background, ignores image backgrounds, and only changes a
   text colour that fails to be readable (WCAG AA: 4.5, or 3 for large text). */
export const CONTRAST_GUARD_SCRIPT = `<script>(function(){
  function parse(s){var m=s&&s.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;var p=m[1].split(',');return{r:+p[0],g:+p[1],b:+p[2],a:p.length>3?+p[3]:1};}
  function lum(c){var a=[c.r,c.g,c.b].map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];}
  function ratio(x,y){var a=lum(x),b=lum(y);if(a<b){var t=a;a=b;b=t;}return (a+0.05)/(b+0.05);}
  function own(el){var cs=getComputedStyle(el);var bi=cs.backgroundImage;
    if(bi&&bi!=='none'){if(/url\\(/.test(bi))return 'img';var m=bi.match(/rgba?\\([^)]+\\)/g);if(m){var out=[];for(var i=0;i<m.length;i++){var c=parse(m[i]);if(c&&c.a>0.5)out.push(c);}if(out.length)return out;}}
    var bc=parse(cs.backgroundColor);return bc&&bc.a>0.5?[bc]:null;}
  function behind(el){for(var e=el;e&&e.nodeType===1;e=e.parentElement){var o=own(e);if(o==='img')return null;if(o)return o;}return [{r:255,g:255,b:255,a:1}];}
  var W={r:255,g:255,b:255},K={r:17,g:24,b:39};
  function worst(fg,stops){var w=99;for(var i=0;i<stops.length;i++)w=Math.min(w,ratio(fg,stops[i]));return w;}
  function fixEl(pe,large){var cs=getComputedStyle(pe);if(cs.visibility==='hidden'||cs.display==='none')return;
    var fg=parse(cs.color);if(!fg)return;var stops=behind(pe);if(!stops)return;
    var need=large?3:4.5;var cur=worst(fg,stops);if(cur>=need)return;
    var w=worst(W,stops),k=worst(K,stops);var pick=w>=k?'#ffffff':'#111827';
    if(Math.max(w,k)>cur)pe.style.setProperty('color',pick,'important');}
  function run(){try{
    var els=document.querySelectorAll('a,button,[role=button],input[type=submit]');
    for(var i=0;i<els.length;i++){var el=els[i];var o=own(el);if(!o||o==='img')continue;
      var r=el.getBoundingClientRect();if(r.width<24||r.height<20)continue;
      var tw=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null,false),n,seen=[];
      while((n=tw.nextNode())){if(n.textContent.replace(/\\s/g,'').length<2)continue;var pe=n.parentElement;if(seen.indexOf(pe)>-1)continue;seen.push(pe);
        var cs=getComputedStyle(pe);var sz=parseFloat(cs.fontSize),bd=parseInt(cs.fontWeight,10)>=700;fixEl(pe,sz>=24||(sz>=18.66&&bd));}
      var ic=el.querySelectorAll('i,svg');for(var j=0;j<ic.length;j++)fixEl(ic[j],true);
    }
  }catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){setTimeout(run,60);});
})();</script>`;

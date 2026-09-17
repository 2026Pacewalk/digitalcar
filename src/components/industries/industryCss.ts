/* Motion for the industry pages (/industries and /industries/:slug).
   Rendered once per page as <style>{INDUSTRY_CSS}</style>, the same way
   SiteFooter and PublicTabBar carry their own CSS.

   Rules (blueprint §4d):
   - class names are dc-ind-*; only transform and opacity ever animate
   - base styles are the finished state: every one-shot animation runs with
     fill-mode "backwards", so no animation = fully visible content (SSR, no JS,
     reduced motion all read the same page)
   - at most two kinds of infinite motion per viewport: hero rings + chip bob,
     hub fan sway + rings, hub marquee, share-flow loop
   - the share flow is one 12 s loop (4 frames × 3 s); every element in it runs
     the same 12 s clock and is offset with --d, so frame 0 shows at rest and
     the loop pauses as a whole when it leaves the viewport or is hovered

   Hero card timeline (HeroCard mode="hero", root .dc-ind-build), in ms:
     20 →   ghost outlines flicker where each section will land (--i × 90)
    150 →   sections rise in, top to bottom; their buttons, rows, tiles and
            icons spring in just behind them (--j)
   1700 →   the screen "peeks": it scrolls to the bottom of the card while the
            last three sections (enquiry, QR, socials; --late) assemble as it
            arrives, the QR prints band by band and a scan line crosses it
   4400 →   it scrolls back to the top, and one light sweep closes the show
   The base state is the top of the card, so no JS, SSR and reduced motion
   all show the profile band first. */
import type { CardPart } from "@/data/industries";

/** Sections of the sample phone card, in render order (HeroCard) and the
    order of the [data-hl] selectors generated below. */
export const CARD_PARTS: CardPart[] = ["profile", "actions", "about", "services", "gallery", "enquiry", "qr", "socials"];

/** The three sections below the first screen: they assemble while the hero
    screen scrolls down to them. */
const LATE_PARTS: CardPart[] = ["enquiry", "qr", "socials"];

/* Checklist ↔ card: when the card root carries data-hl="<part>", that part
   gets an accent ring and lifts slightly while the others dim. The ring rule
   is also written in the blueprint's plain form ([data-hl] on any ancestor),
   and the "stay bright" rule outranks the dim rule below it. */
const HIGHLIGHT_CSS = CARD_PARTS.map((p) => [
  `[data-hl="${p}"] [data-part="${p}"]::after{opacity:1}`,
  `.dc-ind-card[data-hl="${p}"] [data-part="${p}"]{transform:scale(1.03);z-index:1}`,
  `.dc-ind-card[data-hl="${p}"] [data-part="${p}"][data-part]>.dc-ind-part.dc-ind-part{opacity:1}`,
].join("")).join("\n");

const LATE_CSS = LATE_PARTS.map((p) => `.dc-ind-build [data-part="${p}"]`).join(",") + "{--late:1400ms}";

export const INDUSTRY_CSS = `
/* ── hero: the sample card assembles itself ────────────────────────────── */
.dc-ind-card [data-part]{position:relative;transition:transform .35s cubic-bezier(.16,1,.3,1)}
.dc-ind-card [data-part]::after{content:"";position:absolute;inset:-4px;border-radius:12px;box-shadow:0 0 0 2px var(--ind,#F7B31C),0 12px 28px -12px var(--ind,#F7B31C);opacity:0;transition:opacity .25s;pointer-events:none}
.dc-ind-card [data-part]>.dc-ind-part{transition:opacity .3s}
.dc-ind-card[data-hl]:not([data-hl=""]) [data-part]>.dc-ind-part{opacity:.42}
${HIGHLIGHT_CSS}
${LATE_CSS}
@keyframes dc-ind-build{from{opacity:0;transform:translateY(14px) scale(.98)}}
.dc-ind-build [data-part]>.dc-ind-part{animation:dc-ind-build .6s cubic-bezier(.16,1,.3,1) backwards;animation-delay:calc(var(--i,0)*90ms + 150ms + var(--late,0ms))}
/* a dashed outline flickers where each section is about to land */
@keyframes dc-ind-ghost{0%{opacity:0}35%{opacity:.8}100%{opacity:0}}
.dc-ind-build [data-part]::before{content:"";position:absolute;inset:-2px;border-radius:12px;border:1px dashed var(--ind,#F7B31C);opacity:0;pointer-events:none;animation:dc-ind-ghost .7s ease-out backwards;animation-delay:calc(var(--i,0)*90ms + 20ms + var(--late,0ms))}
/* pieces inside a section spring in after it: --j is the piece's index */
@keyframes dc-ind-pop{from{opacity:0;transform:scale(.55)}}
.dc-ind-build .dc-ind-pop{animation:dc-ind-pop .55s cubic-bezier(.34,1.56,.64,1) backwards;animation-delay:calc(var(--i,0)*90ms + var(--j,0)*70ms + 340ms + var(--late,0ms))}
@keyframes dc-ind-row{from{opacity:0;transform:translateX(18px)}}
.dc-ind-build .dc-ind-row{animation:dc-ind-row .55s cubic-bezier(.16,1,.3,1) backwards;animation-delay:calc(var(--i,0)*90ms + var(--j,0)*80ms + 320ms + var(--late,0ms))}
@keyframes dc-ind-tile{from{opacity:0;transform:scale(.8) translateY(6px)}}
.dc-ind-build .dc-ind-tile{animation:dc-ind-tile .6s cubic-bezier(.34,1.56,.64,1) backwards;animation-delay:calc(var(--i,0)*90ms + var(--j,0)*80ms + 340ms + var(--late,0ms))}
/* the QR prints band by band, then a scan line passes over it once */
@keyframes dc-ind-band{from{opacity:0;transform:translateY(-3px)}}
.dc-ind-build .dc-ind-band{animation:dc-ind-band .4s ease-out backwards;animation-delay:calc(var(--i,0)*90ms + var(--j,0)*110ms + 380ms + var(--late,0ms))}
@keyframes dc-ind-scan{0%{opacity:0;transform:translateY(0)}15%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translateY(var(--scan,52px))}}
.dc-ind-scan{opacity:0}
.dc-ind-build .dc-ind-scan{animation:dc-ind-scan .9s ease-in-out backwards;animation-delay:calc(var(--i,0)*90ms + 760ms + var(--late,0ms))}
/* the screen peeks at the rest of the card: scrolls to the bottom (100cqh is
   the screen's height, 100% the content's), holds, and comes back to the top */
.dc-ind-build .dc-ind-screen{container-type:size}
@keyframes dc-ind-peek{0%{transform:none;animation-timing-function:cubic-bezier(.65,0,.35,1)}29%{transform:translateY(min(0px,calc(100cqh - 100%)))}71%{transform:translateY(min(0px,calc(100cqh - 100%)));animation-timing-function:cubic-bezier(.65,0,.35,1)}100%{transform:none}}
.dc-ind-build .dc-ind-peek{animation:dc-ind-peek 3.8s ease 1.7s backwards}
@keyframes dc-ind-fade{0%{opacity:1}29%,71%{opacity:0}100%{opacity:1}}
.dc-ind-build .dc-ind-fade{animation:dc-ind-fade 3.8s ease 1.7s backwards}
/* one light sweep across the screen once everything has landed */
@keyframes dc-ind-shine{0%{opacity:0;transform:translateX(-140%) skewX(-14deg)}25%{opacity:1}75%{opacity:1}100%{opacity:0;transform:translateX(140%) skewX(-14deg)}}
.dc-ind-shine{opacity:0}
.dc-ind-build .dc-ind-shine{animation:dc-ind-shine 1s ease-in-out 5.6s backwards}
/* a pointer leans the finished card a little */
@media (hover:hover) and (pointer:fine){
  .dc-ind-card[data-mode="hero"]{transition:transform .7s cubic-bezier(.16,1,.3,1)}
  .dc-ind-card[data-mode="hero"]:hover{transform:perspective(1100px) rotateY(-6deg) rotateX(3deg) translateY(-3px)}
}
/* around the phone (IndustryPage hero) */
@keyframes dc-ind-phone{from{opacity:0;transform:translateY(24px) rotate(-2deg)}}
.dc-ind-phone{animation:dc-ind-phone .8s cubic-bezier(.16,1,.3,1) .05s backwards}
@keyframes dc-ind-chip-in{from{opacity:0;transform:translateY(10px) scale(.9)}}
@keyframes dc-ind-bob{50%{transform:translateY(-6px)}}
.dc-ind-chip{animation:dc-ind-chip-in .5s cubic-bezier(.34,1.56,.64,1) backwards;animation-delay:calc(var(--i,0)*140ms + 950ms)}
@media (min-width:640px){.dc-ind-chip>span{display:inline-flex;animation:dc-ind-bob 4.5s ease-in-out infinite;animation-delay:calc(var(--i,0)*-1.4s)}}
@keyframes dc-ind-ping{from{transform:scale(.6);opacity:.45}to{transform:scale(1.7);opacity:0}}
.dc-ind-ring{animation:dc-ind-ping 3.4s cubic-bezier(.2,.7,.2,1) infinite;animation-delay:calc(var(--i,0)*1.1s)}
@keyframes dc-ind-underline{from{transform:scaleX(0)}}
.dc-ind-underline{transform-origin:left;animation:dc-ind-underline .9s cubic-bezier(.16,1,.3,1) .25s backwards}
@keyframes dc-ind-wipe{from{transform:translateX(-102%)}}
.dc-ind-wipe{animation:dc-ind-wipe 1.1s cubic-bezier(.16,1,.3,1) .2s backwards}
.group:hover .dc-ind-wipe{transform:translateX(4px);transition:transform .5s cubic-bezier(.16,1,.3,1)}
/* ── below the fold (inside Reveal, so they wait for .is-visible) ──────── */
@keyframes dc-ind-strike{from{transform:scaleX(0)}}
.is-visible .dc-ind-strike{transform-origin:left;animation:dc-ind-strike .7s cubic-bezier(.16,1,.3,1) .35s backwards}
@keyframes dc-ind-arrow{from{opacity:0;transform:translateX(-8px)}}
.is-visible .dc-ind-arrow{animation:dc-ind-arrow .6s cubic-bezier(.16,1,.3,1) .5s backwards}
@keyframes dc-ind-grow{from{transform:scaleX(0)}}
.is-visible .dc-ind-line{transform-origin:left;animation:dc-ind-grow 1s cubic-bezier(.16,1,.3,1) .2s backwards}
/* ── share flow: one 12 s loop, 4 frames × 3 s ─────────────────────────── */
/* a frame holds 0–20 %, fades up 20–25 %, hides, and rises back in 95–100 %,
   which lines up with the next frame's exit because frames are 3 s apart */
@keyframes dc-ind-frame{0%,20%{opacity:1;transform:none}25%,94.9%{opacity:0;transform:translateY(-10px) scale(.98)}95%{opacity:0;transform:translateY(12px) scale(.98)}100%{opacity:1;transform:none}}
@keyframes dc-ind-hl{0%,20%{opacity:1}25%,95%{opacity:0}100%{opacity:1}}
@keyframes dc-ind-bar{0%{transform:scaleX(0)}24.9%{transform:scaleX(1)}25%,100%{transform:scaleX(0)}}
.dc-ind-frame{opacity:0}.dc-ind-frame[data-n="0"]{opacity:1}
.dc-ind-hl{opacity:0}.dc-ind-hl[data-n="0"]{opacity:1}
.dc-ind-bar{transform:scaleX(0);transform-origin:left}
.dc-ind-flow [data-n="1"]{--d:-9s}.dc-ind-flow [data-n="2"]{--d:-6s}.dc-ind-flow [data-n="3"]{--d:-3s}
.dc-ind-flow [data-n],.dc-ind-flow .dc-ind-fx{animation-delay:var(--d,0s)}
.dc-ind-flow .dc-ind-frame{animation-name:dc-ind-frame;animation-duration:12s;animation-timing-function:ease;animation-iteration-count:infinite}
.dc-ind-flow .dc-ind-hl{animation-name:dc-ind-hl;animation-duration:12s;animation-timing-function:ease;animation-iteration-count:infinite}
.dc-ind-flow .dc-ind-bar{animation-name:dc-ind-bar;animation-duration:12s;animation-timing-function:linear;animation-iteration-count:infinite}
/* pieces inside a frame share the frame's clock: entrances happen while the
   frame rises (95–100 %), transient effects run early in its hold (0–15 %),
   and everything is back at its base state by 30 %, while the frame is hidden */
.dc-ind-flow .dc-ind-fx{animation-duration:12s;animation-timing-function:cubic-bezier(.16,1,.3,1);animation-iteration-count:infinite}
@keyframes dc-ind-fx-pop-a{0%,30%{opacity:1;transform:none}31%,95%{opacity:0;transform:scale(.5)}97.5%{opacity:1;transform:scale(1.08)}99%,100%{opacity:1;transform:none}}
@keyframes dc-ind-fx-pop-b{0%,30%{opacity:1;transform:none}31%,96%{opacity:0;transform:scale(.5)}98.3%{opacity:1;transform:scale(1.08)}99.6%,100%{opacity:1;transform:none}}
@keyframes dc-ind-fx-pop-c{0%,30%{opacity:1;transform:none}31%,97%{opacity:0;transform:scale(.5)}99%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:none}}
@keyframes dc-ind-fx-rise-a{0%,30%{opacity:1;transform:none}31%,95%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:none}}
@keyframes dc-ind-fx-rise-b{0%,30%{opacity:1;transform:none}31%,96.5%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:none}}
@keyframes dc-ind-fx-rise-c{0%,30%{opacity:1;transform:none}31%,97.5%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:none}}
@keyframes dc-ind-fx-sheet{0%,30%{transform:none}31%,95%{transform:translateY(105%)}100%{transform:none}}
@keyframes dc-ind-fx-grow-a{0%,30%{transform:none}31%,95%{transform:scaleY(0)}98.5%{transform:scaleY(1.06)}100%{transform:none}}
@keyframes dc-ind-fx-grow-b{0%,30%{transform:none}31%,96%{transform:scaleY(0)}99%{transform:scaleY(1.06)}100%{transform:none}}
@keyframes dc-ind-fx-grow-c{0%,30%{transform:none}31%,97%{transform:scaleY(0)}99.5%{transform:scaleY(1.05)}100%{transform:none}}
@keyframes dc-ind-fx-scan{0%{opacity:0;transform:translateY(0)}1.5%{opacity:1;transform:translateY(0)}11%{opacity:1;transform:translateY(var(--scan,60px))}13%,100%{opacity:0;transform:translateY(var(--scan,60px))}}
@keyframes dc-ind-fx-ripple-a{0%{opacity:0;transform:scale(.4)}1.5%{opacity:.85;transform:scale(.4)}10%,100%{opacity:0;transform:scale(2)}}
@keyframes dc-ind-fx-ripple-b{0%,4.5%{opacity:0;transform:scale(.4)}6%{opacity:.7;transform:scale(.4)}14.5%,100%{opacity:0;transform:scale(2)}}
@keyframes dc-ind-fx-tap{0%,1%{transform:none}3.5%{transform:translate(-6px,-14px) rotate(-3deg)}7%,100%{transform:none}}
.dc-ind-fx-pop-a{animation-name:dc-ind-fx-pop-a}.dc-ind-fx-pop-b{animation-name:dc-ind-fx-pop-b}.dc-ind-fx-pop-c{animation-name:dc-ind-fx-pop-c}
.dc-ind-fx-rise-a{animation-name:dc-ind-fx-rise-a}.dc-ind-fx-rise-b{animation-name:dc-ind-fx-rise-b}.dc-ind-fx-rise-c{animation-name:dc-ind-fx-rise-c}
.dc-ind-fx-sheet{animation-name:dc-ind-fx-sheet}
.dc-ind-fx-grow-a,.dc-ind-fx-grow-b,.dc-ind-fx-grow-c{transform-origin:bottom}
.dc-ind-fx-grow-a{animation-name:dc-ind-fx-grow-a}.dc-ind-fx-grow-b{animation-name:dc-ind-fx-grow-b}.dc-ind-fx-grow-c{animation-name:dc-ind-fx-grow-c}
.dc-ind-fx-scan{opacity:0;animation-name:dc-ind-fx-scan;animation-timing-function:ease-in-out}
.dc-ind-fx-ripple-a,.dc-ind-fx-ripple-b{opacity:0;animation-timing-function:ease-out}
.dc-ind-fx-ripple-a{animation-name:dc-ind-fx-ripple-a}.dc-ind-fx-ripple-b{animation-name:dc-ind-fx-ripple-b}
.dc-ind-fx-tap{animation-name:dc-ind-fx-tap;animation-timing-function:ease-in-out}
.dc-ind-flow:not([data-play]) [data-n],.dc-ind-flow:not([data-play]) .dc-ind-fx,
.dc-ind-flow:hover [data-n],.dc-ind-flow:hover .dc-ind-fx,
.dc-ind-flow:focus-within [data-n],.dc-ind-flow:focus-within .dc-ind-fx{animation-play-state:paused}
/* ── hub ───────────────────────────────────────────────────────────────── */
@keyframes dc-ind-sway{0%,100%{transform:rotate(var(--r)) translateY(0)}50%{transform:rotate(var(--r)) translateY(-8px)}}
.dc-ind-fan{transform:rotate(var(--r));animation:dc-ind-sway 7s ease-in-out infinite;animation-delay:calc(var(--i,0)*-2.3s)}
@keyframes dc-ind-marquee{to{transform:translateX(-50%)}}
.dc-ind-marquee{display:flex;width:max-content;animation:dc-ind-marquee 38s linear infinite}
.dc-ind-marquee--rev{animation-direction:reverse}
/* ── reduced motion: nothing moves, everything is readable ─────────────── */
@media (prefers-reduced-motion:reduce){
  .dc-ind-build [data-part]>.dc-ind-part,.dc-ind-build [data-part]::before,.dc-ind-build .dc-ind-pop,.dc-ind-build .dc-ind-row,
  .dc-ind-build .dc-ind-tile,.dc-ind-build .dc-ind-band,.dc-ind-build .dc-ind-scan,.dc-ind-build .dc-ind-shine,
  .dc-ind-build .dc-ind-peek,.dc-ind-build .dc-ind-fade,
  .dc-ind-phone,.dc-ind-chip,.dc-ind-chip>span,.dc-ind-underline,.dc-ind-wipe,.dc-ind-strike,.dc-ind-arrow,.dc-ind-line,
  .dc-ind-fan,.dc-ind-marquee,.dc-ind-flow [data-n],.dc-ind-flow .dc-ind-fx{animation:none!important}
  .dc-ind-ring,.dc-ind-scan,.dc-ind-shine,.dc-ind-fx-scan,.dc-ind-fx-ripple-a,.dc-ind-fx-ripple-b{display:none}
  .dc-ind-hl{opacity:1}.dc-ind-bar{display:none}
  .dc-ind-card [data-part],.dc-ind-card [data-part]>.dc-ind-part,.dc-ind-card[data-mode="hero"]{transition:none}
  .dc-ind-card[data-mode="hero"]:hover{transform:none}
  .group:hover .dc-ind-wipe{transform:none}
}
`;

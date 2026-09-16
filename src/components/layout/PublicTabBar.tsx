import { Link, useLocation } from "react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Home as HomeIcon, LayoutGrid, Tag, Menu, LayoutDashboard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getToken } from "@/lib/session";
import { haptic } from "@/lib/nativeApp";

/* Motion for the tab bar. Everything moves with transform and opacity only, so
   it stays on the compositor on low-end phones, and all of it switches off for
   people who ask for reduced motion.
   - the bar slides up once when the site opens
   - a gold marker springs to the active tab; its icon pops as it arrives
   - tabs flash a soft halo and squash when pressed
   - the centre button: a comet circling its rim, sonar pulses, orbiting
     sparkles, a light sweep across the face and a shimmer on its label */
const TAB_CSS = `
@keyframes dc-tabbar-in { from { transform: translateY(110%); } to { transform: none; } }
.dc-tabbar { animation: dc-tabbar-in .7s cubic-bezier(.22,1,.36,1) .15s both; }

.dc-tab-marker { transition: transform .55s cubic-bezier(.34,1.56,.64,1), opacity .3s ease; will-change: transform; }
@keyframes dc-tab-pop {
  0% { transform: translateY(0) scale(.7); }
  45% { transform: translateY(-4px) scale(1.18); }
  72% { transform: translateY(0) scale(.95); }
  100% { transform: none; }
}
.dc-tab-pop { animation: dc-tab-pop .6s cubic-bezier(.34,1.56,.64,1) both; }
.dc-tab-halo { position: absolute; inset: 0; border-radius: 9999px; background: rgba(247,179,28,.16); transform: scale(.5); opacity: 0; transition: transform .5s cubic-bezier(.22,1,.36,1), opacity .5s ease; }
.dc-tab:active .dc-tab-halo { transform: scale(1.05); opacity: 1; transition-duration: .08s; }
.dc-tab-press { transition: transform .4s cubic-bezier(.34,1.56,.64,1); }
.dc-tab:active .dc-tab-press { transform: scale(.84); transition-duration: .1s; }

.dc-fab-press { transition: transform .45s cubic-bezier(.34,1.56,.64,1); }
.dc-fab:active .dc-fab-press { transform: scale(.88); transition-duration: .1s; }
.dc-fab-plate { position: absolute; inset: -5px; border-radius: 9999px; background: #0B1120; }
@keyframes dc-fab-spin { to { transform: rotate(360deg); } }
.dc-fab-comet {
  position: absolute; inset: -5px; border-radius: 9999px;
  background: conic-gradient(from 0deg, transparent 0 52%, rgba(247,179,28,.15) 62%, #F7B31C 86%, #FFF7DB 92%, transparent 93%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
  animation: dc-fab-spin 2.8s linear infinite;
}
@keyframes dc-fab-sonar { 0% { transform: scale(1); opacity: .75; } 100% { transform: scale(1.75); opacity: 0; } }
.dc-fab-sonar { position: absolute; inset: 0; border-radius: 9999px; border: 2px solid rgba(251,191,36,.6); animation: dc-fab-sonar 2.6s cubic-bezier(.16,1,.3,1) infinite; }
.dc-fab-sonar.is-late { animation-delay: 1.3s; }
.dc-fab-orbit { position: absolute; inset: 0; animation: dc-fab-spin 7s linear infinite reverse; }
@keyframes dc-fab-twinkle { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
.dc-fab-orbit i { position: absolute; left: 50%; top: 50%; border-radius: 9999px; background: #FDE68A; box-shadow: 0 0 6px 1px rgba(253,230,138,.8); animation: dc-fab-twinkle 1.8s ease-in-out infinite; }
.dc-fab-orbit i:nth-child(1) { width: 4px; height: 4px; margin: -2px; transform: rotate(20deg) translateY(-37px); }
.dc-fab-orbit i:nth-child(2) { width: 3px; height: 3px; margin: -1.5px; transform: rotate(140deg) translateY(-36px); background: #fff; animation-delay: .6s; }
.dc-fab-orbit i:nth-child(3) { width: 2.5px; height: 2.5px; margin: -1.25px; transform: rotate(255deg) translateY(-38px); animation-delay: 1.2s; }
@keyframes dc-fab-shine { 0%, 55% { transform: translateX(-62%); } 100% { transform: translateX(62%); } }
.dc-fab-shine { position: absolute; inset: -50%; background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,.8) 50%, transparent 58%); animation: dc-fab-shine 3.6s ease-in-out infinite; }
@keyframes dc-fab-icon { 0%, 100% { transform: rotate(0) scale(1); } 50% { transform: rotate(-14deg) scale(1.14); } }
.dc-fab-icon { animation: dc-fab-icon 2.4s ease-in-out infinite; }
@keyframes dc-fab-text { from { background-position: 150% 0; } to { background-position: -50% 0; } }
.dc-fab-label {
  background: linear-gradient(90deg, #fff 0%, #fff 38%, #FCD34D 50%, #fff 62%, #fff 100%);
  background-size: 250% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: dc-fab-text 3.6s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .dc-tabbar, .dc-tab-pop, .dc-fab-comet, .dc-fab-orbit, .dc-fab-icon, .dc-fab-label { animation: none; }
  .dc-fab-sonar, .dc-fab-shine, .dc-fab-orbit { display: none; }
  .dc-tab-marker { transition: opacity .2s ease; }
}
`;

/* Phones and tablets: an app-style tab bar. The raised centre button starts the
   free trial — or, for someone already signed in, goes back to their dashboard. */
export default function PublicTabBar({ signupHref }: { signupHref: string }) {
  const { pathname } = useLocation();
  // Read after mount: the server renders the signed-out bar, so hydration matches.
  const [home, setHome] = useState<string | null>(null);
  useEffect(() => {
    setHome(getToken("main") ? "/dashboard" : getToken("admin") ? "/admin" : null);
  }, []);

  const designs = ["/digital-business-cards-templates", "/templates", "/card-designs", "/digital-business-cards", "/demo", "/industries"]
    .some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const pricing = pathname.startsWith("/pricing");
  // Slot of the active tab (the centre button is slot 2). On pages without a
  // tab the marker fades out where it last was instead of sliding away.
  const active = pathname === "/" ? 0 : designs ? 1 : pricing ? 3 : -1;
  const lastSlot = useRef(active < 0 ? 0 : active);
  if (active >= 0) lastSlot.current = active;

  const tab = (on: boolean) =>
    `dc-tab flex flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[10.5px] leading-none transition-colors duration-300 ${on ? "font-bold text-[#F7B31C]" : "font-medium text-[#94A3B8]"}`;
  const face = (Icon: LucideIcon, on: boolean) => (
    <span className="dc-tab-press relative flex h-7 w-11 items-center justify-center">
      <span className="dc-tab-halo" aria-hidden="true" />
      <Icon key={on ? "on" : "off"} size={21} strokeWidth={on ? 2.4 : 1.9} className={`relative ${on ? "dc-tab-pop" : ""}`} />
    </span>
  );

  return (
    <nav aria-label="Quick navigation" className="dc-tabbar lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0B1120]/[0.96] backdrop-blur-xl">
      <style>{TAB_CSS}</style>
      <div className="relative mx-auto flex h-[62px] max-w-lg items-stretch px-1">
        <div className="pointer-events-none absolute inset-y-0 left-1 right-1" aria-hidden="true">
          <div className="dc-tab-marker absolute inset-y-0 left-0 w-1/5"
            style={{ transform: `translateX(${lastSlot.current * 100}%)`, opacity: active >= 0 ? 1 : 0 }}>
            <span className="absolute left-1/2 top-0 h-12 w-16 -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(247,179,28,0.24),transparent_70%)]" />
            <span className="absolute left-1/2 top-[-1px] h-[3px] w-7 -translate-x-1/2 rounded-b-full bg-[#F7B31C] shadow-[0_0_12px_2px_rgba(247,179,28,0.55)]" />
          </div>
        </div>

        <Link to="/" onClick={() => haptic()} className={tab(active === 0)} aria-current={active === 0 ? "page" : undefined}>
          {face(HomeIcon, active === 0)} Home
        </Link>
        <Link to="/digital-business-cards-templates" onClick={() => haptic()} className={tab(designs)} aria-current={designs ? "page" : undefined}>
          {face(LayoutGrid, designs)} Designs
        </Link>
        <div className="flex flex-1 justify-center">
          <Link to={home ?? signupHref} onClick={() => haptic()}
            className="dc-fab -mt-5 flex flex-col items-center gap-1.5 text-[10.5px] font-bold leading-none text-white">
            <span className="dc-fab-press relative flex h-[52px] w-[52px]">
              <span className="dc-fab-sonar" aria-hidden="true" />
              <span className="dc-fab-sonar is-late" aria-hidden="true" />
              <span className="dc-fab-plate" aria-hidden="true" />
              <span className="dc-fab-comet" aria-hidden="true" />
              <span className="dc-fab-orbit" aria-hidden="true"><i /><i /><i /></span>
              <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] text-[#0B1120] shadow-[0_10px_24px_-8px_rgba(247,179,28,0.8)]">
                <span className="dc-fab-shine" aria-hidden="true" />
                {home ? <LayoutDashboard size={22} className="relative" /> : <Sparkles size={22} className="dc-fab-icon relative" />}
              </span>
            </span>
            <span className="dc-fab-label">{home ? "Dashboard" : "Start free"}</span>
          </Link>
        </div>
        <Link to="/pricing" onClick={() => haptic()} className={tab(pricing)} aria-current={pricing ? "page" : undefined}>
          {face(Tag, pricing)} Pricing
        </Link>
        <button type="button" onClick={() => { haptic(); window.dispatchEvent(new Event("dc:open-site-menu")); }} className={tab(false)}>
          {face(Menu, false)} Menu
        </button>
      </div>
      <div className="h-safe-bottom" />
    </nav>
  );
}

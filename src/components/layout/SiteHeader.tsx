/*
 * The public site header: a floating glass bar with mega menus, page search
 * (Ctrl/⌘ K or "/"), a reading-progress line and a full-screen mobile menu.
 *
 * Menu content lives in src/lib/publicNav.ts beside the footer and /sitemap
 * lists, so a new page is added in one place.
 *
 * Closed menus stay in the page (made `inert`): their links are in the
 * server-rendered HTML for crawlers, but can't be reached by Tab until opened.
 *
 * The mobile menu and search sit OUTSIDE the bar on purpose — the bar has a
 * backdrop blur, which would become the containing block for position:fixed
 * children and squash them into the bar.
 */
import { Link, useLocation, useNavigate } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Building2, ChevronDown, CornerDownLeft, CreditCard, FileText, Gift, Globe, Handshake, Home,
  Layers, LayoutGrid, LogIn, Mail, Map as MapIcon, Menu, MessageCircle, MessageSquareText, PenLine,
  Phone, Search, Sparkles, Tag, Wand2, Wrench, X, type LucideIcon,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { CONTACT, HEADER_LINKS, HEADER_MENUS, SEARCH_PAGES, SOCIAL_LINKS, type HeaderMenu } from "@/lib/publicNav";

const ICONS: Record<string, LucideIcon> = {
  "/": Home,
  "/features": Sparkles,
  "/ai-card-generator": Wand2,
  "/custom-domain": Globe,
  "/pricing": Tag,
  "/digital-business-cards-templates": LayoutGrid,
  "/industries": Building2,
  "/email-signature-generator": PenLine,
  "/whatsapp-message-templates": MessageSquareText,
  "/free-tools": Wrench,
  "/bulk-cards": Layers,
  "/resellers": Handshake,
  "/refer-earn": Gift,
  "/contact": MessageCircle,
  "/signup": Sparkles,
  "/login": LogIn,
  "/sitemap": MapIcon,
};
const iconFor = (href: string): LucideIcon => ICONS[href] ?? (href.startsWith("/digital-business-cards-templates/") ? CreditCard : FileText);

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export default function SiteHeader({ signupHref }: { signupHref: string }) {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<HeaderMenu["id"] | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<HeaderMenu["id"] | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const [modKey, setModKey] = useState("Ctrl");
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const hoveredAt = useRef(0);

  useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)) setModKey("⌘");
  }, []);

  // Glass deepens once the page moves; the gold line tracks reading progress.
  // Written straight to the element each frame instead of through state.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 12);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Open the mobile menu on the group that holds the current page.
  useEffect(() => {
    if (mobileOpen) setMobileGroup(HEADER_MENUS.find((m) => m.items.some((i) => isActive(pathname, i.href)))?.id ?? null);
  }, [mobileOpen, pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [openMenu]);

  useEffect(() => {
    if (!mobileOpen && !searchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen, searchOpen]);

  const hoverOpen = (id: HeaderMenu["id"]) => {
    window.clearTimeout(closeTimer.current);
    hoveredAt.current = Date.now();
    setOpenMenu(id);
  };
  const hoverClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 160);
  };

  const logo = (
    <Link to="/" className="flex shrink-0 items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7B31C]" aria-label="DigitalCarda home">
      {logoOk ? (
        <img src="/logo.png" alt="DigitalCarda" className="h-9 w-auto object-contain lg:h-10" onError={() => setLogoOk(false)} />
      ) : (
        <span className="flex items-center gap-2">
          <span className="gradient-gold flex h-8 w-8 items-center justify-center rounded-lg"><CreditCard size={16} className="text-[#0F172A]" /></span>
          <span className="text-lg font-bold text-white">Digital<span className="text-gradient-gold">Carda</span></span>
        </span>
      )}
    </Link>
  );

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-2.5 pt-2 sm:px-4 lg:pt-3">
        <div
          ref={barRef}
          onPointerLeave={(e) => { if (e.pointerType === "mouse") hoverClose(); }}
          onPointerEnter={() => window.clearTimeout(closeTimer.current)}
          className={`pointer-events-auto relative mx-auto max-w-7xl rounded-2xl border backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300 ${
            scrolled || openMenu
              ? "border-white/10 bg-[#0B1120]/[0.92] shadow-[0_18px_44px_-18px_rgba(2,6,23,0.7)]"
              : "border-white/[0.07] bg-[#0B1120]/80 shadow-[0_12px_32px_-22px_rgba(2,6,23,0.6)]"
          }`}
        >
          <div className="flex h-14 items-center gap-2 pl-3 pr-2 lg:h-[60px] lg:pl-4">
            {logo}

            <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
              {HEADER_MENUS.map((m) => {
                const open = openMenu === m.id;
                const active = m.items.some((i) => isActive(pathname, i.href));
                return (
                  <button
                    key={m.id}
                    id={`menu-trigger-${m.id}`}
                    type="button"
                    aria-expanded={open}
                    aria-controls={`menu-${m.id}`}
                    onPointerEnter={(e) => { if (e.pointerType === "mouse") hoverOpen(m.id); }}
                    onClick={() => {
                      // A click right after hover-opening shouldn't snap the menu shut.
                      if (open && Date.now() - hoveredAt.current > 450) setOpenMenu(null);
                      else setOpenMenu(m.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setOpenMenu(m.id);
                        requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>(`#menu-${m.id} a`)?.focus());
                      }
                    }}
                    className={`relative inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7B31C] ${
                      open ? "bg-white/10 text-white" : active ? "text-[#F7B31C]" : "text-[#CBD5E1] hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <MenuLabel menu={m} />
                    <ChevronDown size={14} className={`opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                    {active && <span aria-hidden="true" className="absolute inset-x-3 -bottom-[3px] h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#F7B31C] to-transparent" />}
                  </button>
                );
              })}
              {HEADER_LINKS.map((l) => {
                const active = isActive(pathname, l.href);
                return (
                  <Link
                    key={l.href}
                    to={l.href}
                    onPointerEnter={(e) => { if (e.pointerType === "mouse" && openMenu) hoverClose(); }}
                    aria-current={active ? "page" : undefined}
                    className={`relative inline-flex h-10 items-center rounded-xl px-3 text-[13.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7B31C] ${
                      active ? "text-[#F7B31C]" : "text-[#CBD5E1] hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {l.label}
                    {active && <span aria-hidden="true" className="absolute inset-x-3 -bottom-[3px] h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#F7B31C] to-transparent" />}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search pages and templates"
                className="inline-flex h-10 w-10 items-center justify-center gap-2 rounded-xl text-[#CBD5E1] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7B31C] xl:w-auto xl:border xl:border-white/10 xl:bg-white/[0.04] xl:pl-3 xl:pr-1.5 xl:text-[13px] xl:text-[#94A3B8]"
              >
                <Search size={16} />
                <span className="hidden xl:inline">Search</span>
                <kbd className="hidden h-6 items-center rounded-md border border-white/10 bg-white/5 px-1.5 font-sans text-[10px] font-semibold text-[#94A3B8] xl:inline-flex">{modKey} K</kbd>
              </button>
              <a
                href={CONTACT.whatsappHref}
                target="_blank"
                rel="noreferrer"
                aria-label="Chat with us on WhatsApp"
                title="Chat on WhatsApp"
                className="hidden h-10 w-10 items-center justify-center rounded-xl text-[#4ADE80] transition-colors hover:bg-[#25D366]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7B31C] xl:inline-flex"
              >
                <MessageCircle size={18} />
              </a>
              <Link
                to="/login"
                className="hidden h-10 items-center rounded-xl px-3 text-[13.5px] font-medium text-[#CBD5E1] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7B31C] lg:inline-flex"
              >
                Sign in
              </Link>
              <Link
                to={signupHref}
                className="group relative hidden h-10 items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-r from-[#F7B31C] to-[#FBBF24] px-4 text-[13.5px] font-bold text-[#0B1120] shadow-[0_8px_22px_-10px_rgba(247,179,28,0.85)] transition-[filter,transform] hover:brightness-105 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F7B31C] sm:inline-flex"
              >
                <span aria-hidden="true" className="absolute inset-y-0 -left-10 w-8 -skew-x-12 bg-white/40 blur-sm transition-transform duration-700 group-hover:translate-x-[220px] motion-reduce:hidden" />
                <span className="relative">Start free<span className="hidden xl:inline"> trial</span></span>
                <ArrowRight size={15} className="relative transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F7B31C] lg:hidden"
              >
                <Menu size={19} />
              </button>
            </div>
          </div>

          {/* Reading progress */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 bottom-0 h-px overflow-hidden">
            <div ref={progressRef} className="h-full origin-left bg-gradient-to-r from-[#F7B31C]/0 via-[#F7B31C] to-[#FDE68A]" style={{ transform: "scaleX(0)" }} />
          </div>

          {/* Mega menus */}
          {HEADER_MENUS.map((m) => {
            const open = openMenu === m.id;
            return (
              <div
                key={m.id}
                id={`menu-${m.id}`}
                role="region"
                aria-label={m.label}
                inert={!open}
                onKeyDown={(e) => {
                  if (e.key === "Escape") document.getElementById(`menu-trigger-${m.id}`)?.focus();
                }}
                className={`absolute left-1/2 top-full hidden w-[min(780px,calc(100vw-2rem))] -translate-x-1/2 pt-2.5 transition duration-200 lg:block motion-reduce:transition-none ${
                  open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1.5 opacity-0"
                }`}
              >
                <div className="grid grid-cols-[1fr_270px] overflow-hidden rounded-2xl bg-white shadow-[0_32px_64px_-24px_rgba(2,6,23,0.5)] ring-1 ring-[#0F172A]/5">
                  <div className="flex flex-col p-3">
                    <ul className="grid gap-1">
                      {m.items.map((item) => {
                        const Icon = iconFor(item.href);
                        const active = isActive(pathname, item.href);
                        return (
                          <li key={item.href}>
                            <Link
                              to={item.href}
                              aria-current={active ? "page" : undefined}
                              className={`group flex items-start gap-3.5 rounded-xl p-3 outline-none transition-colors focus-visible:bg-[#FFFBEB] ${active ? "bg-[#FFFBEB]" : "hover:bg-[#F8FAFC]"}`}
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#B45309] transition-colors group-hover:bg-[#F7B31C] group-hover:text-[#0B1120] group-focus-visible:bg-[#F7B31C] group-focus-visible:text-[#0B1120]">
                                <Icon size={18} />
                              </span>
                              <span className="min-w-0">
                                <span className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                                  {item.label}
                                  {item.badge && <span className="rounded-full bg-[#DCFCE7] px-1.5 text-[10px] font-bold uppercase leading-4 text-[#166534]">{item.badge}</span>}
                                  <ArrowRight size={13} className="-translate-x-1 text-[#B45309] opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                                </span>
                                <span className="mt-0.5 block text-[13px] leading-snug text-[#64748B]">{item.desc}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-auto flex items-center justify-between gap-3 rounded-xl bg-[#F8FAFC] px-3.5 py-2.5 text-[13px] text-[#475569]">
                      <span>Not sure what fits your business?</span>
                      <a href={CONTACT.whatsappHref} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[#15803D] hover:underline">
                        <MessageCircle size={14} /> Ask on WhatsApp
                      </a>
                    </div>
                  </div>
                  <FeatureCard menu={m} signupHref={signupHref} />
                </div>
              </div>
            );
          })}
        </div>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        pathname={pathname}
        signupHref={signupHref}
        group={mobileGroup}
        setGroup={setMobileGroup}
        onSearch={() => { setMobileOpen(false); setSearchOpen(true); }}
      />

      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} modKey={modKey} />}
    </>
  );
}

/** A menu's label. "Free tools" shows its first word as a yellow pill, so the
    word is highlighted once instead of repeated beside the label. */
function MenuLabel({ menu }: { menu: HeaderMenu }) {
  const [first, ...rest] = menu.label.split(" ");
  if (menu.id !== "tools") return <>{menu.label}</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rounded-full bg-[#F7B31C] px-2 text-[0.8em] font-bold leading-5 text-[#0B1120]">{first}</span>
      {rest.join(" ")}
    </span>
  );
}

/* ── Mega menu feature card ───────────────────────────────────────────────── */

function FeatureCard({ menu, signupHref }: { menu: HeaderMenu; signupHref: string }) {
  const f = menu.feature;
  return (
    <Link
      to={f.href === "/signup" ? signupHref : f.href}
      className="group relative m-2 flex flex-col overflow-hidden rounded-xl bg-[#0B1120] p-5 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#F7B31C]/25 blur-3xl transition-transform duration-700 group-hover:scale-125" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-44 w-44 rounded-full bg-[#14B8A6]/15 blur-3xl" />
      <FeatureArt id={menu.id} />
      <span className="relative mt-auto pt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#F7B31C]">{f.eyebrow}</span>
      <span className="relative mt-1 text-base font-bold leading-snug">{f.title}</span>
      <span className="relative mt-1 text-[13px] leading-relaxed text-[#94A3B8]">{f.text}</span>
      <span className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#F7B31C]">
        {f.cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

// A 5×5 stand-in QR pattern — decoration only.
const QR = [1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1];

function MiniCard({ tone, className = "" }: { tone: string; className?: string }) {
  return (
    <span className={`block w-[150px] rounded-xl bg-white p-2.5 shadow-xl ${className}`}>
      <span className="flex items-center gap-2">
        <span className="h-7 w-7 shrink-0 rounded-full" style={{ background: tone }} />
        <span className="flex-1 space-y-1">
          <span className="block h-1.5 w-16 rounded bg-[#0F172A]" />
          <span className="block h-1 w-10 rounded bg-[#CBD5E1]" />
        </span>
      </span>
      <span className="mt-2 grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => <span key={i} className="h-3 rounded" style={{ background: i === 1 ? tone : "#F1F5F9" }} />)}
      </span>
    </span>
  );
}

function FeatureArt({ id }: { id: HeaderMenu["id"] }) {
  if (id === "product") {
    return (
      <span aria-hidden="true" className="relative mx-auto block w-[190px] -rotate-3 rounded-xl bg-white p-3 text-[#0F172A] shadow-2xl transition-transform duration-500 group-hover:rotate-0 motion-reduce:transition-none">
        <span className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-gradient-to-br from-[#F7B31C] to-[#F59E0B]" />
          <span className="flex-1 space-y-1">
            <span className="block h-2 w-20 rounded bg-[#0F172A]" />
            <span className="block h-1.5 w-14 rounded bg-[#CBD5E1]" />
          </span>
        </span>
        <span className="mt-3 grid grid-cols-3 gap-1.5">
          {["Call", "WhatsApp", "Save"].map((t) => (
            <span key={t} className={`rounded-md py-1 text-center text-[8px] font-bold ${t === "WhatsApp" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F1F5F9] text-[#334155]"}`}>{t}</span>
          ))}
        </span>
        <span className="mt-2.5 flex items-end justify-between">
          <span className="space-y-1">
            <span className="block h-1.5 w-16 rounded bg-[#E2E8F0]" />
            <span className="block h-1.5 w-12 rounded bg-[#E2E8F0]" />
            <span className="block h-1.5 w-14 rounded bg-[#E2E8F0]" />
          </span>
          <span className="grid grid-cols-5 gap-[2px] rounded bg-white p-0.5 ring-1 ring-[#E2E8F0]">
            {QR.map((on, i) => <span key={i} className={`h-[5px] w-[5px] ${on ? "bg-[#0F172A]" : "bg-transparent"}`} />)}
          </span>
        </span>
      </span>
    );
  }
  if (id === "templates") {
    return (
      <span aria-hidden="true" className="relative mx-auto block h-[112px] w-[220px]">
        <MiniCard tone="#0F766E" className="absolute left-0 top-4 -rotate-12 transition-transform duration-500 group-hover:-translate-x-2 group-hover:-rotate-[16deg] motion-reduce:transition-none" />
        <MiniCard tone="#BE185D" className="absolute right-0 top-4 rotate-12 transition-transform duration-500 group-hover:translate-x-2 group-hover:rotate-[16deg] motion-reduce:transition-none" />
        <MiniCard tone="linear-gradient(135deg,#F7B31C,#F59E0B)" className="absolute left-1/2 top-0 -translate-x-1/2" />
      </span>
    );
  }
  if (id === "tools") {
    return (
      <span aria-hidden="true" className="relative mx-auto block w-[210px]">
        <span className="block rounded-xl bg-white p-3 shadow-2xl">
          <span className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#1E3A8A] to-[#0F172A]" />
            <span className="flex-1 space-y-1">
              <span className="block h-2 w-20 rounded bg-[#0F172A]" />
              <span className="block h-1.5 w-16 rounded bg-[#94A3B8]" />
            </span>
          </span>
          <span className="mt-2.5 block h-0.5 w-full rounded bg-gradient-to-r from-[#F7B31C] to-transparent" />
          <span className="mt-2 flex gap-1.5">
            {["#0A66C2", "#E1306C", "#25D366", "#0F172A"].map((c) => <span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />)}
          </span>
        </span>
        <span className="absolute -bottom-3 -right-2 max-w-[150px] rounded-xl rounded-br-sm bg-[#DCF8C6] px-2.5 py-1.5 text-[9px] font-medium leading-snug text-[#14532D] shadow-lg transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transition-none">
          Hi! Thanks for messaging us. We'll reply shortly.
        </span>
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="relative mx-auto flex flex-col items-center">
      <span className="flex -space-x-3">
        {["#F7B31C", "#14B8A6", "#6366F1", "#F43F5E", "#0EA5E9"].map((c, i) => (
          <span key={c} className="h-11 w-11 rounded-full border-2 border-[#0B1120] transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transition-none" style={{ background: c, transitionDelay: `${i * 40}ms` }} />
        ))}
      </span>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15">
        <Handshake size={13} className="text-[#F7B31C]" /> 20–30% recurring
      </span>
    </span>
  );
}

/* ── Mobile menu ──────────────────────────────────────────────────────────── */

function MobileMenu({
  open, onClose, pathname, signupHref, group, setGroup, onSearch,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  signupHref: string;
  group: HeaderMenu["id"] | null;
  setGroup: (g: HeaderMenu["id"] | null) => void;
  onSearch: () => void;
}) {
  return (
    <div className={`fixed inset-0 z-[60] lg:hidden ${open ? "" : "pointer-events-none"}`} role="dialog" aria-modal="true" aria-label="Menu" inert={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-[#020617]/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col overflow-hidden bg-[#0B1120] text-white shadow-2xl transition-transform duration-300 motion-reduce:transition-none ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F7B31C]/15 blur-3xl" />

        <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-4">
          <Link to="/" onClick={onClose} aria-label="DigitalCarda home"><img src="/logo.png" alt="DigitalCarda" className="h-9 w-auto object-contain" /></Link>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onSearch} aria-label="Search pages and templates" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-[#CBD5E1] active:scale-95">
              <Search size={17} />
            </button>
            <button type="button" onClick={onClose} aria-label="Close menu" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-white active:scale-95">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
          <Link to={signupHref} onClick={onClose} className="block rounded-2xl bg-gradient-to-r from-[#F7B31C] via-[#FDE68A] to-[#14B8A6] p-[1.5px]">
            <span className="flex items-center gap-3 rounded-[15px] bg-[#111A2E] px-4 py-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7B31C]/15"><Sparkles size={18} className="text-[#F7B31C]" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">30 days free · no payment needed</span>
                <span className="block text-xs text-[#94A3B8]">Create your digital business card today</span>
              </span>
              <ArrowRight size={17} className="shrink-0 text-[#F7B31C]" />
            </span>
          </Link>

          <nav aria-label="Mobile" className="mt-5 space-y-1.5">
            {HEADER_MENUS.map((m) => {
              const expanded = group === m.id;
              const active = m.items.some((i) => isActive(pathname, i.href));
              return (
                <div key={m.id} className={`rounded-2xl transition-colors ${expanded ? "bg-white/[0.04] ring-1 ring-white/[0.08]" : ""}`}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setGroup(expanded ? null : m.id)}
                    className="flex w-full items-center gap-2 rounded-2xl px-3.5 py-3.5 text-left text-[15px] font-semibold"
                  >
                    <span className={active ? "text-[#F7B31C]" : "text-white"}><MenuLabel menu={m} /></span>
                    <ChevronDown size={17} className={`ml-auto text-[#64748B] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <ul className="overflow-hidden" inert={!expanded}>
                      {m.items.map((item) => {
                        const Icon = iconFor(item.href);
                        const on = isActive(pathname, item.href);
                        return (
                          <li key={item.href}>
                            <Link to={item.href} onClick={onClose} className={`mx-1.5 mb-1 flex items-center gap-3 rounded-xl px-2.5 py-2.5 active:scale-[0.99] ${on ? "bg-[#F7B31C]/10" : ""}`}>
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${on ? "bg-[#F7B31C] text-[#0B1120]" : "bg-white/[0.06] text-[#F7B31C]"}`}><Icon size={17} /></span>
                              <span className="min-w-0">
                                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                                  {item.label}
                                  {item.badge && <span className="rounded-full bg-[#22C55E]/15 px-1.5 text-[10px] font-bold uppercase leading-4 text-[#4ADE80]">{item.badge}</span>}
                                </span>
                                <span className="block text-xs leading-snug text-[#94A3B8]">{item.desc}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            })}
            {HEADER_LINKS.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                onClick={onClose}
                className={`flex items-center rounded-2xl px-3.5 py-3.5 text-[15px] font-semibold ${isActive(pathname, l.href) ? "text-[#F7B31C]" : "text-white"}`}
              >
                {l.label}
                <ArrowRight size={16} className="ml-auto text-[#64748B]" />
              </Link>
            ))}
          </nav>

          <p className="mt-6 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">Talk to us</p>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <a href={CONTACT.phoneHref} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.05] py-3 text-xs font-semibold text-[#E2E8F0] active:scale-95">
              <Phone size={18} className="text-[#F7B31C]" /> Call
            </a>
            <a href={CONTACT.whatsappHref} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#25D366]/10 py-3 text-xs font-semibold text-[#4ADE80] active:scale-95">
              <MessageCircle size={18} /> WhatsApp
            </a>
            <a href={`mailto:${CONTACT.email}`} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.05] py-3 text-xs font-semibold text-[#E2E8F0] active:scale-95">
              <Mail size={18} className="text-[#F7B31C]" /> Email
            </a>
          </div>
        </div>

        <div className="pb-safe relative shrink-0 border-t border-white/[0.08] px-4 pt-3">
          <div className="grid grid-cols-2 gap-2.5 pb-3">
            <Link to="/login" onClick={onClose} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 text-sm font-semibold text-white active:scale-[0.98]">
              <LogIn size={16} /> Sign in
            </Link>
            <Link to={signupHref} onClick={onClose} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F7B31C] to-[#FBBF24] text-sm font-bold text-[#0B1120] active:scale-[0.98]">
              Start free <ArrowRight size={16} />
            </Link>
          </div>
          <div className="flex items-center justify-between pb-3 text-xs text-[#64748B]">
            <span>{CONTACT.phone}</span>
            <span className="flex items-center gap-2">
              {SOCIAL_LINKS.map((s) => (
                <a key={s.href} href={s.href} target="_blank" rel="noreferrer me" aria-label={`DigitalCarda on ${s.label}`} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                  <img src={s.icon} alt="" width={16} height={16} className="h-4 w-4" loading="lazy" />
                </a>
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Search ───────────────────────────────────────────────────────────────── */

type Hit = { kind: "Page" | "Template"; label: string; desc: string; href: string };

function SearchDialog({ onClose, modKey }: { onClose: () => void; modKey: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { data: catalogue } = trpc.product.catalogue.useQuery(undefined, { staleTime: 5 * 60_000 });

  useEffect(() => { inputRef.current?.focus(); }, []);

  const hits = useMemo<Hit[]>(() => {
    const pages: Hit[] = SEARCH_PAGES.map((p) => ({ kind: "Page", label: p.label, desc: p.desc ?? "", href: p.href }));
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return pages.slice(0, 8);
    const templates: Hit[] = ((catalogue ?? []) as unknown as { slug: string; name: string; tagline?: string | null }[]).map((p) => ({
      kind: "Template", label: p.name, desc: p.tagline || "Digital business card template", href: `/digital-business-cards-templates/${p.slug}`,
    }));
    return [...pages, ...templates]
      .map((h) => {
        const label = h.label.toLowerCase();
        const hay = `${label} ${h.desc.toLowerCase()}`;
        if (!terms.every((t) => hay.includes(t))) return null;
        return { h, score: (label.startsWith(terms[0]) ? 3 : 0) + (terms.every((t) => label.includes(t)) ? 2 : 0) + (h.kind === "Page" ? 1 : 0) };
      })
      .filter((x): x is { h: Hit; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.h);
  }, [q, catalogue]);

  useEffect(() => { setIndex(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const go = (h: Hit | undefined) => {
    if (!h) return;
    onClose();
    navigate(h.href);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[10vh] sm:px-4" role="dialog" aria-modal="true" aria-label="Search DigitalCarda">
      <div onClick={onClose} className="absolute inset-0 bg-[#020617]/60 backdrop-blur-sm" style={{ animation: "fadeIn .15s ease-out" }} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_40px_80px_-20px_rgba(2,6,23,0.6)] ring-1 ring-black/5" style={{ animation: "scaleIn .18s ease-out" }}>
        <div className="flex items-center gap-3 border-b border-[#EEF2F6] px-4">
          <Search size={18} className="shrink-0 text-[#94A3B8]" />
          <input
            ref={inputRef}
            id="site-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(hits.length - 1, i + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); go(hits[index]); }
              else if (e.key === "Escape") { e.preventDefault(); onClose(); }
            }}
            placeholder="Search pages, tools and card templates…"
            aria-label="Search"
            aria-controls="site-search-results"
            aria-activedescendant={hits[index] ? `site-search-${index}` : undefined}
            autoComplete="off"
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
          />
          <button type="button" onClick={onClose} className="rounded-md border border-[#E2E8F0] px-1.5 py-0.5 text-[11px] font-semibold text-[#64748B] hover:bg-[#F8FAFC]">Esc</button>
        </div>

        <ul ref={listRef} id="site-search-results" role="listbox" className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {!q.trim() && <li className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">Popular</li>}
          {hits.map((h, i) => {
            const Icon = iconFor(h.href);
            const on = i === index;
            return (
              <li key={h.href} id={`site-search-${i}`} role="option" aria-selected={on} data-index={i}>
                <button
                  type="button"
                  onMouseMove={() => setIndex(i)}
                  onClick={() => go(h)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${on ? "bg-[#FFFBEB]" : ""}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? "bg-[#F7B31C] text-[#0B1120]" : "bg-[#F1F5F9] text-[#64748B]"}`}><Icon size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#0F172A]">{h.label}</span>
                    <span className="block truncate text-xs text-[#64748B]">{h.desc}</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B]">{h.kind}</span>
                  {on && <CornerDownLeft size={14} className="shrink-0 text-[#B45309]" />}
                </button>
              </li>
            );
          })}
          {q.trim() && hits.length === 0 && (
            <li className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-[#0F172A]">Nothing matches “{q.trim()}”</p>
              <p className="mt-1 text-sm text-[#64748B]">Ask us instead — we reply on WhatsApp.</p>
              <a href={CONTACT.whatsappHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#DCFCE7] px-4 py-2 text-sm font-semibold text-[#166534]">
                <MessageCircle size={15} /> Chat on WhatsApp
              </a>
            </li>
          )}
        </ul>

        <div className="hidden items-center gap-4 border-t border-[#EEF2F6] bg-[#F8FAFC] px-4 py-2.5 text-[11px] text-[#64748B] sm:flex">
          <span><kbd className="font-sans font-semibold">↑↓</kbd> to move</span>
          <span><kbd className="font-sans font-semibold">↵</kbd> to open</span>
          <span className="ml-auto"><kbd className="font-sans font-semibold">{modKey} K</kbd> anywhere to search</span>
        </div>
      </div>
    </div>
  );
}

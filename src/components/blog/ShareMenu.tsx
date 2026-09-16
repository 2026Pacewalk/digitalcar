/* Sharing for blog articles — DigitalCarda's own share panel.

   Every share control opens the same branded panel rather than the operating
   system's share window (on Windows and macOS that window is plain and often
   has no WhatsApp at all). The panel has:
     · a link preview of the article
     · one-tap buttons for WhatsApp, Facebook, LinkedIn, X, Telegram and email
     · copy link
     · a QR code, to open the article on a phone
     · "More apps" (the phone's own share sheet) on touch devices only

   Triggers:
     <ShareIconButton> — round icon on article cards; grows a "Share" label on hover
     <ShareCluster>    — the article header button with stacked app icons
     <ShareRail>       — a sticky vertical row beside the article on wide screens
     <ShareEnd>        — the "pass it on" block at the end of an article

   Links carry utm tags so shared visits show up by app in analytics; the
   article's canonical URL keeps them out of Google's index. */
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Link2, Mail, MoreHorizontal, QrCode, Share2, X } from "lucide-react";
import { toast } from "sonner";
import PostVisual from "./PostVisual";
import { blogPostPath, categoryLabel, type BlogPost } from "@/data/blog";

const SITE = "https://digitalcarda.in";
const enc = encodeURIComponent;
const utm = (url: string, source: string) => `${url}?utm_source=${source}&utm_medium=social&utm_campaign=blog_share`;
const articleUrl = (post: BlogPost) => `${SITE}${blogPostPath(post.slug)}`;

type ShareApp = { id: string; label: string; color: string; icon?: string; href: (url: string, post: BlogPost) => string };

const APPS: ShareApp[] = [
  { id: "whatsapp", label: "WhatsApp", color: "#25D366", icon: "/sig/s-whatsapp.png", href: (u, p) => `https://wa.me/?text=${enc(`${p.title}\n${utm(u, "whatsapp")}`)}` },
  { id: "facebook", label: "Facebook", color: "#1877F2", icon: "/sig/s-facebook.png", href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${enc(utm(u, "facebook"))}` },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2", icon: "/sig/s-linkedin.png", href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(utm(u, "linkedin"))}` },
  { id: "x", label: "X", color: "#0F1419", icon: "/sig/s-x.png", href: (u, p) => `https://twitter.com/intent/tweet?text=${enc(p.title)}&url=${enc(utm(u, "x"))}` },
  { id: "telegram", label: "Telegram", color: "#229ED9", icon: "/sig/s-telegram.png", href: (u, p) => `https://t.me/share/url?url=${enc(utm(u, "telegram"))}&text=${enc(p.title)}` },
  { id: "email", label: "Email", color: "#F7B31C", href: (u, p) => `mailto:?subject=${enc(p.title)}&body=${enc(`${p.excerpt}\n\n${utm(u, "email")}`)}` },
];

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** One app as a round, brand-coloured bubble. */
function AppBubble({ app, post, size = 56, sizeClass, showLabel = true, onDone }: {
  app: ShareApp; post: BlogPost;
  /** Fixed bubble size in px… */
  size?: number;
  /** …or responsive Tailwind size classes, e.g. "h-11 w-11 sm:h-14 sm:w-14". */
  sizeClass?: string;
  showLabel?: boolean; onDone?: () => void;
}) {
  const mail = app.id === "email";
  return (
    <a
      href={app.href(articleUrl(post), post)}
      {...(mail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      onClick={onDone}
      aria-label={showLabel ? undefined : `Share on ${app.label}`}
      style={{ ["--brand" as string]: app.color }}
      className="group/app flex min-w-0 flex-col items-center gap-1.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] sm:gap-2"
    >
      <span
        className={`relative flex shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-out group-hover/app:-translate-y-1 group-hover/app:shadow-[0_14px_28px_-10px_var(--brand)] motion-reduce:transition-none ${sizeClass ?? ""}`}
        style={sizeClass ? undefined : { width: size, height: size }}
      >
        {/* Soft brand-coloured halo that blooms on hover */}
        <span aria-hidden="true" className="absolute inset-0 scale-75 rounded-full bg-[var(--brand)] opacity-0 blur-md transition-all duration-300 group-hover/app:scale-110 group-hover/app:opacity-30" />
        {app.icon
          ? <img src={app.icon} alt="" width={size} height={size} className="relative h-full w-full" loading="lazy" />
          : <span className="relative flex h-full w-full items-center justify-center rounded-full bg-[#F7B31C] text-[#0F172A]"><Mail className="h-[42%] w-[42%]" aria-hidden="true" /></span>}
      </span>
      {showLabel && <span className="max-w-full truncate text-[11px] font-semibold text-[#475569] group-hover/app:text-[#0F172A] sm:text-[12px]">{app.label}</span>}
    </a>
  );
}

/** Copy-link pill: the short address, and a button that turns green once copied. */
function CopyLink({ post, dark = false }: { post: BlogPost; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (await copyText(articleUrl(post))) {
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 2200);
    } else toast.error("Couldn't copy — select the address and copy it instead");
  };
  return (
    <div className={`flex items-center gap-2 rounded-2xl p-1.5 pl-4 ${dark ? "bg-white/10 ring-1 ring-white/15" : "bg-[#F8FAFC] ring-1 ring-[#E2E8F0]"}`}>
      <Link2 size={16} className={dark ? "shrink-0 text-[#F7B31C]" : "shrink-0 text-[#94A3B8]"} aria-hidden="true" />
      <span className={`min-w-0 flex-1 truncate text-[13.5px] ${dark ? "text-[#E2E8F0]" : "text-[#475569]"}`}>digitalcarda.in{blogPostPath(post.slug)}</span>
      <button
        type="button"
        onClick={onCopy}
        className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[13.5px] font-bold transition-all ${copied ? "bg-[#16A34A] text-white" : "bg-[#F7B31C] text-[#0F172A] hover:bg-[#FBBF24]"}`}
      >
        {copied ? <><Check size={15} strokeWidth={3} aria-hidden="true" /> Copied</> : "Copy link"}
      </button>
    </div>
  );
}

/** The share panel: a bottom sheet on phones, a centred card on larger screens. */
export function ShareSheet({ post, onClose }: { post: BlogPost; onClose: () => void }) {
  const url = articleUrl(post);
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [shown, setShown] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [nativeOk, setNativeOk] = useState(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => setShown(true));
    panel.current?.focus();
    // The phone's own share sheet is offered only on touch devices, where it lists the installed apps.
    setNativeOk(typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches);

    let alive = true;
    import("qrcode")
      .then((m) => m.default.toDataURL(url, { margin: 1, width: 240, color: { dark: "#0F172A", light: "#FFFFFF" } }))
      .then((data) => { if (alive) setQr(data); })
      .catch(() => { /* the QR is a nice-to-have */ });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close.current(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      // Keep keyboard focus inside the panel while it is open.
      const items = [...panel.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled])")];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [url]);

  const moreApps = async () => {
    try { await navigator.share({ title: post.title, text: post.excerpt, url: utm(url, "native_share") }); close.current(); }
    catch { /* dismissed */ }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div
        aria-hidden="true"
        onClick={() => close.current()}
        className={`absolute inset-0 bg-[#0B1120]/60 backdrop-blur-[3px] transition-opacity duration-300 motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-white shadow-[0_40px_100px_-30px_rgba(2,6,23,0.7)] outline-none transition-all duration-300 ease-out motion-reduce:transition-none sm:max-w-[30rem] sm:rounded-[2rem] ${shown ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-8 opacity-0 sm:scale-95"}`}
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-[#0F172A] px-6 pb-16 pt-5 text-white">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-[#F7B31C]/30 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:16px_16px]" />
          <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/25 sm:hidden" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.18em] text-[#F7B31C]"><Share2 size={13} aria-hidden="true" /> Share this guide</p>
              <h2 id={titleId} className="mt-2 font-display text-[1.45rem] font-extrabold leading-tight tracking-tight">Send it to someone who needs it</h2>
            </div>
            <button type="button" onClick={() => close.current()} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Link preview, overlapping the header */}
        <div className="relative mx-5 -mt-11 flex items-center gap-3.5 rounded-2xl bg-white p-3 shadow-[0_18px_40px_-20px_rgba(15,23,42,0.45)] ring-1 ring-[#EEF2F6]">
          <span className="h-16 w-24 shrink-0 overflow-hidden rounded-xl"><PostVisual post={post} /></span>
          <span className="min-w-0">
            <span className="line-clamp-2 font-display text-[14.5px] font-bold leading-snug text-[#0F172A]">{post.title}</span>
            <span className="mt-1 block truncate text-[12px] text-[#94A3B8]">digitalcarda.in · {categoryLabel(post.category)}</span>
          </span>
        </div>

        {/* Apps */}
        {/* All six apps in one row, on phones too */}
        <div className="grid grid-cols-6 gap-x-1 px-3 pt-7 sm:px-5">
          {APPS.map((app) => <AppBubble key={app.id} app={app} post={post} sizeClass="h-11 w-11 min-[400px]:h-12 min-[400px]:w-12 sm:h-14 sm:w-14" onDone={() => close.current()} />)}
        </div>

        {/* Copy */}
        <div className="px-5 pt-7">
          <CopyLink post={post} />
        </div>

        {/* QR + more apps */}
        <div className="m-5 flex items-center gap-4 rounded-2xl border border-dashed border-[#E2E8F0] p-3.5">
          <span className="flex h-[84px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-[#EEF2F6]">
            {qr ? <img src={qr} alt={`QR code that opens “${post.title}”`} width={84} height={84} className="h-full w-full" /> : <QrCode size={30} className="text-[#CBD5E1]" aria-hidden="true" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[14.5px] font-bold text-[#0F172A]">Read it on your phone</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-[#64748B]">Point your phone camera at the code to open this guide.</span>
            {nativeOk && (
              <button type="button" onClick={moreApps} className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0F172A] px-3.5 text-[12.5px] font-bold text-white">
                <MoreHorizontal size={15} aria-hidden="true" /> More apps
              </button>
            )}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Round share icon for article cards. Widens into a "Share" label on hover. */
export function ShareIconButton({ post, className = "" }: { post: BlogPost; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        aria-label={`Share “${post.title}”`}
        aria-haspopup="dialog"
        className={`group/share inline-flex h-10 items-center overflow-hidden rounded-full bg-white/95 pl-[11px] pr-[11px] text-[#0F172A] shadow-[0_8px_20px_-8px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:bg-[#F7B31C] hover:pr-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] ${className}`}
      >
        <Share2 size={17} className="shrink-0 transition-transform duration-300 group-hover/share:-rotate-12" aria-hidden="true" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] font-bold opacity-0 transition-all duration-300 group-hover/share:ml-1.5 group-hover/share:max-w-[4rem] group-hover/share:opacity-100">Share</span>
      </button>
      {open && <ShareSheet post={post} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Article header: a pill with stacked app icons that fan out on hover. */
export function ShareCluster({ post }: { post: BlogPost }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="group/cluster inline-flex h-12 items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.6)] ring-1 ring-[#E7E0CF] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-18px_rgba(15,23,42,0.55)] hover:ring-[#F7B31C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C]"
      >
        <span className="flex items-center" aria-hidden="true">
          {APPS.slice(0, 3).map((a, i) => (
            <img
              key={a.id}
              src={a.icon}
              alt=""
              width={36}
              height={36}
              className={`h-9 w-9 rounded-full ring-[3px] ring-white transition-all duration-300 ${i ? "-ml-3 group-hover/cluster:ml-1" : ""}`}
              style={{ zIndex: 3 - i }}
            />
          ))}
        </span>
        <span className="text-[14px] font-bold text-[#0F172A]">Share</span>
      </button>
      {open && <ShareSheet post={post} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Sticky vertical share row beside the article, for wide screens. */
export function ShareRail({ post }: { post: BlogPost }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (await copyText(articleUrl(post))) { setCopied(true); toast.success("Link copied"); window.setTimeout(() => setCopied(false), 2000); }
  };
  return (
    <>
      <div className="flex flex-col items-center gap-3 rounded-full bg-white/80 px-2 py-4 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.5)] ring-1 ring-[#EEE9DD] backdrop-blur">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#A8A29E] [writing-mode:vertical-rl] rotate-180">Share</span>
        {APPS.slice(0, 4).map((a) => <AppBubble key={a.id} app={a} post={post} size={38} showLabel={false} />)}
        <button type="button" onClick={onCopy} aria-label={copied ? "Link copied" : "Copy link"}
          className={`flex h-[38px] w-[38px] items-center justify-center rounded-full transition-all ${copied ? "bg-[#16A34A] text-white" : "bg-[#F1F5F9] text-[#0F172A] hover:bg-[#F7B31C]"}`}>
          {copied ? <Check size={16} strokeWidth={3} /> : <Link2 size={16} />}
        </button>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="More ways to share"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#0F172A] text-white transition hover:bg-[#1E293B]">
          <MoreHorizontal size={17} />
        </button>
      </div>
      {open && <ShareSheet post={post} onClose={() => setOpen(false)} />}
    </>
  );
}

/** End of the article: a "pass it on" block with the apps right there. */
export function ShareEnd({ post }: { post: BlogPost }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="share-heading" className="relative mt-14 overflow-hidden rounded-[2rem] bg-[#0F172A] p-6 text-white sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#F7B31C]/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-[#25D366]/15 blur-3xl" />
      <div className="relative">
        <p className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.18em] text-[#F7B31C]"><Share2 size={13} aria-hidden="true" /> Pass it on</p>
        <h2 id="share-heading" className="mt-2 font-display text-[1.6rem] font-extrabold leading-tight tracking-tight [text-wrap:balance]">Know someone still handing out paper cards?</h2>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-[#CBD5E1]">Send them this guide — it takes one tap.</p>

        {/* One row of six on phones (smaller bubbles), a relaxed row from sm up */}
        <div className="mt-6 grid grid-cols-6 items-start justify-items-center gap-1 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-4">
          {APPS.slice(0, 5).map((a) => (
            <a key={a.id} href={a.href(articleUrl(post), post)} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${a.label}`} style={{ ["--brand" as string]: a.color }}
              className="group/app flex min-w-0 flex-col items-center gap-1.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] sm:gap-2">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300 group-hover/app:-translate-y-1 motion-reduce:transition-none min-[420px]:h-12 min-[420px]:w-12 sm:h-14 sm:w-14">
                <span aria-hidden="true" className="absolute inset-0 scale-75 rounded-full bg-[var(--brand)] opacity-0 blur-lg transition-all duration-300 group-hover/app:scale-125 group-hover/app:opacity-60" />
                <img src={a.icon} alt="" width={56} height={56} className="relative h-full w-full rounded-full ring-2 ring-white/10" loading="lazy" />
              </span>
              <span aria-hidden="true" className="hidden text-[12px] font-semibold text-[#CBD5E1] group-hover/app:text-white sm:block">{a.label}</span>
            </a>
          ))}
          <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="More ways to share"
            className="group/app flex min-w-0 flex-col items-center gap-1.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#F7B31C] sm:gap-2">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition-all duration-300 group-hover/app:-translate-y-1 group-hover/app:bg-[#F7B31C] group-hover/app:text-[#0F172A] min-[420px]:h-12 min-[420px]:w-12 sm:h-14 sm:w-14">
              <MoreHorizontal size={20} aria-hidden="true" />
            </span>
            <span aria-hidden="true" className="hidden text-[12px] font-semibold text-[#CBD5E1] group-hover/app:text-white sm:block">More</span>
          </button>
        </div>

        <div className="mt-6 max-w-xl">
          <CopyLink post={post} dark />
        </div>
      </div>
      {open && <ShareSheet post={post} onClose={() => setOpen(false)} />}
    </section>
  );
}

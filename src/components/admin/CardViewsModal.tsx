import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, Loader2, AlertTriangle, Info, History, type LucideIcon } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { readableError } from "@/lib/errors";
import { AdminModal } from "@/components/admin/RowActions";
import { exactTime, timeAgo } from "@contracts/notifications";
import {
  EXTRA_VIEWS_MAX, EXTRA_VIEW_STEPS, VIEW_NOTE_MAX, addExtraViews, cleanViewNote, groupIn, readExtraViews,
} from "@contracts/card-views";

/* Admin → Customers → ⋮ → Card views. Super admin only; the server checks
   too (api/card-views-router.ts).

   Extra views are added to the view counter on the customer's public card and
   the total on their dashboard (GET /api/views). Their Analytics page and the
   admin dashboard keep counting real visits only (contracts/card-views.ts).
   The three figures follow the box while it's edited, so what the card will
   show is clear before saving. */

function Note({ tone, icon: Icon, children }: { tone: "blue" | "red"; icon: LucideIcon; children: React.ReactNode }) {
  const cls = tone === "red" ? "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]" : "border-[#BFDBFE] bg-[#EFF6FF] text-[#1E3A8A]";
  return (
    <div className={`flex gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] leading-relaxed ${cls}`}>
      <Icon size={15} className="mt-0.5 shrink-0" aria-hidden /><div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

/* One figure: a row on a phone (label and hint left, number right), a tile
   from 640 px up (label, number, hint). */
function Figure({ label, value, hint, strong, live }: { label: string; value: number; hint: string; strong?: boolean; live?: boolean }) {
  return (
    <div className={`grid grid-cols-[1fr_auto] items-center gap-x-3 rounded-xl border px-3.5 py-2.5 sm:grid-cols-1 sm:items-start sm:px-3 sm:py-3 ${strong ? "border-[#FCD34D] bg-[#FFFBEB]" : "border-[#E9EDF4] bg-[#F8FAFC]"}`}>
      <p className="col-start-1 row-start-1 text-[12px] font-semibold text-[#475569]">{label}</p>
      <p aria-live={live ? "polite" : undefined}
        className={`col-start-2 row-span-2 row-start-1 text-right text-lg font-extrabold tabular-nums leading-tight sm:col-start-1 sm:row-span-1 sm:row-start-2 sm:mt-1 sm:text-left sm:text-xl ${strong ? "text-[#92400E]" : "text-[#0F172A]"}`}>
        {groupIn(value)}
      </p>
      <p className="col-start-1 row-start-2 text-[11px] text-[#94A3B8] sm:row-start-3 sm:mt-0.5">{hint}</p>
    </div>
  );
}

/** "pacewalk: extra views 11,542 → 12,000" reads "Extra views 11,542 → 12,000" here. */
const changeText = (summary: string, slug: string) => {
  const s = summary.startsWith(`${slug}: `) ? summary.slice(slug.length + 2) : summary;
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function CardViewsModal({ slug, name, returnFocus, onClose }: {
  /** The card's address, as the customer list shows it. */
  slug: string;
  name: string;
  /** Where focus goes back on close: the row's ⋮ button. */
  returnFocus?: HTMLElement | null;
  onClose: () => void;
}) {
  const uid = useId();
  // Never from cache: reopening right after a save shows the number as it is now.
  const q = trpc.cardViews.get.useQuery({ slug }, { refetchOnWindowFocus: false, refetchOnReconnect: false, retry: false, gcTime: 0, refetchOnMount: "always" });
  const save = trpc.cardViews.set.useMutation();
  // null = untouched, i.e. what's saved.
  const [text, setText] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Set the moment Save is pressed (isPending lags a render), so nothing can
  // close the modal under a save; and whether it's still on screen when the
  // save answers, so a late answer never closes the next Card views modal.
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const data = q.data;
  const extraText = text ?? (data ? groupIn(data.extraViews) : "");
  const note = noteText ?? data?.note ?? "";
  const read = readExtraViews(extraText);
  const extra = read.ok ? read.value : data?.extraViews ?? 0;
  const changed = !!data && ((read.ok && read.value !== data.extraViews) || cleanViewNote(note) !== (data.note ?? null));

  // Focus goes back to the ⋮ button (else whatever had it) when this closes.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    return () => {
      const back = [returnFocus, before].find((el) => el?.isConnected && el !== document.body);
      back?.focus();
    };
  }, [returnFocus]);

  // Into the box once it's there, where typing is easy; not on a phone, where
  // it would throw the keyboard up over the figures.
  const ready = !!data;
  useEffect(() => {
    if (ready && window.matchMedia?.("(pointer: fine)").matches) inputRef.current?.focus();
  }, [ready]);

  const edit = (v: string) => { setText(v); setError(null); };
  const pending = save.isPending;
  // X, Esc, the backdrop and Cancel all wait for a save to finish.
  const requestClose = () => { if (!saving.current && !save.isPending) onClose(); };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !read.ok || !changed || saving.current || save.isPending) return;
    saving.current = true;
    setError(null);
    try {
      const res = await save.mutateAsync({ slug: data.slug, extraViews: read.value, note });
      const n = `${groupIn(res.shownViews)} ${res.extraViews ? "view" : "real visit"}${res.shownViews === 1 ? "" : "s"}`;
      toast.success(res.extraViews === data.extraViews ? (res.note ? "Note saved" : "Note removed")
        : res.extraViews ? `Their card now shows ${n}` : `Extra views removed. Their card shows ${n}`);
      if (mounted.current) onClose();
    } catch (err) {
      const msg = readableError(err, "Couldn't save the views. Try again.");
      if (mounted.current) setError(msg);
      else toast.error(`Card views for /${data.slug}: ${msg}`);
    } finally {
      saving.current = false;
    }
  };

  return (
    <AdminModal large onClose={requestClose} icon={<Eye size={20} className="text-[#B45309]" />} iconBg="bg-[#FEF3C7]"
      title="Card views" subtitle={`${name || "Customer"} · /${slug}`}>
      {/* Loading and a failed load take the whole modal only until there's
          something to show; a refetch after that never hides the form. */}
      {!data ? (
        q.error ? (
          <Note tone="red" icon={AlertTriangle}>{readableError(q.error, "Couldn't load this card's views.")}</Note>
        ) : (
          <p className="flex items-center gap-2 py-6 text-[13px] text-[#64748B]"><Loader2 size={15} className="animate-spin" aria-hidden /> Loading their views…</p>
        )
      ) : (
        <form onSubmit={onSave} className="space-y-4" noValidate>
          {q.error && (
            <p role="status" className="flex items-center gap-1.5 text-[11.5px] text-[#B45309]">
              <AlertTriangle size={13} className="shrink-0" aria-hidden /> Couldn't refresh these figures, so they may be a little old.
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Figure label="Real visits" value={data.realViews} hint="tracked on the card" />
            <Figure label="Extra views" value={extra} hint={extra !== data.extraViews ? `was ${groupIn(data.extraViews)}` : "added by you"} />
            <Figure label="Shown on the card" value={data.realViews + extra} hint={extra !== data.extraViews ? `was ${groupIn(data.shownViews)}` : "real + extra"} strong live />
          </div>
          {data.updatedAt && (
            <p className="-mt-2 text-[11.5px] text-[#94A3B8]" title={exactTime(data.updatedAt)}>
              {data.updatedByName ? `Last changed by ${data.updatedByName}, ${timeAgo(data.updatedAt)}` : `Last changed ${timeAgo(data.updatedAt)}`}
            </p>
          )}

          <div>
            <label htmlFor={`${uid}-extra`} className="mb-1.5 block text-xs font-semibold text-[#334155]">Extra views</label>
            <input id={`${uid}-extra`} ref={inputRef} type="text" inputMode="numeric" autoComplete="off" spellCheck={false}
              value={extraText} onChange={(e) => edit(e.target.value)}
              aria-invalid={!read.ok} aria-describedby={`${uid}-extra-help`}
              className={`h-11 w-full rounded-xl border bg-white px-3 text-base font-semibold tabular-nums text-[#0F172A] outline-none transition-colors focus:ring-2 ${read.ok ? "border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-[#F7B31C]/20" : "border-[#FCA5A5] focus:border-[#DC2626] focus:ring-[#DC2626]/15"}`} />
            <p id={`${uid}-extra-help`} role={read.ok ? undefined : "alert"} className={`mt-1 text-[11.5px] ${read.ok ? "text-[#94A3B8]" : "font-medium text-[#B91C1C]"}`}>
              {read.ok ? `A whole number, up to ${groupIn(EXTRA_VIEWS_MAX)}.` : read.error}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {EXTRA_VIEW_STEPS.map((step) => (
                <button key={step} type="button" aria-label={`Add ${groupIn(step)} views`} disabled={extra >= EXTRA_VIEWS_MAX}
                  onClick={() => edit(groupIn(addExtraViews(extra, step)))}
                  className="h-8 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] px-2.5 text-[12px] font-bold tabular-nums text-[#92400E] transition-colors hover:bg-[#FEF3C7] disabled:opacity-40">
                  +{groupIn(step)}
                </button>
              ))}
              <button type="button" onClick={() => edit("0")} disabled={read.ok && read.value === 0}
                className="h-8 rounded-lg border border-[#E2E8F0] px-2.5 text-[12px] font-semibold text-[#B91C1C] transition-colors hover:bg-[#FEF2F2] disabled:opacity-40">
                Remove extra views
              </button>
            </div>
            {data.oldSiteViews != null && (
              <p className="mt-2 text-[12.5px] text-[#64748B]">
                Their old-site card showed <b className="tabular-nums text-[#0F172A]">{groupIn(data.oldSiteViews)}</b> views —{" "}
                <button type="button" onClick={() => edit(groupIn(data.oldSiteViews ?? 0))}
                  className="font-semibold text-[#B45309] underline decoration-[#F7B31C]/60 underline-offset-2 hover:text-[#92400E]">Use this</button>
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor={`${uid}-note`} className="text-xs font-semibold text-[#334155]">Private note <span className="font-normal text-[#94A3B8]">(optional)</span></label>
              <span id={`${uid}-note-help`} className="text-[11px] text-[#94A3B8]">Only you see this</span>
            </div>
            <input id={`${uid}-note`} value={note} onChange={(e) => { setNoteText(e.target.value); setError(null); }} maxLength={VIEW_NOTE_MAX}
              placeholder="e.g. Views from their old card" aria-describedby={`${uid}-note-help`}
              className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-[13px] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20" />
          </div>

          <Note tone="blue" icon={Info}>
            Extra views are added to the view counter on their public card and the total on their dashboard. Their detailed analytics and your admin dashboard keep counting real visits only.
          </Note>

          {data.recent.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#334155]"><History size={13} aria-hidden /> Recent changes</p>
              <ul className="mt-1.5 space-y-1 text-[12px] text-[#64748B]">
                {data.recent.map((r, i) => (
                  <li key={i} className="break-words">
                    <span title={exactTime(r.at)}>{timeAgo(r.at)}</span> · {r.by}{r.summary ? <> · <span className="tabular-nums text-[#334155]">{changeText(r.summary, data.slug)}</span></> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <Note tone="red" icon={AlertTriangle}><span role="alert">{error}</span></Note>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={requestClose} disabled={pending}
              className="h-11 flex-1 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50 disabled:hover:bg-transparent">Cancel</button>
            <button type="submit" disabled={!read.ok || !changed || pending}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl gradient-gold text-sm font-bold text-[#0F172A] hover:shadow-gold disabled:opacity-50 disabled:hover:shadow-none">
              {pending && <Loader2 size={15} className="animate-spin" aria-hidden />}
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </AdminModal>
  );
}

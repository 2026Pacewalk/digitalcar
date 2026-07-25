import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Search, Plus, Eye, Lock, LogIn, Database, ChevronLeft, ChevronRight,
  X, ExternalLink, Users, UserCheck, Clock, Building2, KeyRound, Globe,
  CalendarPlus, Trash2, AlertTriangle, Mail, Phone,
} from "lucide-react";
import { toast } from "sonner";
import { imgUrl, decodeSpecialities, loadCustomerContent } from "@/lib/cardContent";
import { buildCardHtml } from "@/card-template/buildCard";
import { fetchAdminData } from "@/lib/adminData";
import { trpc } from "@/providers/trpc";
import { scopedKey } from "@/hooks/useCustomer";

/* Retailer (admin_id) → name, from superadmin table */
const RETAILERS: Record<number, string> = {
  0: "Website", 1: "DigitalCarda", 2: "Sunny", 3: "Raman Kumar", 10: "Onkar Singh",
  11: "Vijay", 12: "Kiran", 13: "Ankush", 14: "Mohit Bhatia", 15: "Vishu",
  16: "Shekhar Jain", 17: "Davinder Singh", 18: "Nikil", 19: "Roxana Greener",
  20: "Kristopher", 21: "Gurwinder Singh", 22: "Jasvinder Singh", 23: "David Carlson",
};
const retailerName = (id: number) => RETAILERS[id] ?? (id === 0 ? "Website" : `Retailer #${id}`);

const PACKAGES: Record<number, string> = { 5: "Starter", 6: "Standard", 7: "Trial" };
const PACKAGE_OPTIONS = ["Trial", "Starter", "Standard", "Premium"];
const packageName = (id: number) => PACKAGES[id] || "Trial";

type Customer = {
  id: number; name: string; username: string; email: string; mobile1: string;
  slug: string; package_id: number; admin_id: number;
  activated_on: string | null; expired_on: string | null; status: number;
  password: string; company_name?: string; designation?: string; views?: number;
};

const fmtDate = (s: string | null) => {
  if (!s || s === "0000-00-00") return "—";
  const d = new Date(String(s).replace(" ", "T"));
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString("en-GB").replace(/\//g, "-"); // DD-MM-YYYY
};
const isExpired = (s: string | null) => {
  if (!s || s === "0000-00-00") return false;
  const d = new Date(String(s).replace(" ", "T"));
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
};

/* ─── Presentation helpers ─── */
const initials = (name: string) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

const AVATARS = [
  "from-[#F59E0B] to-[#D97706]", "from-[#3B82F6] to-[#2563EB]", "from-[#10B981] to-[#059669]",
  "from-[#8B5CF6] to-[#7C3AED]", "from-[#EC4899] to-[#DB2777]", "from-[#14B8A6] to-[#0D9488]",
  "from-[#F43F5E] to-[#E11D48]", "from-[#0EA5E9] to-[#0284C7]",
];
const avatarGrad = (seed: string) =>
  AVATARS[[...(seed || "?")].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATARS.length];

const PKG_STYLE: Record<string, string> = {
  Trial: "bg-[#FEF3C7] text-[#92400E]",
  Starter: "bg-[#DBEAFE] text-[#1E40AF]",
  Standard: "bg-[#EDE9FE] text-[#6D28D9]",
  Premium: "bg-[#FCE7F3] text-[#9D174D]",
};

const rowStatus = (c: { status: number; expired_on: string | null }) => {
  if (isExpired(c.expired_on)) return { label: "Expired", cls: "bg-[#FEE2E2] text-[#991B1B]", dot: "bg-[#EF4444]" };
  if (c.status === 1) return { label: "Active", cls: "bg-[#DCFCE7] text-[#166534]", dot: "bg-[#22C55E]" };
  return { label: "Inactive", cls: "bg-[#F1F5F9] text-[#475569]", dot: "bg-[#94A3B8]" };
};

/* Compact page numbers with ellipsis */
function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const from = Math.max(2, current - 1), to = Math.min(total - 1, current + 1);
  if (from > 2) out.push("…");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < total - 1) out.push("…");
  out.push(total);
  return out;
}

export default function AdminCustomers() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [retailer, setRetailer] = useState<number | "all">("all");
  const [pkg, setPkg] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // modals
  const [cardModal, setCardModal] = useState<Customer | null>(null);
  const [cardHtml, setCardHtml] = useState<string | null>(null);
  const [pwdModal, setPwdModal] = useState<Customer | null>(null);
  const [pkgModal, setPkgModal] = useState<Customer | null>(null);
  const [expModal, setExpModal] = useState<Customer | null>(null);
  const [delModal, setDelModal] = useState<Customer | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pwdValue, setPwdValue] = useState("");
  const [pkgValue, setPkgValue] = useState("Trial");
  const [expDays, setExpDays] = useState(30);
  const [addForm, setAddForm] = useState({ name: "", username: "", email: "", mobile1: "", slug: "", pkg: "Trial", admin_id: 0 });

  useEffect(() => {
    fetchAdminData<Customer[]>("customers")
      // Newest members first (id DESC) — matches the old site's members-list.php order
      .then((d) => setRows([...d].sort((a, b) => Number(b.id) - Number(a.id))))
      .catch(() => toast.error("Could not load customers"))
      .finally(() => setLoading(false));
  }, []);

  // Build the real card preview from customers.json (the public /c/:slug route
  // reads the DB, which has no content for these imported cards).
  useEffect(() => {
    if (!cardModal) { setCardHtml(null); return; }
    let cancelled = false;
    setCardHtml(null);
    const c = cardModal;
    const rec = { ...c, specialities: decodeSpecialities((c as Record<string, unknown>).specialities), logo: imgUrl("home", (c as Record<string, unknown>).logo) } as unknown as Parameters<typeof buildCardHtml>[0];
    (async () => {
      let content;
      try { content = await loadCustomerContent(String(c.slug)); } catch { content = null; }
      if (cancelled) return;
      setCardHtml(buildCardHtml(rec, content?.products ?? [], content?.gallery ?? [], content?.videos ?? [], content?.offers ?? [], content?.qrcodes ?? [], []));
    })();
    return () => { cancelled = true; };
  }, [cardModal]);

  const retailerOptions = useMemo(() => {
    const ids = [...new Set(rows.map((r) => r.admin_id))].sort((a, b) => a - b);
    return ids;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((c) => {
      if (retailer !== "all" && c.admin_id !== retailer) return false;
      if (pkg !== "all" && packageName(c.package_id) !== pkg) return false;
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) || c.mobile1?.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q)
      );
    });
  }, [rows, search, retailer, pkg]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => { setPage(1); }, [search, retailer, pkg, pageSize]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.status === 1 && !isExpired(r.expired_on)).length,
    expired: rows.filter((r) => isExpired(r.expired_on)).length,
    retailers: new Set(rows.map((r) => r.admin_id).filter((id) => id !== 0 && id !== 1)).size,
  }), [rows]);

  const impersonate = trpc.auth.impersonate.useMutation();
  const extendMut = trpc.user.extendValidity.useMutation();
  const deactivateMut = trpc.user.deactivateCustomer.useMutation();
  const loginAsClient = async (c: Customer) => {
    const rec = { ...c, specialities: decodeSpecialities((c as Record<string, unknown>).specialities), logo: imgUrl("home", (c as Record<string, unknown>).logo) };
    // Mint a REAL token for the customer (if they have a DB account) so authed
    // features — Refer & Earn, analytics, leads — work during the preview.
    // Falls back to a preview-only token if there's no matching account.
    let authUser: { id: number; email: string; fullName: string; role: string } = { id: c.id, email: c.email, fullName: c.name, role: "customer" };
    let token = "impersonate_" + c.id;
    try {
      const res = await impersonate.mutateAsync({ email: c.email, slug: c.slug });
      authUser = res.user;
      token = res.token;
    } catch { /* no DB account — preview-only */ }
    // Set the impersonated identity first so scopedKey() targets the client's namespace.
    localStorage.setItem("digitalcarda_user", JSON.stringify(authUser));
    localStorage.setItem("auth_token", token);
    localStorage.setItem(scopedKey("dc_customer"), JSON.stringify(rec));
    try {
      const content = await loadCustomerContent(String(c.slug));
      localStorage.setItem(scopedKey("dc_products"), JSON.stringify(content.products));
      localStorage.setItem(scopedKey("dc_gallery"), JSON.stringify(content.gallery));
      localStorage.setItem(scopedKey("dc_videos"), JSON.stringify(content.videos));
      localStorage.setItem(scopedKey("dc_offers"), JSON.stringify(content.offers));
      localStorage.setItem(scopedKey("dc_qrcode"), JSON.stringify(content.qrcodes));
      localStorage.setItem(scopedKey("dc_uploads"), JSON.stringify(content.uploads));
    } catch { /* content optional */ }
    toast.success(`Logged in as ${c.name}`);
    navigate("/dashboard");
  };
  const savePassword = () => {
    if (!pwdModal) return;
    if (pwdValue.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setRows((r) => r.map((c) => (c.id === pwdModal.id ? { ...c, password: pwdValue } : c)));
    toast.success(`Password updated for ${pwdModal.name}`);
    setPwdModal(null);
  };
  const savePackage = () => {
    if (!pkgModal) return;
    const id = Number(Object.entries(PACKAGES).find(([, n]) => n === pkgValue)?.[0]) || 7;
    setRows((r) => r.map((c) => (c.id === pkgModal.id ? { ...c, package_id: id } : c)));
    toast.success(`Package changed to ${pkgValue} for ${pkgModal.name}`);
    setPkgModal(null);
  };
  const saveExtend = async () => {
    if (!expModal) return;
    const days = Math.max(1, Math.min(3650, Number(expDays) || 0));
    const c = expModal;
    const base = (() => {
      const d = new Date(String(c.expired_on || "").replace(" ", "T"));
      return !isNaN(d.getTime()) && d.getTime() > Date.now() ? d : new Date();
    })();
    const newExp = new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10);
    setRows((r) => r.map((x) => (x.id === c.id ? { ...x, expired_on: newExp, status: 1 } : x)));
    setExpModal(null);
    try {
      const res = await extendMut.mutateAsync({ email: c.email, days });
      if (res.ok) toast.success(`Added ${days} days — ${c.name}'s card is valid till ${fmtDate(res.expiredOn ?? newExp)}`);
      else toast.warning(`View updated, but no live account matched ${c.email} to save it server-side.`);
    } catch { toast.error("Extended in the view, but the server save failed."); }
  };
  const deleteCustomer = async () => {
    if (!delModal) return;
    const c = delModal;
    setRows((r) => r.filter((x) => x.id !== c.id));
    setDelModal(null);
    try {
      const res = await deactivateMut.mutateAsync({ email: c.email });
      if (res.ok) toast.success(`${c.name} deactivated — their card is now paused`);
      else toast.warning(`Removed from the list; no live account matched ${c.email} to deactivate.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not deactivate on the server"); }
  };
  const addCustomer = () => {
    if (!addForm.name || !addForm.email) { toast.error("Name and email are required"); return; }
    const id = Math.max(0, ...rows.map((r) => r.id)) + 1;
    const pid = Number(Object.entries(PACKAGES).find(([, n]) => n === addForm.pkg)?.[0]) || 7;
    const now = new Date();
    const exp = new Date(now); exp.setDate(exp.getDate() + 7);
    setRows((r) => [{
      id, name: addForm.name, username: addForm.username || addForm.email.split("@")[0], email: addForm.email,
      mobile1: addForm.mobile1, slug: addForm.slug || addForm.name.toLowerCase().replace(/\s+/g, "-"),
      package_id: pid, admin_id: Number(addForm.admin_id), activated_on: now.toISOString().slice(0, 10),
      expired_on: exp.toISOString().slice(0, 10), status: 1, password: "123456",
    }, ...r]);
    toast.success("Customer added");
    setAddOpen(false);
    setAddForm({ name: "", username: "", email: "", mobile1: "", slug: "", pkg: "Trial", admin_id: 0 });
  };

  const rowActions = (c: Customer) => (
    <>
      <button onClick={() => loginAsClient(c)} title="Login as Client" className="w-9 h-9 rounded-lg bg-[#0F172A] text-white flex items-center justify-center hover:bg-[#1E293B] transition-colors active:scale-95"><LogIn size={15} /></button>
      <button onClick={() => setCardModal(c)} title="View Card" className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center hover:bg-[#FDE68A] transition-colors active:scale-95"><Eye size={15} /></button>
      <button onClick={() => { setExpModal(c); setExpDays(30); }} title="Extend Validity" className="w-9 h-9 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center hover:bg-[#BBF7D0] transition-colors active:scale-95"><CalendarPlus size={15} /></button>
      <button onClick={() => { setPwdModal(c); setPwdValue(c.password || ""); }} title="Change Password" className="w-9 h-9 rounded-lg bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center hover:bg-[#FECACA] transition-colors active:scale-95"><Lock size={15} /></button>
      <button onClick={() => { setPkgModal(c); setPkgValue(packageName(c.package_id)); }} title="Change Package" className="w-9 h-9 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center hover:bg-[#BFDBFE] transition-colors active:scale-95"><Database size={15} /></button>
      <button onClick={() => setDelModal(c)} title="Delete Customer" className="w-9 h-9 rounded-lg bg-[#F1F5F9] text-[#64748B] flex items-center justify-center hover:bg-[#FEE2E2] hover:text-[#DC2626] transition-colors active:scale-95"><Trash2 size={15} /></button>
    </>
  );

  const statCards = [
    { label: "Total Customers", value: stats.total, icon: Users, tint: "#F7B31C", bg: "#FEF3C7" },
    { label: "Active", value: stats.active, icon: UserCheck, tint: "#22C55E", bg: "#DCFCE7" },
    { label: "Expired", value: stats.expired, icon: Clock, tint: "#EF4444", bg: "#FEE2E2" },
    { label: "Retailers", value: stats.retailers, icon: Building2, tint: "#8B5CF6", bg: "#EDE9FE" },
  ];

  return (
    <ResponsiveDashboardLayout title="Customer List" subtitle="Manage all customer cards & subscriptions">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="relative bg-white rounded-2xl p-4 pl-5 shadow-premium border border-[#F1F5F9] overflow-hidden flex items-center gap-3.5 hover:shadow-premium-lg transition-shadow">
              <span className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r" style={{ background: s.tint }} />
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: s.bg }}><s.icon size={20} style={{ color: s.tint }} /></div>
              <div>
                <p className="text-2xl font-extrabold text-[#0F172A] tabular-nums leading-none">{loading ? "—" : s.value.toLocaleString("en-IN")}</p>
                <p className="text-xs text-[#64748B] mt-1.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              Show
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-10 bg-white rounded-lg px-2 border border-[#E2E8F0] outline-none focus:border-[#F7B31C]">
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              entries
            </div>
            <select value={retailer} onChange={(e) => setRetailer(e.target.value === "all" ? "all" : Number(e.target.value))} className="h-10 bg-white rounded-lg px-3 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C]">
              <option value="all">All Retailers</option>
              {retailerOptions.map((id) => <option key={id} value={id}>{retailerName(id)}</option>)}
            </select>
            <select value={pkg} onChange={(e) => setPkg(e.target.value)} className="h-10 bg-white rounded-lg px-3 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C]">
              <option value="all">All Packages</option>
              {PACKAGE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 bg-white rounded-lg pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 transition-all placeholder:text-[#94A3B8]" />
            </div>
            <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 h-10 px-4 gradient-gold text-[#0F172A] rounded-lg text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98] shrink-0"><Plus size={16} /> Add New</button>
          </div>
        </div>

        {/* ─── Mobile: card list ─── */}
        <div className="md:hidden space-y-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl shadow-premium border border-[#F1F5F9] animate-pulse" />)
          ) : pageRows.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3"><Users size={22} className="text-[#94A3B8]" /></div>
              <p className="text-sm font-medium text-[#0F172A]">No customers found</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">Try a different search or filter.</p>
            </div>
          ) : (
            pageRows.map((c) => {
              const expired = isExpired(c.expired_on);
              const st = rowStatus(c);
              return (
                <div key={c.id} className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGrad(c.name || c.email)} flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white`}>
                      <span className="text-white text-sm font-bold">{initials(c.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[#0F172A] truncate">{c.name || "—"}</p>
                      <p className="text-[11px] text-[#94A3B8] truncate">@{c.username || "user"} · #{c.id}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${PKG_STYLE[packageName(c.package_id)] || PKG_STYLE.Trial}`}>{packageName(c.package_id)}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#F1F5F9] space-y-2 text-[12px]">
                    <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-[#475569] min-w-0"><Mail size={13} className="text-[#94A3B8] shrink-0" /><span className="truncate">{c.email || "—"}</span></a>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-[#475569]"><Phone size={13} className="text-[#94A3B8]" />{c.mobile1 || "—"}</span>
                      <button onClick={() => setRetailer(c.admin_id)} className="text-[10px] font-semibold text-[#0F766E] bg-[#CCFBF1] px-2 py-0.5 rounded-full">{retailerName(c.admin_id)}</button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <a href={`/${c.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#3B82F6] min-w-0"><Globe size={13} className="shrink-0" /><span className="truncate">/{c.slug}</span></a>
                      <span className={`text-[11px] font-medium ${expired ? "text-[#EF4444]" : "text-[#64748B]"} whitespace-nowrap`}>till {fmtDate(c.expired_on)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F1F5F9]">{rowActions(c)}</div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── Desktop: table ─── */}
        <div className="hidden md:block bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#F1F5F9]">
                  {["Customer", "Contact", "Card URL", "Retailer", "Plan", "Validity", ""].map((h, hi) => (
                    <th key={hi} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-4 py-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-3.5"><div className="h-9 bg-[#F1F5F9] rounded-lg animate-pulse" /></td></tr>)
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3"><Users size={22} className="text-[#94A3B8]" /></div>
                    <p className="text-sm font-medium text-[#0F172A]">No customers found</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Try a different search or filter.</p>
                  </td></tr>
                ) : (
                  pageRows.map((c) => {
                    const expired = isExpired(c.expired_on);
                    const st = rowStatus(c);
                    return (
                      <tr key={c.id} className="hover:bg-[#FAFBFC] transition-colors">
                        {/* Customer */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad(c.name || c.email)} flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white`}>
                              <span className="text-white text-[11px] font-bold">{initials(c.name)}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-[#0F172A] truncate max-w-[170px]">{c.name || "—"}</p>
                              <p className="text-[11px] text-[#94A3B8] truncate">@{c.username || "user"} · #{c.id}</p>
                            </div>
                          </div>
                        </td>
                        {/* Contact */}
                        <td className="px-4 py-3">
                          <a href={`mailto:${c.email}`} className="block text-[12px] text-[#475569] hover:text-[#F7B31C] truncate max-w-[190px] transition-colors">{c.email || "—"}</a>
                          <p className="text-[11px] text-[#94A3B8] mt-0.5">{c.mobile1 || "—"}</p>
                        </td>
                        {/* Card URL */}
                        <td className="px-4 py-3">
                          <a href={`/${c.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-[#3B82F6] hover:underline max-w-[150px]">
                            <Globe size={12} className="shrink-0" /> <span className="truncate">/{c.slug}</span>
                          </a>
                        </td>
                        {/* Retailer */}
                        <td className="px-4 py-3">
                          <button onClick={() => setRetailer(c.admin_id)} className="text-[11px] font-semibold text-[#0F766E] bg-[#CCFBF1] px-2.5 py-1 rounded-full hover:bg-[#99F6E4] transition-colors whitespace-nowrap">{retailerName(c.admin_id)}</button>
                        </td>
                        {/* Plan + status */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${PKG_STYLE[packageName(c.package_id)] || PKG_STYLE.Trial}`}>{packageName(c.package_id)}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span>
                          </div>
                        </td>
                        {/* Validity */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-[11px] text-[#94A3B8]">from {fmtDate(c.activated_on)}</p>
                          <p className={`text-[12px] font-medium ${expired ? "text-[#EF4444]" : "text-[#334155]"}`}>till {fmtDate(c.expired_on)}</p>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">{rowActions(c)}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination (shared) */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-[#F1F5F9] bg-white shadow-premium">
              <p className="text-xs text-[#64748B]">
                Showing <span className="font-semibold text-[#0F172A]">{(safePage - 1) * pageSize + 1}</span> to <span className="font-semibold text-[#0F172A]">{Math.min(safePage * pageSize, filtered.length)}</span> of <span className="font-semibold text-[#0F172A]">{filtered.length.toLocaleString("en-IN")}</span> entries
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs text-[#64748B] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"><ChevronLeft size={13} /> Prev</button>
                {pageNumbers(safePage, totalPages).map((n, idx) => n === "…"
                  ? <span key={`e${idx}`} className="px-1.5 text-xs text-[#94A3B8]">…</span>
                  : <button key={n} onClick={() => setPage(n)} className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${n === safePage ? "gradient-gold text-[#0F172A]" : "border border-[#E2E8F0] text-[#64748B] hover:bg-white"}`}>{n}</button>
                )}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] text-xs text-[#64748B] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1">Next <ChevronRight size={13} /></button>
              </div>
            </div>
          )}
      </div>

      {/* View Card modal (iframe) */}
      {cardModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm animate-fade-in" onClick={() => setCardModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm h-[80vh] flex flex-col animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between px-4 h-14 border-b border-[#F1F5F9] shrink-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0F172A] truncate">{cardModal.name}</p>
                <p className="text-[11px] text-[#94A3B8] truncate">/{cardModal.slug}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => { if (cardHtml) window.open(URL.createObjectURL(new Blob([cardHtml], { type: "text/html" })), "_blank"); }} disabled={!cardHtml} className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] flex items-center justify-center transition-colors disabled:opacity-40" title="Open in new tab"><ExternalLink size={15} /></button>
                <button onClick={() => setCardModal(null)} className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] flex items-center justify-center transition-colors"><X size={16} /></button>
              </div>
            </div>
            {cardHtml
              ? <iframe srcDoc={cardHtml} title="Card preview" className="flex-1 w-full bg-white border-0" />
              : <div className="flex-1 flex items-center justify-center text-sm text-[#94A3B8]">Loading card…</div>}
          </div>
        </div>
      )}

      {/* Change Password modal */}
      {pwdModal && <Modal onClose={() => setPwdModal(null)} icon={<KeyRound size={20} className="text-red-500" />} iconBg="bg-red-50" title="Change Password" subtitle={pwdModal.name}>
        <label className="block text-xs font-semibold text-[#334155] mb-1.5">New Password</label>
        <input value={pwdValue} onChange={(e) => setPwdValue(e.target.value)} className="h-11 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" placeholder="Min 6 characters" />
        <div className="flex gap-3 mt-6">
          <button onClick={() => setPwdModal(null)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
          <button onClick={savePassword} className="flex-1 h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold hover:shadow-gold">Update</button>
        </div>
      </Modal>}

      {/* Change Package modal */}
      {pkgModal && <Modal onClose={() => setPkgModal(null)} icon={<Database size={20} className="text-[#3B82F6]" />} iconBg="bg-[#DBEAFE]" title="Change Package" subtitle={pkgModal.name}>
        <label className="block text-xs font-semibold text-[#334155] mb-1.5">Package</label>
        <select value={pkgValue} onChange={(e) => setPkgValue(e.target.value)} className="h-11 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C]">
          {PACKAGE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setPkgModal(null)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
          <button onClick={savePackage} className="flex-1 h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold hover:shadow-gold">Save</button>
        </div>
      </Modal>}

      {/* Extend Validity modal */}
      {expModal && <Modal onClose={() => setExpModal(null)} icon={<CalendarPlus size={20} className="text-[#15803D]" />} iconBg="bg-[#DCFCE7]" title="Extend Validity" subtitle={`${expModal.name} · till ${fmtDate(expModal.expired_on)}`}>
        <label className="block text-xs font-semibold text-[#334155] mb-1.5">Extra days to add</label>
        <div className="flex gap-2 mb-3">
          {[30, 90, 180, 365].map((d) => (
            <button key={d} onClick={() => setExpDays(d)} className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition-colors ${expDays === d ? "bg-[#DCFCE7] border-[#22C55E] text-[#15803D]" : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>{d}d</button>
          ))}
        </div>
        <input type="number" min={1} max={3650} value={expDays} onChange={(e) => setExpDays(Number(e.target.value))} className="h-11 w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/15 focus:bg-white transition-all" />
        <p className="text-[11px] text-[#94A3B8] mt-2">Adds days on top of the current validity so the customer keeps using their card.</p>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setExpModal(null)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
          <button onClick={saveExtend} className="flex-1 h-11 rounded-xl bg-[#16A34A] text-white text-sm font-bold hover:bg-[#15803D] transition-colors">Add {Math.max(1, Number(expDays) || 0)} days</button>
        </div>
      </Modal>}

      {/* Delete confirm modal */}
      {delModal && <Modal onClose={() => setDelModal(null)} icon={<AlertTriangle size={20} className="text-[#DC2626]" />} iconBg="bg-[#FEE2E2]" title="Delete customer?" subtitle={delModal.name}>
        <p className="text-[13px] text-[#475569] leading-relaxed">This removes <b className="text-[#0F172A]">{delModal.name}</b> from your list and <b className="text-[#0F172A]">deactivates their account</b> — their public card will be paused. It stays in the database, so it can be restored if needed.</p>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setDelModal(null)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
          <button onClick={deleteCustomer} className="flex-1 h-11 rounded-xl bg-[#DC2626] text-white text-sm font-bold hover:bg-[#B91C1C] transition-colors">Delete</button>
        </div>
      </Modal>}

      {/* Add New modal */}
      {addOpen && <Modal onClose={() => setAddOpen(false)} icon={<Plus size={20} className="text-[#F7B31C]" />} iconBg="bg-[#FEF3C7]" title="Add New Customer" subtitle="Create a new card account" wide>
        <div className="grid grid-cols-2 gap-3">
          {([["Name", "name"], ["Username", "username"], ["Email", "email"], ["Contact", "mobile1"], ["URL slug", "slug"]] as const).map(([label, key]) => (
            <div key={key} className={key === "slug" ? "col-span-2" : ""}>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">{label}</label>
              <input value={(addForm as Record<string, string | number>)[key] as string} onChange={(e) => setAddForm((f) => ({ ...f, [key]: e.target.value }))} className="h-10 w-full rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/15 focus:bg-white transition-all" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1.5">Package</label>
            <select value={addForm.pkg} onChange={(e) => setAddForm((f) => ({ ...f, pkg: e.target.value }))} className="h-10 w-full rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C]">{PACKAGE_OPTIONS.map((p) => <option key={p}>{p}</option>)}</select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1.5">Retailer</label>
            <select value={addForm.admin_id} onChange={(e) => setAddForm((f) => ({ ...f, admin_id: Number(e.target.value) }))} className="h-10 w-full rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#F7B31C]">
              {Object.entries(RETAILERS).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setAddOpen(false)} className="flex-1 h-11 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]">Cancel</button>
          <button onClick={addCustomer} className="flex-1 h-11 rounded-xl gradient-gold text-[#0F172A] text-sm font-bold hover:shadow-gold">Add Customer</button>
        </div>
      </Modal>}
    </ResponsiveDashboardLayout>
  );
}

/* Reusable centered modal */
function Modal({ children, onClose, icon, iconBg, title, subtitle, wide }: {
  children: React.ReactNode; onClose: () => void; icon: React.ReactNode; iconBg: string; title: string; subtitle?: string; wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-md" : "max-w-sm"} p-6 animate-scale-in`}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] flex items-center justify-center transition-colors"><X size={16} /></button>
        <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center mb-4`}>{icon}</div>
        <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
        {subtitle && <p className="text-sm text-[#64748B] mt-0.5 mb-4">{subtitle}</p>}
        <div className={subtitle ? "" : "mt-4"}>{children}</div>
      </div>
    </div>
  );
}

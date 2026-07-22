import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Search, Plus, Eye, Lock, LogIn, Database, ChevronLeft, ChevronRight,
  X, ExternalLink, Users, UserCheck, Clock, Building2, KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { imgUrl, decodeSpecialities, loadCustomerContent } from "@/lib/cardContent";
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
  const [pwdModal, setPwdModal] = useState<Customer | null>(null);
  const [pkgModal, setPkgModal] = useState<Customer | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pwdValue, setPwdValue] = useState("");
  const [pkgValue, setPkgValue] = useState("Trial");
  const [addForm, setAddForm] = useState({ name: "", username: "", email: "", mobile1: "", slug: "", pkg: "Trial", admin_id: 0 });

  useEffect(() => {
    fetch("/customers.json")
      .then((r) => r.json())
      .then((d: Customer[]) => setRows(d))
      .catch(() => toast.error("Could not load customers"))
      .finally(() => setLoading(false));
  }, []);

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

  const loginAsClient = async (c: Customer) => {
    const rec = { ...c, specialities: decodeSpecialities((c as Record<string, unknown>).specialities), logo: imgUrl("home", (c as Record<string, unknown>).logo) };
    // Set the impersonated identity first so scopedKey() targets the client's namespace.
    localStorage.setItem("digitalcarda_user", JSON.stringify({ id: c.id, email: c.email, fullName: c.name, role: "customer" }));
    localStorage.setItem("auth_token", "impersonate_" + c.id);
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
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9] flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}><s.icon size={20} style={{ color: s.tint }} /></div>
              <div><p className="text-xl font-extrabold text-[#0F172A] tabular-nums">{loading ? "—" : s.value.toLocaleString("en-IN")}</p><p className="text-xs text-[#64748B]">{s.label}</p></div>
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

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {["SN", "Retailer", "Name", "Username", "Email", "Contact", "URL", "Package", "Start On", "Expired On", "Action"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider px-3 py-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={11} className="px-3 py-3"><div className="h-9 bg-[#F1F5F9] rounded-lg animate-pulse" /></td></tr>)
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={11} className="px-3 py-14 text-center text-sm text-[#94A3B8]">No customers found</td></tr>
                ) : (
                  pageRows.map((c, i) => {
                    const expired = isExpired(c.expired_on);
                    return (
                      <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-3 py-3 text-xs text-[#94A3B8]">{(safePage - 1) * pageSize + i + 1}</td>
                        <td className="px-3 py-3">
                          <button onClick={() => setRetailer(c.admin_id)} className="text-xs font-semibold text-[#14B8A6] hover:underline uppercase">{retailerName(c.admin_id)}</button>
                        </td>
                        <td className="px-3 py-3 font-medium text-[#0F172A] whitespace-nowrap">{c.name || "—"}</td>
                        <td className="px-3 py-3 text-[#64748B] whitespace-nowrap">{c.username}</td>
                        <td className="px-3 py-3 text-xs text-[#64748B]"><a href={`mailto:${c.email}`} className="hover:text-[#F7B31C]">{c.email || "—"}</a></td>
                        <td className="px-3 py-3 text-xs text-[#64748B] whitespace-nowrap">{c.mobile1 || "—"}</td>
                        <td className="px-3 py-3 text-xs"><span className="text-[#3B82F6]">{c.slug}</span></td>
                        <td className="px-3 py-3"><span className="inline-flex px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[11px] font-semibold">{packageName(c.package_id)}</span></td>
                        <td className="px-3 py-3 text-xs text-[#64748B] whitespace-nowrap">{fmtDate(c.activated_on)}</td>
                        <td className="px-3 py-3 text-xs whitespace-nowrap"><span className={expired ? "text-red-500 font-semibold" : "text-[#64748B]"}>{fmtDate(c.expired_on)}</span></td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => loginAsClient(c)} title="Login as Client" className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center hover:bg-[#1E293B] transition-colors"><LogIn size={14} /></button>
                            <button onClick={() => setCardModal(c)} title="View Card" className="w-8 h-8 rounded-lg bg-[#F7B31C] text-[#0F172A] flex items-center justify-center hover:bg-[#D97706] hover:text-white transition-colors"><Eye size={14} /></button>
                            <button onClick={() => { setPwdModal(c); setPwdValue(c.password || ""); }} title="Change Password" className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"><Lock size={14} /></button>
                            <button onClick={() => { setPkgModal(c); setPkgValue(packageName(c.package_id)); }} title="Change Package" className="w-8 h-8 rounded-lg bg-[#3B82F6] text-white flex items-center justify-center hover:bg-[#2563EB] transition-colors"><Database size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#F1F5F9] bg-[#F8FAFC]">
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
                <a href={`https://digitalcarda.in/${cardModal.slug}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] flex items-center justify-center transition-colors" title="Open in new tab"><ExternalLink size={15} /></a>
                <button onClick={() => setCardModal(null)} className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] flex items-center justify-center transition-colors"><X size={16} /></button>
              </div>
            </div>
            <iframe src={`https://digitalcarda.in/${cardModal.slug}`} title="Card preview" className="flex-1 w-full bg-[#F8FAFC]" />
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

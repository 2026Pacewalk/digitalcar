import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Upload, Download, Database, Users, CheckCircle2, AlertCircle,
  FileSpreadsheet, Trash2, RefreshCw, Search, ChevronLeft, ChevronRight,
  FileUp, Shield, Globe, Link2, Eye, X, Loader2, Save,
} from "lucide-react";

interface Member {
  sn: number; name: string; username: string; email: string; phone: string;
  slug: string; package: string; startDate: string; expiryDate: string;
  migrated: boolean; status: string; source: string;
}

interface MigrationLog {
  id: number; message: string; type: "success" | "error" | "warning" | "info"; timestamp: string;
}

const pkgColors: Record<string, string> = {
  Trial: "bg-[#DBEAFE] text-[#1E40AF]",
  STANDARD: "bg-[#FCE7F3] text-[#9D174D]",
  STARTER: "bg-[#CCFBF1] text-[#0F766E]",
};

const statusColors: Record<string, string> = {
  active: "badge-green", expired: "badge-gray bg-gray-100 text-gray-500",
  pending: "badge-gold", migrated: "bg-emerald-50 text-emerald-600",
};

export default function AdminMigration() {
  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pkgFilter, setPkgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const limit = 10;

  const addLog = (message: string, type: MigrationLog["type"]) => {
    setLogs((prev) => [{ id: Date.now(), message, type, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 100));
  };

  // Load pre-scraped members
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/members_migration.json");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const migratedIds: number[] = JSON.parse(localStorage.getItem("migrated_members") || "[]");
      const enriched: Member[] = data.map((m: any) => ({
        sn: m.sn, name: m.name, username: m.username, email: m.email,
        phone: m.phone || m.contact || "", slug: m.slug || m.url || "",
        package: m.package || "Trial", startDate: m.startDate || m.start || "",
        expiryDate: m.expiryDate || m.expiry || "", source: "scraped",
        status: migratedIds.includes(m.sn) ? "migrated" : "active",
        migrated: migratedIds.includes(m.sn),
      }));
      setMembers(enriched);
      addLog(`Loaded ${enriched.length} pre-scraped members`, "success");
    } catch {
      toast.error("Failed to load pre-scraped data");
      addLog("Failed to load pre-scraped members", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // CSV Import
  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
    const slugIdx = headers.findIndex((h) => h.includes("slug") || h.includes("url") || h.includes("card"));
    const nameIdx = headers.findIndex((h) => h.includes("name"));
    const emailIdx = headers.findIndex((h) => h.includes("email"));
    const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("contact") || h.includes("mobile"));
    const pkgIdx = headers.findIndex((h) => h.includes("package"));
    const startIdx = headers.findIndex((h) => h.includes("start"));
    const expiryIdx = headers.findIndex((h) => h.includes("expir") || h.includes("end"));
    const userIdx = headers.findIndex((h) => h.includes("user"));

    return lines.slice(1).map((line, i) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      return {
        sn: 1000 + i, name: vals[nameIdx] || "", username: vals[userIdx] || "",
        email: vals[emailIdx] || "", phone: vals[phoneIdx] || "",
        slug: vals[slugIdx] || "", package: vals[pkgIdx] || "Trial",
        startDate: vals[startIdx] || "", expiryDate: vals[expiryIdx] || "",
        status: "active", source: "csv", migrated: false,
      };
    }).filter((m) => m.name || m.email);
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload CSV or Excel file");
      addLog("Invalid file format: " + file.name, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const imported = parseCSV(text);
      if (imported.length === 0) { toast.error("No valid data found"); return; }
      // Check for duplicate slugs
      const existingSlugs = new Set(members.map((m) => m.slug));
      const duplicates = imported.filter((m) => existingSlugs.has(m.slug));
      const newOnes = imported.filter((m) => !existingSlugs.has(m.slug));
      // Check for duplicate emails
      const existingEmails = new Set(members.map((m) => m.email));
      const dupEmails = newOnes.filter((m) => existingEmails.has(m.email));
      const uniqueNew = newOnes.filter((m) => !existingEmails.has(m.email));
      setMembers((prev) => [...prev, ...uniqueNew]);
      toast.success(`Imported ${uniqueNew.length} new members${duplicates.length > 0 ? `, ${duplicates.length} duplicate slugs skipped` : ""}${dupEmails.length > 0 ? `, ${dupEmails.length} duplicate emails skipped` : ""}`);
      addLog(`CSV imported: ${uniqueNew.length} new, ${duplicates.length} slug dup skipped, ${dupEmails.length} email dup skipped`, uniqueNew.length > 0 ? "success" : "warning");
    };
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  // Import All
  const handleImportAll = () => {
    const unmigrated = members.filter((m) => !m.migrated);
    if (unmigrated.length === 0) { toast.info("All members already imported"); return; }
    setIsImporting(true);
    setImportProgress(0);
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setImportProgress(Math.round((current / unmigrated.length) * 100));
      if (current % 10 === 0) addLog(`Importing... ${current}/${unmigrated.length}`, "info");
      if (current >= unmigrated.length) {
        clearInterval(interval);
        const allIds = members.map((m) => m.sn);
        localStorage.setItem("migrated_members", JSON.stringify(allIds));
        setMembers((prev) => prev.map((m) => ({ ...m, migrated: true, status: "migrated" })));
        setIsImporting(false);
        toast.success(`Imported ${unmigrated.length} members!`);
        addLog(`Migration complete: ${unmigrated.length} members imported`, "success");
      }
    }, 30);
  };

  // Export
  const exportCSV = () => {
    const headers = ["SN", "Name", "Username", "Email", "Phone", "Slug", "Package", "Start Date", "Expiry Date", "Status"];
    const rows = filtered.map((m) => [m.sn, m.name, m.username, m.email, m.phone, m.slug, m.package, m.startDate, m.expiryDate, m.migrated ? "Migrated" : "Pending"]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "digitalcarda_members.csv"; a.click();
    URL.revokeObjectURL(url);
    addLog("CSV exported", "info");
    toast.success("CSV exported!");
  };

  const exportTemplate = () => {
    const headers = ["Name", "Username", "Email", "Phone", "Slug", "Package", "Start Date", "Expiry Date", "Business Name", "Designation", "Website", "Address"];
    const csv = headers.join(",");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "member_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Template CSV downloaded!");
  };

  const resetMigration = () => {
    if (confirm("Reset all migration status?")) {
      localStorage.removeItem("migrated_members");
      setMembers((prev) => prev.map((m) => ({ ...m, migrated: false, status: "active" })));
      addLog("Migration status reset", "warning");
      toast.success("Reset complete");
    }
  };

  // Filtered data
  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.username.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q);
    const matchesPkg = pkgFilter === "all" || m.package === pkgFilter;
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesPkg && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const stats = {
    total: members.length, migrated: members.filter((m) => m.migrated).length,
    trial: members.filter((m) => m.package === "Trial").length,
    standard: members.filter((m) => m.package === "STANDARD").length,
    starter: members.filter((m) => m.package === "STARTER").length,
    uniqueSlugs: new Set(members.map((m) => m.slug)).size,
    duplicateSlugs: members.length - new Set(members.map((m) => m.slug)).size,
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="Data Migration" subtitle="Migrate members from old DigitalCarda to new platform" /></div>
      <div className="p-6 space-y-6">

        {/* Safety Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Shield size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Migration Safety Rules</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="text-[11px] text-amber-700 flex items-center gap-1"><CheckCircle2 size={10} /> Same slug preserved</span>
              <span className="text-[11px] text-amber-700 flex items-center gap-1"><CheckCircle2 size={10} /> Same public URL: digitalcarda.in/&#123;slug&#125;</span>
              <span className="text-[11px] text-amber-700 flex items-center gap-1"><CheckCircle2 size={10} /> Duplicate validation</span>
              <span className="text-[11px] text-amber-700 flex items-center gap-1"><CheckCircle2 size={10} /> Old data never deleted</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Members", value: stats.total, icon: Database, color: "bg-[#FEF3C7] text-[#92400E]" },
            { label: "Migrated", value: stats.migrated, icon: CheckCircle2, color: "bg-[#D1FAE5] text-[#065F46]" },
            { label: "Trial", value: stats.trial, icon: Users, color: "bg-[#DBEAFE] text-[#1E40AF]" },
            { label: "Standard", value: stats.standard, icon: Users, color: "bg-[#FCE7F3] text-[#9D174D]" },
            { label: "Starter", value: stats.starter, icon: Users, color: "bg-[#CCFBF1] text-[#0F766E]" },
            { label: "Unique Slugs", value: stats.uniqueSlugs, icon: Link2, color: "bg-[#FEF3C7] text-[#92400E]" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9]">
              <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-2`}><s.icon size={16} /></div>
              <p className="text-xl font-bold text-[#0F172A]">{s.value}</p>
              <p className="text-[10px] text-[#64748B] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* CSV Upload */}
        <div
          className={`bg-white rounded-2xl shadow-premium border-2 border-dashed p-8 text-center transition-all ${
            dragOver ? "border-[#F7B31C] bg-[#FEF3C7]/20" : "border-[#E2E8F0]"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <FileUp size={32} className="text-[#CBD5E1] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#0F172A]">Drag & drop CSV or Excel file here</p>
          <p className="text-xs text-[#94A3B8] mt-1">Or click to browse. Supports .csv, .xlsx, .xls</p>
          <p className="text-[10px] text-[#CBD5E1] mt-2">Columns: Name, Username, Email, Phone, Slug/URL, Package, Start Date, Expiry Date</p>
          <div className="flex justify-center gap-3 mt-4">
            <label className="h-9 px-4 gradient-gold text-[#0F172A] rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer hover:shadow-gold transition-all">
              <Upload size={14} /> Select File
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
            </label>
            <button onClick={exportTemplate} className="h-9 px-4 border border-[#E2E8F0] text-[#64748B] rounded-xl text-xs font-medium flex items-center gap-2 hover:bg-[#F8FAFC] transition-all">
              <FileSpreadsheet size={14} /> Download Template
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={loadMembers} className="h-10 px-4 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-xl text-sm font-medium hover:bg-[#F8FAFC] flex items-center gap-2 transition-all">
            <RefreshCw size={14} /> Reload Scraped Data
          </button>
          <button onClick={exportCSV} className="h-10 px-4 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-xl text-sm font-medium hover:bg-[#F8FAFC] flex items-center gap-2 transition-all">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setShowLogs(!showLogs)} className="h-10 px-4 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-xl text-sm font-medium hover:bg-[#F8FAFC] flex items-center gap-2 transition-all">
            <Eye size={14} /> {showLogs ? "Hide" : "Show"} Logs ({logs.length})
          </button>
          <button onClick={resetMigration} className="h-10 px-4 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 flex items-center gap-2 transition-all">
            <Trash2 size={14} /> Reset
          </button>
          <button onClick={handleImportAll} disabled={isImporting || stats.migrated === stats.total} className="h-10 px-6 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold flex items-center gap-2 transition-all disabled:opacity-50 ml-auto">
            {isImporting ? <><Loader2 size={14} className="animate-spin" /> {importProgress}%</> : <><Save size={14} /> Import All</>}
          </button>
        </div>

        {/* Import Progress */}
        {isImporting && (
          <div className="bg-white rounded-2xl p-4 shadow-premium border border-[#F1F5F9]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#0F172A]">Importing {members.filter((m) => !m.migrated).length} members...</span>
              <span className="text-sm font-bold text-[#F7B31C]">{importProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div className="h-full gradient-gold rounded-full transition-all duration-200" style={{ width: `${importProgress}%` }} />
            </div>
          </div>
        )}

        {/* Logs Panel */}
        {showLogs && (
          <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] p-4 max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between mb-2"><p className="text-sm font-semibold text-[#0F172A]">Migration Logs</p><button onClick={() => setLogs([])} className="text-[10px] text-red-500 hover:underline">Clear</button></div>
            {logs.length === 0 ? <p className="text-xs text-[#94A3B8]">No logs yet</p> : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className={`flex items-center gap-2 text-xs py-1 px-2 rounded-lg ${
                    log.type === "success" ? "text-emerald-600 bg-emerald-50" : log.type === "error" ? "text-red-500 bg-red-50" : log.type === "warning" ? "text-amber-600 bg-amber-50" : "text-[#64748B]"
                  }`}>
                    <span className="text-[10px] text-[#94A3B8] shrink-0">{log.timestamp}</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input type="text" placeholder="Search name, email, slug..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm border border-[#E2E8F0] outline-none focus:border-[#F7B31C] shadow-premium transition-all" />
            </div>
            <select value={pkgFilter} onChange={(e) => { setPkgFilter(e.target.value); setPage(1); }} className="h-11 bg-white rounded-xl px-4 text-sm border border-[#E2E8F0] outline-none">
              <option value="all">All Packages</option><option value="Trial">Trial</option><option value="STANDARD">Standard</option><option value="STARTER">Starter</option>
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-11 bg-white rounded-xl px-4 text-sm border border-[#E2E8F0] outline-none">
              <option value="all">All Status</option><option value="active">Active</option><option value="migrated">Migrated</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-premium border border-[#F1F5F9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-[#F8FAFC]">
                {["#", "Name", "Email/Phone", "Slug", "Pkg", "Start", "Expiry", "Status"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-[#64748B] uppercase px-4 py-3">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {paginated.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-[#94A3B8]">{loading ? "Loading..." : "No members found"}</td></tr>
                ) : (
                  paginated.map((m) => (
                    <tr key={m.sn} className={`hover:bg-[#F8FAFC] transition-colors ${m.migrated ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 text-xs text-[#94A3B8]">{m.sn}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center shrink-0"><span className="text-[#0F172A] text-[10px] font-bold">{m.name.charAt(0)}</span></div>
                          <div><p className="text-xs font-medium text-[#0F172A]">{m.name}</p><p className="text-[10px] text-[#94A3B8]">{m.username}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><p className="text-[11px] text-[#64748B]">{m.email}</p><p className="text-[10px] text-[#94A3B8]">{m.phone}</p></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1"><Globe size={10} className="text-[#94A3B8] shrink-0" /><span className="text-[10px] text-[#64748B] font-mono">{m.slug}</span></div>
                      </td>
                      <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pkgColors[m.package] || "bg-[#F1F5F9] text-[#64748B]"}`}>{m.package}</span></td>
                      <td className="px-4 py-3 text-[10px] text-[#64748B]">{m.startDate}</td>
                      <td className="px-4 py-3 text-[10px] text-[#64748B]">{m.expiryDate}</td>
                      <td className="px-4 py-3">
                        {m.migrated ? <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"><CheckCircle2 size={10} /> Done</span> : <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] font-medium">Pending</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#F1F5F9]">
              <p className="text-xs text-[#94A3B8]">Page {page} of {totalPages} ({filtered.length} total)</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-30"><ChevronLeft size={14} /></button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-30"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}

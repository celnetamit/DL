"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchContents, createContent, updateContent, deleteContent, getAdminAnalytics, apiFetch } from "@/lib/api";
import Toast from "@/components/Toast";

const CATEGORIES = [
  {
    key: "articles",
    label: "Articles",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "author", label: "Author", type: "text" },
      { name: "tags", label: "Tags", type: "text" },
      { name: "source_url", label: "Source URL", type: "url" },
      { name: "status", label: "Status", type: "select", options: ["Draft", "Published", "Archived"] },
    ],
  },
  {
    key: "ebooks",
    label: "EBooks",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "isbn", label: "ISBN", type: "text" },
      { name: "publisher", label: "Publisher", type: "text" },
      { name: "edition", label: "Edition", type: "text" },
      { name: "source_url", label: "Source URL", type: "url" },
      { name: "status", label: "Status", type: "select", options: ["Draft", "Published", "Archived"] },
    ],
  },
  {
    key: "videos",
    label: "Video",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "duration", label: "Duration (min)", type: "number" },
      { name: "source_url", label: "Video URL", type: "url" },
      { name: "resolution", label: "Resolution", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["Draft", "Published", "Archived"] },
    ],
  },
  {
    key: "thesis",
    label: "Thesis",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "author", label: "Author", type: "text" },
      { name: "university", label: "University", type: "text" },
      { name: "advisor", label: "Advisor", type: "text" },
      { name: "source_url", label: "Document URL", type: "url" },
      { name: "status", label: "Status", type: "select", options: ["Draft", "Published", "Archived"] },
    ],
  },
  {
    key: "conference_proceedings",
    label: "ConferenceProceedings",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "conference", label: "Conference Name", type: "text" },
      { name: "year", label: "Year", type: "number" },
      { name: "location", label: "Location", type: "text" },
      { name: "source_url", label: "Proceedings URL", type: "url" },
      { name: "status", label: "Status", type: "select", options: ["Draft", "Published", "Archived"] },
    ],
  },
  {
    key: "case_studies",
    label: "CaseStudies",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "industry", label: "Industry", type: "text" },
      { name: "region", label: "Region", type: "text" },
      { name: "source_url", label: "Case URL", type: "url" },
      { name: "status", label: "Status", type: "select", options: ["Draft", "Published", "Archived"] },
    ],
  },
  {
    key: "emagazines",
    label: "EMagazines",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "issue", label: "Issue", type: "text" },
      { name: "publisher", label: "Publisher", type: "text" },
      { name: "source_url", label: "Magazine URL", type: "url" },
      { name: "status", label: "Status", type: "select", options: ["Draft", "Published", "Archived"] },
    ],
  },
  {
    key: "enewspaper",
    label: "ENewspaper",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "issue_date", label: "Issue Date", type: "date" },
      { name: "publisher", label: "Publisher", type: "text" },
      { name: "source_url", label: "Newspaper URL", type: "url" },
      { name: "status", label: "Status", type: "select", options: ["Draft", "Published", "Archived"] },
    ],
  },
  {
    key: "journals",
    label: "Journals",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "issn", label: "ISSN", type: "text" },
      { name: "publisher", label: "Publisher", type: "text" },
      { name: "source_url", label: "Journal URL", type: "url" },
      { name: "status", label: "Status", type: "select", options: ["Draft", "Published", "Archived"] },
    ],
  },
  {
    key: "journal_articles",
    label: "JournalArticles",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "journal", label: "Journal Name", type: "text" },
      { name: "doi", label: "DOI", type: "text" },
      { name: "author", label: "Author", type: "text" },
      { name: "source_url", label: "Article URL", type: "url" },
      { name: "status", label: "Status", type: "select", options: ["Draft", "Published", "Archived"] },
    ],
  },
];

CATEGORIES.forEach((cat) => {
  // @ts-ignore
  cat.fields.push(
    { name: "domain", label: "Domain", type: "select" },
    { name: "subdomain", label: "Subdomain", type: "select" },
    { name: "access_type", label: "Access Type", type: "select", options: ["Open Access", "Subscription-based"], required: true } as any
  );
});

type FieldDef = (typeof CATEGORIES)[number]["fields"][number];

type Item = {
  id: string;
  [key: string]: any;
};

function emptyForm(fields: FieldDef[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.name] = "";
    return acc;
  }, {});
}

export default function AdminDashboard() {
  const { token, loading: authLoading } = useAuth();
  const [activeKey, setActiveKey] = useState(CATEGORIES[0].key);
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, Item[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analyticsWindow, setAnalyticsWindow] = useState(6);
  const [analytics, setAnalytics] = useState({
    total_users: 0,
    total_institutions: 0,
    active_subscriptions: 0,
    total_revenue: 0,
    months: 6,
    monthly_growth: [] as Array<{
      label: string;
      users: number;
      institutions: number;
      new_subscriptions: number;
      active_subscriptions: number;
      captured_payments: number;
      revenue: number;
    }>,
    purchase_access_breakdown: {} as Record<string, number>,
    purchase_payment_breakdown: {} as Record<string, number>,
    top_products: [] as Array<{
      product_id: string;
      product_name: string;
      purchase_count: number;
    }>,
    system_status: {
      database: {
        status: "up",
        open_connections: 0,
        in_use: 0,
        idle: 0,
      },
      ai: {
        failed_generations_last_24h: 0,
      },
      audit: {
        events_last_24h: 0,
      },
    },
  });
  const [globalDomains, setGlobalDomains] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [analyticsLoadError, setAnalyticsLoadError] = useState<string | null>(null);
  const [domainLoadError, setDomainLoadError] = useState<string | null>(null);
  const itemsPerPage = 20;

  const [importProgress, setImportProgress] = useState<{
    isImporting: boolean;
    total: number;
    processed: number;
    startTime: number;
    etaSeconds: number | null;
  } | null>(null);

  const category = useMemo(() => CATEGORIES.find((item) => item.key === activeKey)!, [activeKey]);
  const [formState, setFormState] = useState<Record<string, string>>(() => emptyForm(category.fields));

  const currentItems = itemsByCategory[category.key] || [];
  const filteredItems = currentItems.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(item).some((value) => String(value || "").toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const loadData = async (catKey: string) => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchContents(catKey, token);
      const formatted = data.map((c: any) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        source_url: c.source_url || "",
        ...(c.metadata || {}),
      }));
      setItemsByCategory((prev) => ({ ...prev, [catKey]: formatted }));
    } catch (err) {
      console.error(err);
      const categoryLabel = CATEGORIES.find((item) => item.key === catKey)?.label.toLowerCase() || "content";
      setErrorMsg(`Unable to load ${categoryLabel} records right now.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && token && !itemsByCategory[activeKey]) {
      loadData(activeKey);
    }
  }, [activeKey, token, authLoading, itemsByCategory]);

  useEffect(() => {
    if (!authLoading && token) {
      setAnalyticsLoadError(null);
      setDomainLoadError(null);
      getAdminAnalytics(token, analyticsWindow)
        .then(setAnalytics)
        .catch((error) => {
          console.error(error);
          const message = error.message || "Unable to load admin analytics.";
          setAnalyticsLoadError(message);
          setToast({ message, tone: "error" });
        });
      apiFetch<any[]>("/api/v1/domains", { cache: "no-store" }, token)
        .then(d => setGlobalDomains(d || []))
        .catch((error) => {
          console.error(error);
          const message = error.message || "Unable to load the domain catalog.";
          setDomainLoadError(message);
          setToast({ message, tone: "error" });
        });
    }
  }, [token, authLoading, analyticsWindow]);

  const maxRevenue = Math.max(...analytics.monthly_growth.map((point) => point.revenue), 0);
  const maxUsers = Math.max(...analytics.monthly_growth.map((point) => point.users), 0);

  const resetForm = () => {
    setFormState(emptyForm(category.fields));
    setEditingId(null);
    setErrorMsg(null);
    setIsModalOpen(false);
    setSearchTerm("");
    setStatusFilter("");
  };

  const handleCategoryChange = (key: string) => {
    setActiveKey(key);
    setCurrentPage(1);
    const nextCategory = CATEGORIES.find((item) => item.key === key)!;
    setFormState(emptyForm(nextCategory.fields));
    setEditingId(null);
    setErrorMsg(null);
    setIsModalOpen(false);
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!token) return;
    setErrorMsg(null);
    try {
      const { title, status, source_url, ...metadata } = formState;
      const payload = {
        type: category.key,
        title,
        status,
        source_url,
        metadata,
      };

      if (editingId) {
        await updateContent(editingId, payload, token);
        await loadData(category.key);
        setToast({ message: `${category.label} record updated successfully.`, tone: "success" });
      } else {
        await createContent(payload, token);
        await loadData(category.key);
        setToast({ message: `${category.label} record created successfully.`, tone: "success" });
      }
      resetForm();
    } catch (err) {
      console.error(err);
      setErrorMsg(`Unable to save this ${category.label.toLowerCase()} record. Check the required fields and try again.`);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setErrorMsg(null);
    const next: Record<string, string> = emptyForm(category.fields);
    category.fields.forEach((field) => {
      next[field.name] = item[field.name] || "";
    });
    setFormState(next);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    if (currentItems.length === 0) return;
    const baseHeaders = ["id", "title", "status", "source_url"];
    const categoryFieldNames = category.fields.map(f => f.name).filter(n => !baseHeaders.includes(n));
    const headers = [...baseHeaders, ...categoryFieldNames];
    
    const csvContent = [
      headers.join(","),
      ...currentItems.map(item => headers.map(h => `"${(item[h] || "").toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `${category.key}_export.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result.map(v => v.trim());
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!token || !e.target.files?.length) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) return;

      const headers = parseCSVLine(lines[0]);
      let imports = 0;
      let failedRows = 0;
      setLoading(true);

      const totalRows = lines.length - 1;
      const startTime = Date.now();
      setImportProgress({
        isImporting: true,
        total: totalRows,
        processed: 0,
        startTime: startTime,
        etaSeconds: null
      });

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0 || (values.length === 1 && values[0] === "")) continue;
        
        const rowData: Record<string, string> = {};
        headers.forEach((h, idx) => {
          const cleanH = h.replace(/^"|"$/g, '').replace(/^\uFEFF/, '');
          const val = values[idx] || "";
          if (!rowData[cleanH]) {
            rowData[cleanH] = val;
          } else if (val) {
            rowData[cleanH] = val; // Only overwrite if the new duplicate column actually has a value
          }
        });

        // The id column might have imported with weird leading characters like @id if user edited
        const idKey = Object.keys(rowData).find(k => k === 'id' || k === '@id') || 'id';
        const id = rowData[idKey];
        
        const { title, status, source_url, ...rawMetadata } = rowData;
        delete rawMetadata[idKey];
        
        // Remove empty keys from metadata
        const metadata: Record<string, string> = {};
        for (const k in rawMetadata) {
          if (k) metadata[k] = rawMetadata[k];
        }

        const payload = {
          type: category.key,
          title: title || "Imported Record",
          status: status || "Draft",
          source_url: source_url || "",
          metadata
        };

        try {
          if (id) {
            await updateContent(id, payload, token);
          } else {
            await createContent(payload, token);
          }
          imports++;
        } catch (err) {
          console.error("Failed importing row", i, err);
          failedRows++;
        }

        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const itemsPerSecond = i / elapsedSeconds;
        const remainingItems = totalRows - i;
        const etaSeconds = itemsPerSecond > 0 ? Math.round(remainingItems / itemsPerSecond) : null;
        setImportProgress(prev => prev ? { ...prev, processed: i, etaSeconds } : null);
      }
      
      setToast({
        message: failedRows > 0
          ? `Import finished with ${imports} successful rows and ${failedRows} failed rows.`
          : `Import completed successfully with ${imports} records processed.`,
        tone: failedRows > 0 ? "error" : "success",
      });
      await loadData(category.key);
      setLoading(false);
      setImportProgress(null);
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await deleteContent(id, token);
      setItemsByCategory((prev) => ({
        ...prev,
        [category.key]: (prev[category.key] || []).filter((item) => item.id !== id),
      }));
      if (editingId === id) {
        resetForm();
      }
      setPendingDeleteId(null);
      setToast({ message: "Record deleted successfully.", tone: "success" });
    } catch (err) {
      console.error(err);
      setErrorMsg(`Unable to delete this ${category.label.toLowerCase()} record.`);
      setToast({ message: `Unable to delete this ${category.label.toLowerCase()} record.`, tone: "error" });
    }
  };

  if (authLoading) return <p className="p-6 text-dune/60">Loading auth...</p>;

  if (!token) {
    return (
      <div className="rounded-2xl bg-midnight/60 p-6 text-center text-ember">
        You must be logged in as an administrator to view this page.
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
      {(analyticsLoadError || domainLoadError) && (
        <div className="mb-6 rounded-2xl border border-ember/20 bg-ember/5 p-4 text-sm text-ember">
          {analyticsLoadError && <p>{analyticsLoadError}</p>}
          {domainLoadError && <p className={analyticsLoadError ? "mt-1" : ""}>{domainLoadError}</p>}
        </div>
      )}
      <section className="grid gap-6 md:grid-cols-3 mb-8 min-w-0 w-full">
        <div className="glass rounded-2xl p-6 border border-dune/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-dune/60">Total Users</p>
          <p className="mt-4 font-[var(--font-space)] text-4xl font-semibold text-ember">{analytics.total_users}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-dune/60">Institutions</p>
          <p className="mt-4 font-[var(--font-space)] text-4xl font-semibold text-ember">{analytics.total_institutions}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-dune/60">Active Subscriptions</p>
          <p className="mt-4 font-[var(--font-space)] text-4xl font-semibold text-ember">{analytics.active_subscriptions}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-dune/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-dune/60">Total Revenue</p>
          <p className="mt-4 font-[var(--font-space)] text-4xl font-semibold text-ember">₹{analytics.total_revenue}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr_1fr] mb-8 min-w-0 w-full">
        <div className="glass rounded-2xl p-6 border border-dune/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-dune/60">Database Status</p>
          <div className="mt-4 flex items-center gap-3">
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                analytics.system_status.database.status === "up" ? "bg-moss/20 text-moss" : "bg-ember/20 text-ember"
              }`}
            >
              {analytics.system_status.database.status}
            </span>
            <span className="text-sm text-dune/65">
              {analytics.system_status.database.open_connections} open
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-dune/70">
            <div className="rounded-xl bg-midnight/25 p-3">
              <p className="text-[10px] uppercase tracking-widest text-dune/45">In Use</p>
              <p className="mt-2 text-xl font-[var(--font-space)] text-dune">{analytics.system_status.database.in_use}</p>
            </div>
            <div className="rounded-xl bg-midnight/25 p-3">
              <p className="text-[10px] uppercase tracking-widest text-dune/45">Idle</p>
              <p className="mt-2 text-xl font-[var(--font-space)] text-dune">{analytics.system_status.database.idle}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-dune/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-dune/60">AI Reliability</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] font-semibold text-ember">
            {analytics.system_status.ai.failed_generations_last_24h}
          </p>
          <p className="mt-2 text-sm text-dune/60">Failed AI generations in the last 24 hours</p>
        </div>

        <div className="glass rounded-2xl p-6 border border-dune/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-dune/60">Audit Activity</p>
          <p className="mt-4 text-4xl font-[var(--font-space)] font-semibold text-ember">
            {analytics.system_status.audit.events_last_24h}
          </p>
          <p className="mt-2 text-sm text-dune/60">Audit events recorded in the last 24 hours</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr] mb-8 min-w-0 w-full">
        <div className="glass rounded-2xl p-6 border border-dune/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-dune/60">Growth Analytics</p>
              <h3 className="mt-2 font-[var(--font-space)] text-2xl">Revenue, users, and subscriptions</h3>
            </div>
            <select
              value={analyticsWindow}
              onChange={(event) => setAnalyticsWindow(Number(event.target.value))}
              className="rounded-full border border-dune/20 bg-midnight/40 px-3 py-1.5 text-xs text-dune outline-none"
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-dune/55">Revenue Trend</p>
              <div className="mt-4 flex h-48 items-end gap-3">
                {analytics.monthly_growth.map((point) => (
                  <div key={`revenue-${point.label}`} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-36 w-full items-end rounded-2xl bg-dune/5 p-2">
                      <div
                        className="w-full rounded-xl bg-ember/80 transition-all"
                        style={{ height: `${maxRevenue > 0 ? Math.max((point.revenue / maxRevenue) * 100, 8) : 8}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-semibold text-dune">₹{Math.round(point.revenue)}</p>
                      <p className="text-[10px] uppercase tracking-widest text-dune/45">{point.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-dune/55">User Growth</p>
              <div className="mt-4 space-y-3">
                {analytics.monthly_growth.map((point) => (
                  <div key={`users-${point.label}`} className="rounded-2xl border border-dune/10 bg-midnight/25 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="uppercase tracking-widest text-dune/45">{point.label}</span>
                      <span className="text-dune/75">{point.users} users, {point.institutions} institutions</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-dune/10">
                      <div
                        className="h-full rounded-full bg-moss"
                        style={{ width: `${maxUsers > 0 ? Math.max((point.users / maxUsers) * 100, 8) : 8}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-dune/60">
                      <span>{point.new_subscriptions} new subs</span>
                      <span>{point.active_subscriptions} active</span>
                      <span>{point.captured_payments} paid</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-dune/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-dune/60">Purchase Access</p>
            <div className="mt-4 space-y-3">
              {Object.entries(analytics.purchase_access_breakdown).length === 0 ? (
                <p className="text-sm text-dune/50">No purchase access data in this window.</p>
              ) : (
                Object.entries(analytics.purchase_access_breakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between rounded-xl bg-midnight/25 px-3 py-2 text-sm">
                    <span className="uppercase tracking-widest text-dune/55">{status}</span>
                    <span className="font-semibold text-dune">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="glass rounded-2xl p-6 border border-dune/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-dune/60">Top Products</p>
            <div className="mt-4 space-y-3">
              {analytics.top_products.length === 0 ? (
                <p className="text-sm text-dune/50">No product sales tracked in this window.</p>
              ) : (
                analytics.top_products.map((product) => (
                  <div key={product.product_id} className="rounded-xl bg-midnight/25 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-dune">{product.product_name || "Unnamed Product"}</p>
                      <span className="text-xs text-ember">{product.purchase_count} purchases</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr] min-w-0 w-full">
        <aside className="glass rounded-2xl p-6 min-w-0">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-dune/60">Admin Dashboard</p>
          <h2 className="mt-2 font-[var(--font-space)] text-2xl">Content Manager</h2>
        </div>
        <nav className="mt-6 space-y-2">
          {CATEGORIES.map((item) => (
            <button
              key={item.key}
              onClick={() => handleCategoryChange(item.key)}
              className={`w-full rounded-xl px-4 py-2 text-left text-sm transition ${
                activeKey === item.key
                  ? "bg-ember text-midnight"
                  : "border border-dune/20 text-dune/80 hover:border-dune/40"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="space-y-6 min-w-0">
        <header className="glass rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-dune/60">Manage</p>
              <h3 className="font-[var(--font-space)] text-2xl">{category.label}</h3>
              <p className="mt-2 text-sm text-dune/70">
                Add, edit, and remove {category.label.toLowerCase()} content.
              </p>
            </div>
            <div className="text-xs text-dune/60">
              {loading ? "Loading..." : `${filteredItems.length} of ${currentItems.length} items`}
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="glass rounded-2xl p-5 border border-dune/10">
            <p className="text-[10px] uppercase tracking-widest text-dune/55">Total Records</p>
            <p className="mt-3 text-3xl font-[var(--font-space)] text-ember">{currentItems.length}</p>
          </div>
          <div className="glass rounded-2xl p-5 border border-dune/10">
            <p className="text-[10px] uppercase tracking-widest text-dune/55">Published</p>
            <p className="mt-3 text-3xl font-[var(--font-space)] text-ember">
              {currentItems.filter((item) => item.status === "Published").length}
            </p>
          </div>
          <div className="glass rounded-2xl p-5 border border-dune/10">
            <p className="text-[10px] uppercase tracking-widest text-dune/55">Draft / Archived</p>
            <p className="mt-3 text-3xl font-[var(--font-space)] text-ember">
              {currentItems.filter((item) => item.status !== "Published").length}
            </p>
          </div>
        </section>

        {importProgress && importProgress.isImporting && (
          <div className="glass rounded-2xl p-6 border border-ember/30 bg-midnight/80">
            <div className="flex justify-between text-sm mb-3 font-semibold text-ember">
              <span>Importing Records... ({importProgress.processed} / {importProgress.total})</span>
              <span>{importProgress.processed === 0 || importProgress.etaSeconds === null ? 'Calculating ETA...' : `ETA: ${importProgress.etaSeconds}s`}</span>
            </div>
            <div className="w-full bg-dune/10 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className="bg-ember h-3 rounded-full transition-all duration-300 shadow-glow" 
                style={{ width: `${Math.round((importProgress.processed / importProgress.total) * 100)}%` }}
              ></div>
            </div>
            <div className="mt-3 text-right text-xs text-dune/60 font-[var(--font-space)]">
              {Math.round((importProgress.processed / importProgress.total) * 100)}% Complete
            </div>
          </div>
        )}

        <div className="grid gap-6 min-w-0 w-full">
          <div className="glass rounded-2xl p-6 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-lg font-semibold">Existing Records</h4>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={searchTerm}
                  onChange={(event) => {
                    setCurrentPage(1);
                    setSearchTerm(event.target.value);
                  }}
                  placeholder="Search title or metadata..."
                  className="rounded-full border border-dune/20 bg-midnight/40 px-3 py-1.5 text-xs text-dune outline-none"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setCurrentPage(1);
                    setStatusFilter(event.target.value);
                  }}
                  className="rounded-full border border-dune/20 bg-midnight/40 px-3 py-1.5 text-xs text-dune outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
                <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={handleImport} disabled={loading} />
                <label htmlFor="csv-upload" className="cursor-pointer rounded-full bg-dune/10 px-3 py-1 text-xs hover:bg-dune/20 transition disabled:opacity-50">
                  Import CSV
                </label>
                <button onClick={handleExport} className="rounded-full bg-dune/10 px-3 py-1 text-xs hover:bg-dune/20 transition">
                  Export CSV
                </button>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="rounded-full bg-ember px-4 py-1.5 text-xs text-midnight font-bold shadow-glow hover:bg-ember/90 transition">
                  + Add New
                </button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-dune/5 text-dune/60 uppercase tracking-widest text-[10px]">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-xl rounded-bl-xl">ID / Title</th>
                    {category.fields.map(field => (
                      <th key={field.name} className="px-4 py-3 font-semibold">{field.label}</th>
                    ))}
                    <th className="px-4 py-3 font-semibold text-right rounded-tr-xl rounded-br-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dune/10">
                  {currentItems.length === 0 && !loading && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-dune/60">
                        No records yet. Add your first {category.label.toLowerCase()} entry.
                      </td>
                    </tr>
                  )}
                  {filteredItems.length === 0 && currentItems.length > 0 && !loading && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-dune/60">
                        No records match the current search or status filters.
                      </td>
                    </tr>
                  )}
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-dune/5 transition-colors">
                      <td className="px-4 py-3 max-w-[200px] truncate">
                        <p className="font-semibold text-dune">{item.title || "Untitled"}</p>
                        <p className="text-[10px] text-dune/50 truncate" title={item.id}>ID: {item.id}</p>
                      </td>
                      {category.fields.map((field) => (
                        <td key={field.name} className="px-4 py-3 max-w-[150px] truncate" title={item[field.name]}>
                          <span className="text-dune/80 text-xs">
                            {(field.name === "subdomain" && !item.domain) ? "-" : (item[field.name] || "-")}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(item)} className="rounded bg-dune/10 px-2 py-1 text-xs hover:bg-dune/20 transition">Edit</button>
                          {pendingDeleteId === item.id ? (
                            <>
                              <button onClick={() => handleDelete(item.id)} className="rounded bg-ember/10 text-ember px-2 py-1 text-xs hover:bg-ember/20 transition">Confirm</button>
                              <button onClick={() => setPendingDeleteId(null)} className="rounded bg-dune/10 px-2 py-1 text-xs hover:bg-dune/20 transition">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => setPendingDeleteId(item.id)} className="rounded bg-ember/10 text-ember px-2 py-1 text-xs hover:bg-ember/20 transition">Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-dune/10 pt-4">
                  <p className="text-xs text-dune/60">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} records
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-xs rounded-md border border-dune/20 hover:bg-dune/10 disabled:opacity-50 transition"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-xs rounded-md border border-dune/20 hover:bg-dune/10 disabled:opacity-50 transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/80 backdrop-blur-sm transition-opacity">
          <div className="glass w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl relative border border-dune/20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-2xl font-[var(--font-space)] font-semibold">{editingId ? "Edit Record" : "Add New Record"}</h4>
                <p className="text-xs text-dune/60 uppercase tracking-widest mt-1">{category.label}</p>
              </div>
              <button
                onClick={resetForm}
                className="rounded-full bg-dune/10 hover:bg-ember/20 hover:text-ember px-3 py-1 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
            
            {errorMsg && (
              <div className="mb-6 p-4 bg-ember/10 border border-ember/20 text-ember rounded-xl text-sm font-medium">
                {errorMsg}
              </div>
            )}

            <div className="grid gap-5">
              {category.fields.map((field) => {
                if (field.name === "subdomain" && !formState.domain) return null;
                return (
                <label key={field.name} className="space-y-2 text-sm text-dune/80">
                  <span className="uppercase tracking-[0.2em] text-xs text-dune/60 font-semibold">{field.label} {field.required && <span className="text-ember">*</span>}</span>
                  {field.type === "select" ? (
                    <select
                      className="w-full rounded-xl bg-midnight/60 px-4 py-3 text-sm text-dune border border-dune/20 focus:border-ember outline-none transition-colors"
                      value={formState[field.name] || ""}
                      onChange={(event) => handleFieldChange(field.name, event.target.value)}
                    >
                      <option value="">Select an option</option>
                      {field.name === "domain" ? (
                        globalDomains.map((dom) => (
                          <option key={dom.id} value={dom.name}>
                            {dom.name}
                          </option>
                        ))
                      ) : field.name === "subdomain" ? (
                        (globalDomains.find(d => d.name === formState.domain)?.subdomains || []).map((sub: any) => (
                          <option key={sub.id} value={sub.name}>
                            {sub.name}
                          </option>
                        ))
                      ) : (
                        field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))
                      )}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-xl bg-midnight/60 px-4 py-3 text-sm text-dune border border-dune/20 focus:border-ember outline-none transition-colors"
                      type={field.type}
                      value={formState[field.name] || ""}
                      onChange={(event) => handleFieldChange(field.name, event.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                    />
                  )}
                </label>
              )})}
              <label className="space-y-2 text-sm text-dune/80">
                <span className="uppercase tracking-[0.2em] text-xs text-dune/60 font-semibold">Base Title *</span>
                <input
                  className="w-full rounded-xl bg-midnight/60 px-4 py-3 text-sm text-dune border border-dune/20 focus:border-ember outline-none transition-colors"
                  type="text"
                  value={formState.title || ""}
                  onChange={(event) => handleFieldChange("title", event.target.value)}
                  placeholder="Internal Title (Required)"
                />
              </label>
              {(category.key === "documentaries" || category.key === "podcast_episodes" || category.key === "journal_articles" || category.key === "virtual_labs" || category.key === "research_papers") && (
                <label className="space-y-2 text-sm text-dune/80">
                  <span className="uppercase tracking-[0.2em] text-xs text-dune/60 font-semibold">Source URL</span>
                  <input
                    className="w-full rounded-xl bg-midnight/60 px-4 py-3 text-sm text-dune border border-dune/20 focus:border-ember outline-none transition-colors"
                    type="url"
                    value={formState.source_url || ""}
                    onChange={(event) => handleFieldChange("source_url", event.target.value)}
                    placeholder="https://"
                  />
                </label>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="mt-8 w-full rounded-xl bg-ember px-4 py-4 text-sm font-bold text-midnight shadow-glow hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Saving Record..." : "Save Record"}
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

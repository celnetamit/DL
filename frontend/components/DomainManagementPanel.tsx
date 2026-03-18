"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type Subdomain = { id: string; name: string };
type Domain = { id: string; name: string; subdomains: Subdomain[] };

export default function DomainManagementPanel() {
  const { token } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomainName, setNewDomainName] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [newSubdomainName, setNewSubdomainName] = useState("");

  const fetchDomains = async () => {
    if (!token) return;
    try {
      const res = await apiFetch<Domain[]>("/api/v1/domains", { cache: "no-store" }, token);
      setDomains(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [token]);

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newDomainName.trim()) return;
    try {
      await apiFetch("/api/v1/domains", { method: "POST", body: JSON.stringify({ name: newDomainName }) }, token);
      setNewDomainName("");
      fetchDomains();
    } catch (err) {
      console.error(err);
      alert("Failed to create domain");
    }
  };

  const handleCreateSubdomain = async (e: React.FormEvent, domainId: string) => {
    e.preventDefault();
    if (!token || !newSubdomainName.trim()) return;
    try {
      await apiFetch(`/api/v1/domains/${domainId}/subdomains`, { method: "POST", body: JSON.stringify({ name: newSubdomainName }) }, token);
      setNewSubdomainName("");
      fetchDomains();
    } catch (err) {
      console.error(err);
      alert("Failed to create subdomain");
    }
  };

  const handleDeleteDomain = async (id: string) => {
    if (!token || !confirm("Delete domain?")) return;
    try {
      await apiFetch(`/api/v1/domains/${id}`, { method: "DELETE" }, token);
      fetchDomains();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubdomain = async (subId: string) => {
    if (!token || !confirm("Delete subdomain?")) return;
    try {
      await apiFetch(`/api/v1/subdomains/${subId}`, { method: "DELETE" }, token);
      fetchDomains();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p className="text-dune/60 p-6">Loading domains...</p>;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-[var(--font-space)] mb-4">Add Domain</h3>
        <form onSubmit={handleCreateDomain} className="flex gap-4 items-end">
          <label className="flex-1 space-y-2 text-xs text-dune/60">
            <span className="uppercase tracking-[0.2em]">Domain Name</span>
            <input
              className="w-full rounded-xl bg-midnight px-3 py-2 text-sm text-dune border border-dune/20 outline-none"
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
              placeholder="e.g. Engineering"
            />
          </label>
          <button type="submit" className="rounded-xl bg-ember px-5 py-2 text-sm font-semibold text-midnight hover:opacity-90">
            Create
          </button>
        </form>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-[var(--font-space)] mb-4">Domains & Subdomains</h3>
        <div className="space-y-4">
          {domains.map((dom) => (
            <div key={dom.id} className="rounded-xl border border-dune/20 p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg text-dune">{dom.name}</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedDomain(selectedDomain === dom.id ? null : dom.id)}
                    className="rounded-full border border-dune/30 px-3 py-1 text-xs hover:bg-dune/10"
                  >
                    {selectedDomain === dom.id ? "Hide Subdomains" : "Manage Subdomains"}
                  </button>
                  <button
                    onClick={() => handleDeleteDomain(dom.id)}
                    className="rounded-full border border-ember/40 px-3 py-1 text-xs text-ember hover:bg-ember/10"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {selectedDomain === dom.id && (
                <div className="mt-4 pt-4 border-t border-dune/10 pl-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {dom.subdomains?.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between rounded bg-midnight/50 px-3 py-2 text-sm">
                        <span>{sub.name}</span>
                        <button onClick={() => handleDeleteSubdomain(sub.id)} className="text-ember opacity-60 hover:opacity-100 text-xs">
                          ✕
                        </button>
                      </div>
                    ))}
                    {(!dom.subdomains || dom.subdomains.length === 0) && (
                      <p className="text-xs text-dune/40 py-2">No subdomains yet.</p>
                    )}
                  </div>
                  
                  <form onSubmit={(e) => handleCreateSubdomain(e, dom.id)} className="flex gap-2 items-center mt-3">
                    <input
                      className="rounded bg-midnight px-3 py-1.5 text-xs text-dune border border-dune/20 outline-none flex-1 max-w-[200px]"
                      value={newSubdomainName}
                      onChange={(e) => setNewSubdomainName(e.target.value)}
                      placeholder="New subdomain name"
                    />
                    <button type="submit" className="rounded bg-dune/20 px-3 py-1.5 text-xs font-semibold hover:bg-dune/30">
                      Add
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
          {domains.length === 0 && <p className="text-sm text-dune/60">No domains configured yet.</p>}
        </div>
      </div>
    </div>
  );
}

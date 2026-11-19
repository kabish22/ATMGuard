
"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, ShieldCheck, Search } from "lucide-react";
import Link from "next/link";

const API = "http://127.0.0.1:8000";

type Recovery = {
  id: number;
  transaction_id: string;
  recovery_action: string;
  result: string;
  created_at: string;
};

export default function RecoveryPage() {
  const [logs, setLogs] = useState<Recovery[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLogs() {
    try {
      setError("");
      const response = await fetch(`${API}/recovery/logs`);
      if (!response.ok) throw new Error("Unable to load recovery logs");
      setLogs(await response.json());
    } catch {
      setError("Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = logs.filter(log =>
    log.transaction_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#080d18] p-5 text-slate-100 md:p-9">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="mb-4 flex items-center gap-2 text-sm text-cyan-400">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold">Recovery Logs</h1>
            <p className="mt-2 text-sm text-slate-400">
              Monitor failed transaction reconciliation and recovery activities.
            </p>
          </div>
          <button onClick={loadLogs} className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 hover:bg-slate-800">
            <RefreshCw size={17} /> Refresh
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-[#111a2b] p-5">
            <ShieldCheck className="mb-5 text-cyan-400" size={24} />
            <p className="text-sm text-slate-400">Total Recovery Records</p>
            <h2 className="mt-2 text-3xl font-bold">{logs.length}</h2>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[#111a2b] p-5">
            <ShieldCheck className="mb-5 text-emerald-400" size={24} />
            <p className="text-sm text-slate-400">Reconciled Records</p>
            <h2 className="mt-2 text-3xl font-bold">
              {logs.filter(l => l.result === "RECONCILED_NO_DEBIT").length}
            </h2>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#111a2b] p-6">
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-700 bg-[#0b1423] px-4">
            <Search size={18} className="text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search transaction ID..."
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
          </div>

          {error && <p className="mb-4 text-red-400">{error}</p>}

          {loading ? (
            <p className="py-8 text-center text-slate-400">Loading recovery records...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-slate-400">No recovery records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr className="border-b border-slate-800">
                    <th className="pb-4">Transaction ID</th>
                    <th className="pb-4">Recovery Action</th>
                    <th className="pb-4">Result</th>
                    <th className="pb-4">Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => (
                    <tr key={log.id} className="border-b border-slate-800/70">
                      <td className="py-5 font-semibold">{log.transaction_id}</td>
                      <td className="py-5 text-slate-400">{log.recovery_action}</td>
                      <td className="py-5">
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                          {log.result}
                        </span>
                      </td>
                      <td className="py-5 text-slate-400">
                        {new Date(log.created_at).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

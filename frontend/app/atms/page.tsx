
"use client";

import { useEffect, useState } from "react";
import {
  Building2, Wifi, WifiOff, RefreshCw,
  Banknote, MapPin, Activity, ArrowLeft, Power
} from "lucide-react";
import Link from "next/link";

const API = "http://127.0.0.1:8000";

type ATM = {
  id: number;
  atm_code: string;
  location: string;
  status: string;
  network_status: string;
  cash_balance: number;
};

export default function ATMMonitoring() {
  const [atms, setAtms] = useState<ATM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function loadATMs() {
    try {
      setError("");
      const response = await fetch(`${API}/atms`);
      if (!response.ok) throw new Error("Failed to fetch ATM records");

      const data = await response.json();
      setAtms(Array.isArray(data) ? data : data.atms || []);
    } catch {
      setError("Unable to connect to ATMGuard backend.");
    } finally {
      setLoading(false);
    }
  }

  async function changeATMStatus(atm: ATM) {
    const newStatus = atm.status === "ONLINE" ? "OFFLINE" : "ONLINE";

    const confirmed = window.confirm(
      `Are you sure you want to set ${atm.atm_code} to ${newStatus}?`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(atm.id);
      setMessage("");
      setError("");

      const response = await fetch(`${API}/atms/${atm.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to update ATM status");
      }

      setMessage(`${atm.atm_code} is now ${newStatus}.`);
      await loadATMs();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update ATM status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    loadATMs();
    const timer = setInterval(loadATMs, 10000);
    return () => clearInterval(timer);
  }, []);

  const online = atms.filter(a => a.status === "ONLINE").length;
  const offline = atms.length - online;
  const totalCash = atms.reduce(
    (sum, atm) => sum + Number(atm.cash_balance), 0
  );

  return (
    <main className="min-h-screen bg-[#080d18] p-5 text-slate-100 md:p-9">
      <div className="mx-auto max-w-7xl space-y-8">

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="mb-4 flex items-center gap-2 text-sm text-cyan-400">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold">ATM Monitoring</h1>
            <p className="mt-2 text-sm text-slate-400">
              Monitor ATM availability, network connectivity and cash balance.
            </p>
          </div>

          <button
            onClick={loadATMs}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 hover:bg-slate-800"
          >
            <RefreshCw size={17} /> Refresh
          </button>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
            {message}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total ATMs", value: atms.length, icon: Building2 },
            { label: "Online ATMs", value: online, icon: Wifi },
            { label: "Offline ATMs", value: offline, icon: WifiOff },
            {
              label: "Total Cash",
              value: `₹${totalCash.toLocaleString("en-IN")}`,
              icon: Banknote
            }
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-slate-800 bg-[#111a2b] p-5">
                <Icon className="mb-5 text-cyan-400" size={23} />
                <p className="text-sm text-slate-400">{item.label}</p>
                <h2 className="mt-2 text-2xl font-bold">{item.value}</h2>
              </div>
            );
          })}
        </section>

        <section>
          <div className="mb-5 flex items-center gap-2">
            <Activity className="text-cyan-400" />
            <h2 className="text-xl font-semibold">ATM Network</h2>
          </div>

          {loading ? (
            <p className="text-slate-400">Loading ATM records...</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {atms.map(atm => (
                <div key={atm.id} className="rounded-2xl border border-slate-800 bg-[#111a2b] p-6">
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
                      <Building2 size={24} />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      atm.status === "ONLINE"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {atm.status}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold">{atm.atm_code}</h3>

                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                    <MapPin size={15} /> {atm.location}
                  </p>

                  <div className="mt-6 border-t border-slate-800 pt-5">
                    <p className="text-xs text-slate-500">Network connectivity</p>
                    <p className={`mt-2 flex items-center gap-2 text-sm ${
                      atm.network_status === "CONNECTED"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}>
                      {atm.network_status === "CONNECTED"
                        ? <Wifi size={17} />
                        : <WifiOff size={17} />}
                      {atm.network_status}
                    </p>
                  </div>

                  <div className="mt-5 rounded-xl bg-[#0b1423] p-4">
                    <p className="text-xs text-slate-500">Available ATM cash</p>
                    <p className="mt-2 text-2xl font-bold">
                      ₹{Number(atm.cash_balance).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <button
                    onClick={() => changeATMStatus(atm)}
                    disabled={updatingId === atm.id}
                    className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      atm.status === "ONLINE"
                        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    }`}
                  >
                    <Power size={17} />
                    {updatingId === atm.id
                      ? "Updating..."
                      : atm.status === "ONLINE"
                      ? "Take Offline"
                      : "Bring Online"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && atms.length === 0 && !error && (
            <p className="text-slate-400">No ATM records found.</p>
          )}
        </section>

        <p className="text-center text-xs text-slate-600">
          ATMGuard – ATM Fault Tolerance and Transaction Recovery Platform
        </p>
      </div>
    </main>
  );
}

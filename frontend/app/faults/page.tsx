
"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft, AlertTriangle, RefreshCw,
  WifiOff, Zap, Banknote, CheckCircle2
} from "lucide-react";
import Link from "next/link";

const API = "http://127.0.0.1:8000";

type Fault = {
  id: number;
  atm_id: number;
  fault_type: string;
  description: string;
  status: string;
  created_at: string;
};

type ATM = {
  id: number;
  atm_code: string;
};

export default function FaultManagement() {
  const [faults, setFaults] = useState<Fault[]>([]);
  const [atms, setAtms] = useState<ATM[]>([]);
  const [atmCode, setAtmCode] = useState("ATM001");
  const [faultType, setFaultType] = useState("NETWORK_FAILURE");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      const [faultResponse, atmResponse] = await Promise.all([
        fetch(`${API}/faults`),
        fetch(`${API}/atms`)
      ]);

      if (!faultResponse.ok || !atmResponse.ok) {
        throw new Error("Unable to load data");
      }

      setFaults(await faultResponse.json());
      const atmData = await atmResponse.json();
      setAtms(atmData.atms);
    } catch {
      setError("Backend connection failed.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function simulateFault() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API}/faults/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          atm_code: atmCode,
          fault_type: faultType,
          description: description.trim() || faultType.replaceAll("_", " ")
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || "Fault simulation failed");

      setMessage("Fault simulated successfully.");
      setDescription("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function resolveFault(id: number) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/faults/${id}/resolve`, {
        method: "POST"
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || "Resolution failed");

      setMessage(`Fault #${id} resolved successfully.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const activeCount = faults.filter(f => f.status === "ACTIVE").length;
  const resolvedCount = faults.filter(f => f.status === "RESOLVED").length;

  return (
    <main className="min-h-screen bg-[#080d18] p-5 text-slate-100 md:p-9">
      <div className="mx-auto max-w-7xl space-y-8">

        <header>
          <Link href="/" className="mb-4 flex items-center gap-2 text-sm text-cyan-400">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Fault Management</h1>
          <p className="mt-2 text-sm text-slate-400">
            Simulate ATM faults and manage their resolution.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Faults", value: faults.length },
            { label: "Active Faults", value: activeCount },
            { label: "Resolved Faults", value: resolvedCount }
          ].map(item => (
            <div key={item.label} className="rounded-2xl border border-slate-800 bg-[#111a2b] p-5">
              <AlertTriangle className="mb-5 text-cyan-400" size={23} />
              <p className="text-sm text-slate-400">{item.label}</p>
              <h2 className="mt-2 text-2xl font-bold">{item.value}</h2>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#111a2b] p-6">
          <h2 className="text-xl font-semibold">Simulate ATM Fault</h2>
          <p className="mt-1 text-sm text-slate-400">
            Generate a controlled fault for testing.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Select ATM</label>
              <select
                value={atmCode}
                onChange={e => setAtmCode(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0b1423] p-3 outline-none"
              >
                {atms.map(atm => (
                  <option key={atm.id} value={atm.atm_code}>
                    {atm.atm_code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Fault Type</label>
              <select
                value={faultType}
                onChange={e => setFaultType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0b1423] p-3 outline-none"
              >
                <option value="NETWORK_FAILURE">Network Failure</option>
                <option value="POWER_FAILURE">Power Failure</option>
                <option value="DISPENSER_FAILURE">Cash Dispenser Failure</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm text-slate-400">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the simulated fault..."
              className="w-full rounded-xl border border-slate-700 bg-[#0b1423] p-3 outline-none"
            />
          </div>

          {message && <p className="mt-4 text-sm text-emerald-400">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <button
            onClick={simulateFault}
            disabled={loading || atms.length === 0}
            className="mt-5 flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            <AlertTriangle size={17} />
            {loading ? "Simulating..." : "Simulate Fault"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#111a2b] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Fault History</h2>
              <p className="mt-1 text-sm text-slate-400">Recorded ATM faults</p>
            </div>
            <button onClick={loadData} className="rounded-lg border border-slate-700 p-3 hover:bg-slate-800" aria-label="Refresh faults">
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {faults.map(fault => (
              <div key={fault.id} className="flex flex-col justify-between gap-4 rounded-xl bg-[#0b1423] p-4 md:flex-row md:items-center">
                <div>
                  <p className="font-semibold">
                    Fault #{fault.id} · {fault.fault_type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    ATM ID: {fault.atm_id} · {fault.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(fault.created_at).toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs ${
                    fault.status === "ACTIVE"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {fault.status}
                  </span>

                  {fault.status === "ACTIVE" && (
                    <button
                      onClick={() => resolveFault(fault.id)}
                      className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}

            {faults.length === 0 && (
              <p className="py-8 text-center text-slate-500">
                No faults recorded yet.
              </p>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-slate-600">
          ATMGuard – Fault Detection and Management
        </p>
      </div>
    </main>
  );
}

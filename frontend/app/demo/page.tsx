"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Play, RefreshCw, ShieldCheck, Wifi, Zap } from "lucide-react";

const API = "http://127.0.0.1:8000";
type EventItem = { stage: string; message: string; timestamp: string };
type DemoStatus = {
  running: boolean; run_id: string | null; stage: string; message: string;
  fault_id: number | null; fault_type: string | null; affected_atm: string | null;
  failover_atm: string | null; transaction_id: string | null;
  repair_delay_seconds: number | null; events: EventItem[];
};
type ATM = { atm_code: string; status: string; network_status: string; cash_balance: number };

const initialStatus: DemoStatus = {
  running: false, run_id: null, stage: "IDLE", message: "Ready to run a demo.",
  fault_id: null, fault_type: null, affected_atm: null, failover_atm: null,
  transaction_id: null, repair_delay_seconds: null, events: []
};

export default function AutomatedDemoPage() {
  const [status, setStatus] = useState<DemoStatus>(initialStatus);
  const [atms, setAtms] = useState<ATM[]>([]);
  const [atmCode, setAtmCode] = useState("ATM001");
  const [faultType, setFaultType] = useState("NETWORK_FAILURE");
  const [amount, setAmount] = useState("1000");
  const [delay, setDelay] = useState("15");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [s, a] = await Promise.all([fetch(`${API}/demo/status`), fetch(`${API}/atms`)]);
      if (s.ok) setStatus(await s.json());
      if (a.ok) {
        const data = await a.json();
        setAtms(Array.isArray(data) ? data : data.atms || []);
      }
    } catch { setError("Cannot reach backend. Start FastAPI on port 8000."); }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 1500);
    return () => clearInterval(timer);
  }, []);

  async function startDemo() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${API}/demo/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atm_code: atmCode, fault_type: faultType, amount: Number(amount), repair_delay_seconds: Number(delay) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not start demo");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Demo failed"); }
    finally { setBusy(false); }
  }

  async function resetDemo() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${API}/demo/reset`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Cannot reset demo");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Reset failed"); }
    finally { setBusy(false); }
  }

  const stageLabel = status.stage.replaceAll("_", " ");
  const done = status.stage === "COMPLETED";

  return (
    <main className="min-h-screen bg-[#080d18] p-5 text-slate-100 md:p-9">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="mb-3 flex items-center gap-2 text-sm text-cyan-400"><ArrowLeft size={16}/> Back to Dashboard</Link>
            <h1 className="text-3xl font-bold">Automated Fault-Tolerance Demo</h1>
            <p className="mt-2 text-sm text-slate-400">Live simulation of fault detection, ATM isolation, transaction failover and automatic repair.</p>
          </div>
          <button onClick={refresh} className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 hover:bg-slate-800"><RefreshCw size={16}/> Refresh</button>
        </header>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-[#111a2b] p-5"><Activity className="mb-4 text-cyan-400"/><p className="text-sm text-slate-400">Current stage</p><p className="mt-2 text-xl font-bold">{stageLabel}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-[#111a2b] p-5"><AlertTriangle className="mb-4 text-amber-400"/><p className="text-sm text-slate-400">Affected ATM</p><p className="mt-2 text-xl font-bold">{status.affected_atm || "—"}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-[#111a2b] p-5"><ShieldCheck className="mb-4 text-emerald-400"/><p className="text-sm text-slate-400">Failover ATM</p><p className="mt-2 text-xl font-bold">{status.failover_atm || "Not assigned"}</p></div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-[#111a2b] p-6">
            <h2 className="text-xl font-semibold">Configure scenario</h2>
            <p className="mt-1 text-sm text-slate-400">Choose an ATM and inject one simulated fault.</p>
            <label className="mt-5 block text-sm text-slate-300">Affected ATM</label>
            <select value={atmCode} onChange={e=>setAtmCode(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#0b1423] p-3">
              {atms.map(a=><option key={a.atm_code} value={a.atm_code}>{a.atm_code} — {a.status}</option>)}
            </select>
            <label className="mt-4 block text-sm text-slate-300">Fault type</label>
            <select value={faultType} onChange={e=>setFaultType(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#0b1423] p-3">
              <option value="NETWORK_FAILURE">Network failure</option><option value="POWER_FAILURE">Power failure</option><option value="DISPENSER_FAILURE">Dispenser failure</option>
            </select>
            <label className="mt-4 block text-sm text-slate-300">Withdrawal amount (₹)</label>
            <input type="number" min="100" step="100" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#0b1423] p-3"/>
            <label className="mt-4 block text-sm text-slate-300">Automatic repair delay (seconds)</label>
            <input type="number" min="5" max="120" value={delay} onChange={e=>setDelay(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#0b1423] p-3"/>
            <button onClick={startDemo} disabled={busy || status.running || atms.length===0 || Number(amount)<=0 || Number(delay)<5 || Number(delay)>120} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-40"><Play size={17}/>{busy ? "Starting..." : status.running ? "Demo Running..." : "Start Automated Demo"}</button>
            <button onClick={resetDemo} disabled={busy || status.running} className="mt-3 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40">Reset demo panel</button>
            <p className="mt-4 text-xs leading-5 text-slate-500">This is a software simulation. Automatic repair represents a simulated recovery event, not physical ATM repair.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#111a2b] p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Live event timeline</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${done ? "bg-emerald-500/10 text-emerald-400" : status.running ? "bg-amber-500/10 text-amber-300" : "bg-slate-700 text-slate-300"}`}>{done ? "COMPLETED" : status.running ? "RUNNING" : "IDLE"}</span></div>
            <p className="mt-2 text-sm text-slate-400">{status.message}</p>
            <div className="mt-6 space-y-4">
              {status.events.length===0 ? <div className="rounded-xl bg-[#0b1423] p-5 text-sm text-slate-500">No events yet. Start a demo to see the automated workflow.</div> : status.events.map((event,i)=>(
                <div key={`${event.timestamp}-${i}`} className="flex gap-3 rounded-xl bg-[#0b1423] p-4">
                  <div className="mt-0.5 text-cyan-400">{event.stage.includes("COMPLETED") ? <CheckCircle2 size={19}/> : event.stage.includes("REPAIR") ? <Zap size={19}/> : event.stage.includes("WAITING") ? <Clock3 size={19}/> : <Activity size={19}/>}</div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{event.stage.replaceAll("_"," ")}</p><p className="mt-1 text-sm text-slate-400">{event.message}</p><p className="mt-2 text-xs text-slate-600">{event.timestamp}</p></div>
                </div>
              ))}
            </div>
            {status.transaction_id && <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-xs text-emerald-300">Failover transaction</p><p className="mt-1 font-mono text-sm">{status.transaction_id}</p><p className="mt-1 text-xs text-slate-400">Status: committed on {status.failover_atm}</p></div>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#111a2b] p-6">
          <div className="mb-4 flex items-center gap-2"><Wifi className="text-cyan-400"/><h2 className="text-lg font-semibold">ATM network status</h2></div>
          <div className="grid gap-3 md:grid-cols-3">{atms.map(a=><div key={a.atm_code} className="rounded-xl bg-[#0b1423] p-4"><div className="flex items-center justify-between"><p className="font-semibold">{a.atm_code}</p><span className={`text-xs font-semibold ${a.status==="ONLINE"?"text-emerald-400":"text-red-400"}`}>{a.status}</span></div><p className="mt-2 text-xs text-slate-400">Network: {a.network_status}</p><p className="mt-1 text-xs text-slate-500">Cash: ₹{Number(a.cash_balance).toLocaleString("en-IN")}</p></div>)}</div>
        </section>
      </div>
    </main>
  );
}

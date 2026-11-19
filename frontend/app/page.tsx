
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  Activity,
  Banknote,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  ShieldCheck,
  XCircle,
  TrendingUp,
  Workflow
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const API = "http://127.0.0.1:8000";

type ATM = {
  id: number;
  atm_code: string;
  location: string;
  status: string;
  network_status: string;
  cash_balance: number;
};

type Transaction = {
  id: number;
  transaction_id: string;
  atm_code: string;
  amount: number;
  status: string;
  created_at: string;
};

type Fault = {
  id: number;
  atm_id: number;
  fault_type: string;
  description: string;
  status: string;
  created_at: string;
};

type Recovery = {
  id: number;
  transaction_id: string;
  recovery_action: string;
  result: string;
};

const navigation = [
  { label: "Dashboard", href: "/", icon: Activity },
  { label: "ATM Monitoring", href: "/atms", icon: Building2 },
  { label: "Transactions", href: "/transactions", icon: Banknote },
  { label: "Fault Management", href: "/faults", icon: AlertTriangle },
  { label: "Recovery Logs", href: "/recovery", icon: RefreshCw },
  { label: "Automated Demo", href: "/demo", icon: Workflow },
];

const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#8b5cf6"];

export default function Home() {
  const [atms, setAtms] = useState<ATM[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadDashboard() {
    try {
      setError("");

      const [atmRes, txnRes, faultRes, recoveryRes] = await Promise.all([
        fetch(`${API}/atms`),
        fetch(`${API}/transactions`),
        fetch(`${API}/faults`),
        fetch(`${API}/recovery/logs`)
      ]);

      if (!atmRes.ok || !txnRes.ok || !faultRes.ok || !recoveryRes.ok) {
        throw new Error("Unable to fetch dashboard data");
      }

      const [atmData, txnData, faultData, recoveryData] =
        await Promise.all([
          atmRes.json(),
          txnRes.json(),
          faultRes.json(),
          recoveryRes.json()
        ]);

      setAtms(Array.isArray(atmData) ? atmData : atmData.atms || []);
      setTransactions(Array.isArray(txnData) ? txnData : txnData.transactions || []);
      setFaults(Array.isArray(faultData) ? faultData : []);
      setRecoveries(Array.isArray(recoveryData) ? recoveryData : []);
      setLastUpdated(new Date().toLocaleTimeString("en-IN"));
    } catch (err) {
      console.error(err);
      setError("Backend connection failed. Please check FastAPI.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(loadDashboard, 10000);
    return () => clearInterval(timer);
  }, []);

  const totalCash = atms.reduce(
    (sum, atm) => sum + Number(atm.cash_balance || 0), 0
  );

  const committed = transactions.filter(t => t.status === "COMMITTED").length;
  const failed = transactions.filter(t => t.status === "FAILED").length;
  const pending = transactions.filter(
    t => t.status === "PENDING" || t.status === "HELD"
  ).length;

  const online = atms.filter(
    a => a.status === "ONLINE" && a.network_status === "CONNECTED"
  ).length;

  const activeFaults = faults.filter(f => f.status === "ACTIVE").length;

  const totalWithdrawn = transactions
    .filter(t => t.status === "COMMITTED")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const chartData = [
    { name: "Successful", value: committed },
    { name: "Failed", value: failed },
    { name: "Pending / Held", value: pending }
  ].filter(item => item.value > 0);

  const cashData = atms.map(atm => ({
    name: atm.atm_code,
    cash: Number(atm.cash_balance)
  }));

  const stats = [
    {
      label: "Total ATMs",
      value: atms.length,
      icon: Building2,
      color: "text-cyan-400"
    },
    {
      label: "Successful Transactions",
      value: committed,
      icon: CheckCircle2,
      color: "text-emerald-400"
    },
    {
      label: "Failed Transactions",
      value: failed,
      icon: XCircle,
      color: "text-red-400"
    },
    {
      label: "Total ATM Cash",
      value: `₹${totalCash.toLocaleString("en-IN")}`,
      icon: Banknote,
      color: "text-violet-400"
    },
    {
      label: "Online ATMs",
      value: `${online} / ${atms.length}`,
      icon: Wifi,
      color: "text-emerald-400"
    },
    {
      label: "Active Faults",
      value: activeFaults,
      icon: AlertTriangle,
      color: "text-amber-400"
    },
    {
      label: "Recovery Records",
      value: recoveries.length,
      icon: ShieldCheck,
      color: "text-cyan-400"
    },
    {
      label: "Total Withdrawn",
      value: `₹${totalWithdrawn.toLocaleString("en-IN")}`,
      icon: TrendingUp,
      color: "text-emerald-400"
    }
  ];

  return (
    <main className="min-h-screen bg-[#080d18] text-slate-100">

      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-800 bg-[#0c1322] p-6 lg:block">
        <div className="mb-12 flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500 p-2 text-slate-950">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">ATMGuard</h1>
            <p className="text-xs text-slate-500">Fault Tolerance System</p>
          </div>
        </div>

        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Main Menu
        </p>

        <nav className="space-y-2">
          {navigation.map(item => {
            const Icon = item.icon;
            const active = item.href === "/";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  active
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <ShieldCheck size={18} />
            System Monitoring
          </div>
          <p className="mt-2 text-xs text-slate-500">ATMGuard v1.0</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <section className="lg:ml-64">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-5 py-5 md:px-9">
          <div>
            <p className="text-sm text-slate-500">ATMGuard / Overview</p>
            <h2 className="mt-1 text-2xl font-bold">Analytics Dashboard</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 sm:block">
              Updated: {lastUpdated || "Loading"}
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <button
              onClick={loadDashboard}
              className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800"
              aria-label="Refresh dashboard"
            >
              <RefreshCw size={19} />
            </button>
          </div>
        </header>

        <div className="space-y-8 p-5 md:p-9">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-slate-400">Loading analytics...</p>
          ) : (
            <>
              {/* KPI CARDS */}
              <section>
                <h3 className="mb-4 text-lg font-semibold">System Overview</h3>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map(item => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-slate-800 bg-[#111a2b] p-5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-400">{item.label}</p>
                          <Icon size={22} className={item.color} />
                        </div>
                        <h3 className="mt-5 text-2xl font-bold">{item.value}</h3>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* CHARTS */}
              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-[#111a2b] p-6">
                  <h3 className="font-semibold">Transaction Performance</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Distribution by transaction status
                  </p>

                  <div className="mt-5 h-72">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="48%"
                            outerRadius={90}
                            label
                          >
                            {chartData.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#111a2b",
                              border: "1px solid #334155",
                              borderRadius: "10px"
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-500">
                        No transaction data available
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#111a2b] p-6">
                  <h3 className="font-semibold">ATM Cash Distribution</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Available cash balance by ATM
                  </p>

                  <div className="mt-5 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#263449" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis
                          stroke="#94a3b8"
                          tickFormatter={value => `₹${Number(value) / 1000}k`}
                        />
                        <Tooltip
                          formatter={value => [
                            `₹${Number(value).toLocaleString("en-IN")}`,
                            "Cash Balance"
                          ]}
                          contentStyle={{
                            backgroundColor: "#111a2b",
                            border: "1px solid #334155",
                            borderRadius: "10px"
                          }}
                        />
                        <Bar
                          dataKey="cash"
                          fill="#06b6d4"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* ATM MONITORING AND FAULTS */}
              <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-[#111a2b] p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">ATM Network Monitoring</h3>
                    <Link href="/atms" className="text-xs text-cyan-400 hover:underline">
                      View all
                    </Link>
                  </div>

                  <div className="mt-5 space-y-4">
                    {atms.map(atm => (
                      <div
                        key={atm.id}
                        className="flex items-center justify-between rounded-xl bg-[#0b1423] p-4"
                      >
                        <div>
                          <p className="font-semibold">{atm.atm_code}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {atm.location}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`flex items-center justify-end gap-2 text-sm ${
                            atm.status === "ONLINE" &&
                            atm.network_status === "CONNECTED"
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}>
                            {atm.status === "ONLINE" &&
                            atm.network_status === "CONNECTED"
                              ? <Wifi size={16} />
                              : <WifiOff size={16} />}
                            {atm.status}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {atm.network_status}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            ₹{Number(atm.cash_balance).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#111a2b] p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Fault Monitoring</h3>
                    <Link href="/faults" className="text-xs text-cyan-400 hover:underline">
                      Manage faults
                    </Link>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-red-500/10 p-5">
                      <AlertTriangle className="text-red-400" size={22} />
                      <p className="mt-3 text-sm text-slate-400">Active Faults</p>
                      <p className="mt-2 text-2xl font-bold text-red-400">
                        {activeFaults}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-500/10 p-5">
                      <ShieldCheck className="text-emerald-400" size={22} />
                      <p className="mt-3 text-sm text-slate-400">Resolved Faults</p>
                      <p className="mt-2 text-2xl font-bold text-emerald-400">
                        {faults.filter(f => f.status === "RESOLVED").length}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-[#0b1423] p-5">
                    <p className="text-sm text-slate-400">Recovery Records</p>
                    <p className="mt-2 text-2xl font-bold text-cyan-400">
                      {recoveries.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Recorded transaction reconciliation activities
                    </p>
                    <Link
                      href="/recovery"
                      className="mt-4 inline-block text-sm text-cyan-400 hover:underline"
                    >
                      View recovery logs →
                    </Link>
                  </div>
                </div>
              </section>

              {/* RECENT TRANSACTIONS */}
              <section className="rounded-2xl border border-slate-800 bg-[#111a2b] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Recent Transactions</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Latest ATM activity
                    </p>
                  </div>
                  <Link href="/transactions" className="text-xs text-cyan-400 hover:underline">
                    View all
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr className="border-b border-slate-800">
                        <th className="pb-4">Transaction ID</th>
                        <th className="pb-4">ATM</th>
                        <th className="pb-4">Amount</th>
                        <th className="pb-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 8).map(txn => (
                        <tr key={txn.id} className="border-b border-slate-800/70">
                          <td className="py-4 font-medium">{txn.transaction_id}</td>
                          <td className="py-4 text-slate-400">{txn.atm_code || "—"}</td>
                          <td className="py-4">
                            ₹{Number(txn.amount).toLocaleString("en-IN")}
                          </td>
                          <td className="py-4">
                            <span className={`rounded-full px-3 py-1 text-xs ${
                              txn.status === "COMMITTED"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : txn.status === "FAILED"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}>
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-500">
                            No transactions recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <p className="text-center text-xs text-slate-600">
                ATMGuard – ATM Fault Tolerance and Transaction Recovery Platform
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
  
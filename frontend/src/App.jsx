import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Search, TrendingUp, TrendingDown, Activity, Zap, Database, AlertCircle, Loader2, Moon } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetches market data. On the free hosting tier the backend sleeps after
// inactivity, so the first request can fail or hang while it wakes up. We
// retry those transient failures (signalling onWaking) but surface genuine
// application errors (rate limit, invalid symbol) immediately.
async function fetchMarket(symbol, onWaking) {
  const maxAttempts = 10;
  const delayMs = 5000;
  let lastErr = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(`${API_BASE}/api/market/${symbol}`);
    } catch (e) {
      // Network error: server is likely waking up
      if (onWaking) onWaking();
      lastErr = new Error("Could not reach the server.");
      await sleep(delayMs);
      continue;
    }

    if (res.ok) {
      return await res.json();
    }

    // Try to read a structured error from our own API
    let body = null;
    try {
      body = await res.json();
    } catch (e) {}

    if (body && typeof body.detail === "string") {
      // Genuine application error (rate limit, invalid symbol): do not retry
      throw new Error(body.detail);
    }

    // Unstructured response (e.g. a cold-start gateway page): treat as waking
    if (onWaking) onWaking();
    lastErr = new Error("Server is starting up.");
    await sleep(delayMs);
  }

  throw lastErr || new Error("Could not load data. Please try again.");
}

const fmtPrice = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtVol = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n.toLocaleString());
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const CHIPS = ["AAPL", "MSFT", "IBM", "TSLA", "NVDA", "GOOGL"];
const RANGES = [{ label: "30D", days: 30 }, { label: "90D", days: 90 }, { label: "Max", days: 100 }];

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
      <p className="text-xs text-slate-500 mb-1.5 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-semibold ${accent || "text-slate-100"}`}>{value}</p>
    </div>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-slate-950/95 border border-slate-700 rounded-xl px-4 py-3 shadow-xl backdrop-blur">
      <p className="text-xs text-slate-400 mb-2">{new Date(p.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
      <p className="text-base font-semibold text-white mb-1.5">{fmtPrice(p.close)}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-400">
        <span>O {p.open.toFixed(2)}</span>
        <span>H {p.high.toFixed(2)}</span>
        <span>L {p.low.toFixed(2)}</span>
        <span>V {fmtVol(p.volume)}</span>
      </div>
    </div>
  );
}

export default function MarketDashboard() {
  const [symbol, setSymbol] = useState("AAPL");
  const [input, setInput] = useState("");
  const [rangeDays, setRangeDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState(false);
  const [error, setError] = useState(null);
  const [fullData, setFullData] = useState([]);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setWaking(false);

    fetchMarket(symbol, () => {
      if (active) setWaking(true);
    })
      .then((res) => {
        if (!active) return;
        setFullData(res.points || []);
        setCached(Boolean(res.cached));
      })
      .catch((e) => {
        if (!active) return;
        setError(e.message);
        setFullData([]);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setWaking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [symbol]);

  const data = useMemo(() => fullData.slice(-rangeDays), [fullData, rangeDays]);

  const stats = useMemo(() => {
    if (!data.length) return null;
    const latest = data[data.length - 1];
    const first = data[0];
    const change = latest.close - first.close;
    const pct = (change / first.close) * 100;
    const up = change >= 0;
    const high = Math.max(...data.map((d) => d.high));
    const low = Math.min(...data.map((d) => d.low));
    return { latest, change, pct, up, high, low };
  }, [data]);

  const submit = () => {
    const clean = input.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
    if (clean) setSymbol(clean);
    setInput("");
  };

  const accent = stats?.up ? "#34d399" : "#fb7185";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-xl">
              <Activity className="text-cyan-400" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Market Pipeline</h1>
              <p className="text-xs text-slate-500">Live daily equities data</p>
            </div>
          </div>
          {!error && !loading && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${cached ? "border-amber-500/30 bg-amber-500/5 text-amber-300" : "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"}`}>
              {cached ? <Database size={13} /> : <Zap size={13} />}
              {cached ? "Served from cache" : "Fresh from API"}
            </div>
          )}
        </div>

        {/* Search + chips + range */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Search a ticker, e.g. NVDA"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>
            <button onClick={submit} className="px-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium rounded-xl text-sm transition-colors">
              Load
            </button>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSymbol(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${symbol === c ? "bg-slate-100 text-slate-900" : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-lg p-1">
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setRangeDays(r.days)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${rangeDays === r.days ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Waking-up notice (free-tier cold start) */}
        {loading && waking && (
          <div className="bg-cyan-500/5 border border-cyan-500/30 rounded-2xl p-6 flex items-start gap-3 mb-6">
            <Moon className="text-cyan-400 mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-medium text-cyan-200 mb-1 flex items-center gap-2">
                Waking the server up
                <Loader2 className="animate-spin" size={14} />
              </p>
              <p className="text-sm text-slate-400">The backend runs on a free tier that sleeps after inactivity, so the first request can take up to a minute. Hang tight, this only happens on the first load.</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-rose-500/5 border border-rose-500/30 rounded-2xl p-6 flex items-start gap-3 mb-6">
            <AlertCircle className="text-rose-400 mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-medium text-rose-300 mb-1">Couldn't load {symbol}</p>
              <p className="text-sm text-slate-400">{error}</p>
            </div>
          </div>
        )}

        {/* Price hero */}
        {stats && !error && (
          <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold tracking-tight">{symbol}</span>
                {loading && <Loader2 className="text-cyan-400 animate-spin" size={16} />}
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold tracking-tight">{fmtPrice(stats.latest.close)}</span>
                <span className={`flex items-center gap-1 text-sm font-medium ${stats.up ? "text-emerald-400" : "text-rose-400"}`}>
                  {stats.up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {stats.up ? "+" : ""}{stats.change.toFixed(2)} ({stats.pct.toFixed(2)}%)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">over selected {rangeDays}-day window</p>
            </div>
          </div>
        )}

        {/* Loading skeleton (first load, before waking notice kicks in) */}
        {loading && !waking && !data.length && !error && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 mb-6 h-[300px] flex items-center justify-center">
            <Loader2 className="text-slate-600 animate-spin" size={28} />
          </div>
        )}

        {/* Main chart */}
        {data.length > 0 && !error && (
          <>
            <div className={`bg-slate-900/40 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-4 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => "$" + v.toFixed(0)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="close" stroke={accent} strokeWidth={2} fill="url(#fill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Volume</p>
              <ResponsiveContainer width="100%" height={70}>
                <BarChart data={data} margin={{ top: 0, right: 8, left: -8, bottom: 0 }}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: "#1e293b40" }} content={<ChartTooltip />} />
                  <Bar dataKey="volume" fill="#334155" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Stat cards */}
        {stats && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Latest Open" value={fmtPrice(stats.latest.open)} />
            <StatCard label="Range High" value={fmtPrice(stats.high)} accent="text-emerald-400" />
            <StatCard label="Range Low" value={fmtPrice(stats.low)} accent="text-rose-400" />
            <StatCard label="Latest Volume" value={fmtVol(stats.latest.volume)} />
          </div>
        )}

        <p className="text-center text-xs text-slate-600">
          Live data via the FastAPI backend. Free-tier API limits apply, so results are cached.
        </p>
      </div>
    </div>
  );
}
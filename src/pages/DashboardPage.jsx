import { useState, useRef, useEffect } from 'react';
import { useMonthlySnapshots } from '../hooks/useMonthlySnapshots';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useEvaluaties } from '../hooks/useEvaluaties';
import { useSettings } from '../hooks/useSettings';
import { format, addDays, isBefore } from 'date-fns';
import { SubLogo } from '../components/SubLogo';
import { toEurMonthly as calcEurMonthly } from '../lib/costUtils';
import { SubscriptionDetailPanel } from '../components/SubscriptionDetailPanel';
import SubscriptionModal from '../components/SubscriptionModal';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const DEPT_COLORS = [
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#a78bfa', // violet-400
  '#22d3ee', // cyan-400
  '#fbbf24', // amber-400
  '#f472b6', // pink-400
  '#818cf8', // indigo-400
  '#4ade80', // green-400
  '#38bdf8', // sky-400
  '#e879f9', // fuchsia-400
];

function useAnimated(value, duration = 450) {
  const isArr = Array.isArray(value);
  const toArr = (v) => isArr ? v : [v];
  const [animated, setAnimated] = useState(toArr(value));
  const fromRef = useRef(toArr(value));
  const rafRef = useRef(null);

  useEffect(() => {
    const from = [...fromRef.current];
    const to = toArr(value);
    const t0 = performance.now();

    const tick = (now) => {
      const t = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const next = from.map((f, i) => f + ((to[i] ?? 0) - f) * ease);
      fromRef.current = next;
      setAnimated([...next]);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [JSON.stringify(value)]);

  return isArr ? animated : animated[0];
}

// Telt smooth op naar een nieuwe waarde — voor satisfying period switches.
function AnimatedNumber({ value, format, duration = 700 }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const next = from + (to - from) * ease;
      fromRef.current = next;
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <>{format ? format(display) : Math.round(display)}</>;
}

function LineChart({ data, showTotal = true, currentMonth, months, snapshots, currentYear, chartMax, departmentData, visibleDepts, colorMap = {} }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dims, setDims] = useState({ w: 600, h: 200 });
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const { w: W, h: H } = dims;
  const padL = 48, padR = 16, padT = 16, padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const rawMax = chartMax ?? Math.max(...data, 1);
  const animMax = useAnimated(rawMax);
  const animData = useAnimated(data);
  const max = animMax;

  const x = (i) => padL + (i / 11) * innerW;
  const y = (v) => padT + innerH - (v / max) * innerH;

  const histPoints = animData
    .map((v, i) => ({ v, i }))
    .filter(p => p.i <= currentMonth);
  const forePoints = animData
    .map((v, i) => ({ v, i }))
    .filter(p => p.i >= currentMonth);

  const toPath = (points) => points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');

  // Render alle afdelingen, zichtbaarheid via opacity (voor smooth fade)
  const deptEntries = departmentData ? Object.entries(departmentData) : [];

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: 'calc(100% - 48px)', minHeight: 150 }}>
      <svg width={W} height={H} className="w-full h-full">
        {/* Y gridlines + labels */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y(max * f)} y2={y(max * f)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={padL - 6} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">€{(max * f).toFixed(0)}</text>
          </g>
        ))}

        {/* Department lines */}
        {deptEntries.map(([dept, deptData]) => {
          const color = colorMap[dept] ?? '#94a3b8';
          const visible = visibleDepts?.has(dept) ?? false;
          const allPts = deptData.map((v, i) => ({ v, i }));
          const hPts = allPts.filter(p => p.i <= currentMonth);
          const fPts = allPts.filter(p => p.i >= currentMonth);
          return (
            <g key={dept} style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.35s ease' }}>
              {hPts.length > 1 && <path d={toPath(hPts)} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
              {fPts.length > 1 && <path d={toPath(fPts)} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />}
            </g>
          );
        })}

        {/* Historical line (total) */}
        {showTotal && histPoints.length > 1 && (
          <path d={toPath(histPoints)} fill="none" stroke="#F47920" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Forecast line (dashed, total) */}
        {showTotal && forePoints.length > 1 && (
          <path d={toPath(forePoints)} fill="none" stroke="#F47920" strokeWidth="2" strokeDasharray="5,4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        )}

        {/* Statische dots */}
        {animData.map((v, i) => {
          const isFuture = i > currentMonth;
          const isCurrent = i === currentMonth;
          if (!showTotal) return null;
          return (
            <circle
              key={i}
              cx={x(i)} cy={y(v)} r={isCurrent ? 5 : 4}
              fill={isFuture ? 'white' : '#F47920'}
              stroke="#F47920" strokeWidth={isFuture ? 1.5 : 0}
              opacity={isFuture ? 0.5 : 1}
            />
          );
        })}

        {/* Active hover guideline + highlight */}
        {activeIdx !== null && (
          <g style={{ pointerEvents: 'none' }}>
            <line
              x1={x(activeIdx)} x2={x(activeIdx)}
              y1={padT} y2={padT + innerH}
              stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3"
            />
            {showTotal && (
              <circle
                cx={x(activeIdx)} cy={y(animData[activeIdx])} r="6"
                fill="#F47920" stroke="white" strokeWidth="2"
              />
            )}
            {deptEntries.map(([dept, deptData]) => {
              if (!visibleDepts?.has(dept)) return null;
              return (
                <circle
                  key={`hl-${dept}`}
                  cx={x(activeIdx)} cy={y(deptData[activeIdx] ?? 0)} r="4"
                  fill={colorMap[dept] ?? '#94a3b8'} stroke="white" strokeWidth="1.5"
                />
              );
            })}
          </g>
        )}

        {/* Month labels */}
        {months.map((m, i) => (
          <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize="10"
            fill={i === currentMonth ? '#F47920' : i === activeIdx ? '#475569' : '#94a3b8'}
            fontWeight={i === currentMonth || i === activeIdx ? '600' : '400'}
          >{m}</text>
        ))}

        {/* Single overlay voor mouse tracking */}
        <rect
          x={padL} y={padT} width={innerW} height={innerH}
          fill="transparent"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const idx = Math.max(0, Math.min(11, Math.round((mouseX / innerW) * 11)));
            setActiveIdx(idx);
            const containerRect = containerRef.current.getBoundingClientRect();
            setTooltipPos({
              x: e.clientX - containerRect.left,
              y: e.clientY - containerRect.top,
            });
          }}
          onMouseLeave={() => setActiveIdx(null)}
          style={{ cursor: 'crosshair' }}
        />
      </svg>

      {activeIdx !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-slate-900/95 backdrop-blur-sm px-3 py-2 text-xs text-white shadow-xl space-y-1.5 min-w-[160px]"
          style={(() => {
            // Smart positioning: rechts van het punt, of links als 'ie aan de rechterrand zit
            const pointX = x(activeIdx);
            const onRightSide = pointX > W * 0.65;
            return {
              left: onRightSide ? undefined : pointX + 12,
              right: onRightSide ? W - pointX + 12 : undefined,
              top: Math.max(8, Math.min(tooltipPos.y - 16, H - 100)),
            };
          })()}
        >
          <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{months[activeIdx]}</div>
          {showTotal && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 bg-primary" />
              <span className="text-slate-300 flex-1">Totaal</span>
              <span className="font-semibold tabular-nums">€{Math.round(data[activeIdx] ?? 0).toLocaleString('nl-NL')}</span>
            </div>
          )}
          {deptEntries
            .filter(([dept]) => visibleDepts?.has(dept))
            .map(([dept, deptData]) => (
              <div key={dept} className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorMap[dept] ?? '#94a3b8' }} />
                <span className="text-slate-300 flex-1">{dept}</span>
                <span className="font-medium tabular-nums">€{Math.round(deptData[activeIdx] ?? 0).toLocaleString('nl-NL')}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// Modern, sleek metric card — Linear/Vercel-inspired
function MetricCard({ label, value, hint, trend, large = false, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 flex flex-col">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className={`font-bold text-slate-900 tabular-nums leading-none ${large ? 'text-4xl' : 'text-2xl'}`}>{value}</p>
        {trend}
      </div>
      {hint && <p className={`text-xs text-slate-400 ${large ? 'mt-2' : 'mt-1'}`}>{hint}</p>}
      {children}
    </div>
  );
}

// Trend pill — voor cashflow geldt: omhoog = duurder = rood, omlaag = goedkoper = groen
function TrendBadge({ change, invertColor = false }) {
  if (change === null || change === undefined || !isFinite(change)) return null;
  const positive = change > 0.5;
  const negative = change < -0.5;
  const Icon = positive ? ArrowTrendingUpIcon : negative ? ArrowTrendingDownIcon : null;
  let color = 'text-slate-500 bg-slate-100';
  if (positive) color = invertColor ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50';
  if (negative) color = invertColor ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color} px-1.5 py-0.5 rounded-md`}>
      {Icon && <Icon className="h-3 w-3" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

// Compacte sub-rij met logo + naam + waarde aan de rechter kant
function CompactSubRow({ sub, primary, secondary, onClick, accent = 'default' }) {
  const accents = {
    default: 'hover:bg-slate-50',
    danger:  'hover:bg-red-50',
    warn:    'hover:bg-orange-50',
  };
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${accents[accent]}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SubLogo vendor={sub.vendor} name={sub.name} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{sub.name}</p>
          <p className="text-xs text-slate-400 truncate">{sub.vendor || '—'}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-3">
        {primary}
        {secondary}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { subscriptions, loading: subsLoading, updateSubscription, deleteSubscription, refetch } = useSubscriptions();
  const { snapshots } = useMonthlySnapshots();
  const { evaluaties, loading: evalLoading } = useEvaluaties();
  const { exchangeRates, categories, types, departments: settingDepartments, addCategory, addType, addDepartment } = useSettings();
  const [detailSub, setDetailSub] = useState(null);
  const [editingSub, setEditingSub] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [windowStart, setWindowStart] = useState(new Date().getFullYear() - 1);
  const [categoryPeriod, setCategoryPeriod] = useState('maand');
  const [breakdownMode, setBreakdownMode] = useState('afdeling');
  const [legendOpen, setLegendOpen] = useState(false);
  const [visibleDepts, setVisibleDepts] = useState(null); // null = nog niet geïnitialiseerd
  const [showTotalLine, setShowTotalLine] = useState(true);

  const handleEdit = (sub) => { setDetailSub(null); setEditingSub(sub); setModalOpen(true); };
  const handleDelete = async (id) => {
    if (confirm('Weet je zeker dat je dit abonnement wilt verwijderen?')) {
      await deleteSubscription(id);
      setDetailSub(null);
    }
  };
  const handleSave = async (subData) => {
    const result = await updateSubscription(editingSub.id, subData);
    setModalOpen(false);
    setTimeout(() => refetch(), 100);
    return result;
  };

  const toEurMonthly = (sub) => calcEurMonthly(sub, exchangeRates);

  const isActiveInMonth = (sub, year, month) => {
    const monthStart = new Date(year, month, 1);
    // Zonder auto-verlenging stopt het abonnement op de vervaldatum
    if (!sub.auto_renew && sub.renewal_date && new Date(sub.renewal_date) < monthStart) return false;
    return true;
  };

  if (subsLoading || evalLoading) return <div className="p-6">Loading...</div>;

  const activeSubs = subscriptions.filter(s => s.status === 'actief');
  const totalMonthlyCost = activeSubs.reduce((sum, s) => sum + toEurMonthly(s), 0);
  const totalYearlyCost = totalMonthlyCost * 12;
  const foreignCurrencies = [...new Set(activeSubs.map(s => s.currency).filter(c => c && c !== 'EUR'))];
  const hasForeignCurrency = foreignCurrencies.length > 0;
  const ratesLabel = foreignCurrencies.map(c => `${c} ${exchangeRates[c] ?? '?'}`).join(', ');

  const now = new Date();
  const sixtyDays = addDays(now, 60);
  const expiringSoonList = activeSubs
    .filter(s => {
      if (s.auto_renew) return false;
      return s.renewal_date && isBefore(new Date(s.renewal_date), sixtyDays);
    })
    .sort((a, b) => new Date(a.renewal_date) - new Date(b.renewal_date));

  const vierMaandenGeleden = new Date();
  vierMaandenGeleden.setMonth(vierMaandenGeleden.getMonth() - 4);
  const verouderdCount = evaluaties.filter(e => new Date(e.updated_at) < vierMaandenGeleden).length;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const MONTHS = ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];

  const minYear = Math.min(...snapshots.map(s => s.year), currentYear);
  const visibleYears = [windowStart, windowStart + 1, windowStart + 2];

  const selectedCashflow = Array(12).fill(0).map((_, m) => {
    // Huidige maand altijd live berekenen (snapshot kan verouderd/leeg zijn)
    if (selectedYear === currentYear && m === currentMonth) {
      return activeSubs
        .filter(sub => isActiveInMonth(sub, selectedYear, m))
        .reduce((sum, sub) => sum + toEurMonthly(sub), 0);
    }
    const snapshot = snapshots.find(s => s.year === selectedYear && s.month === m);
    if (snapshot) return snapshot.total_cost;
    if (selectedYear > currentYear || (selectedYear === currentYear && m > currentMonth)) {
      return activeSubs
        .filter(sub => isActiveInMonth(sub, selectedYear, m))
        .reduce((sum, sub) => sum + toEurMonthly(sub), 0);
    }
    return 0;
  });

  // Map van sub-id naar huidige afdeling — fallback voor oude snapshots zonder dept-veld
  const subDeptMap = Object.fromEntries(subscriptions.map(s => [s.id, s.department || 'Geen afdeling']));

  const allDepts = [...new Set([
    ...activeSubs.map(s => s.department || 'Geen afdeling'),
    ...snapshots.flatMap(s => (s.details || []).map(d => d.department || subDeptMap[d.id] || 'Geen afdeling')),
  ])].sort();

  const departmentCashflow = Object.fromEntries(
    allDepts.map(dept => [
      dept,
      Array(12).fill(0).map((_, m) => {
        const snapshot = snapshots.find(s => s.year === selectedYear && s.month === m);
        // Gebruik snapshot dept-data alleen als de details expliciet dept-info bevatten
        if (snapshot?.details?.some(d => d.department != null)) {
          return snapshot.details
            .filter(d => (d.department || 'Geen afdeling') === dept)
            .reduce((sum, d) => sum + (d.monthly_equivalent || 0), 0);
        }
        // Geen (betrouwbare) dept-data in snapshot → bereken uit huidige abonnementen
        return activeSubs
          .filter(s => (s.department || 'Geen afdeling') === dept && isActiveInMonth(s, selectedYear, m))
          .reduce((sum, s) => sum + toEurMonthly(s), 0);
      })
    ])
  );

  const deptColorMap = Object.fromEntries(allDepts.map((dept, idx) => [dept, DEPT_COLORS[idx % DEPT_COLORS.length]]));
  const effectiveVisibleDepts = legendOpen ? (visibleDepts ?? new Set(allDepts)) : new Set();

  const chartMax = Math.max(
    ...(showTotalLine ? selectedCashflow : [0]),
    ...Object.entries(departmentCashflow)
      .filter(([dept]) => effectiveVisibleDepts.has(dept))
      .flatMap(([, data]) => data),
    1
  );

  const handleToggleLegend = () => {
    if (!legendOpen && visibleDepts === null) setVisibleDepts(new Set(allDepts));
    setLegendOpen(v => !v);
  };

  const toggleDept = (dept) => setVisibleDepts(prev => {
    const next = new Set(prev ?? allDepts);
    next.has(dept) ? next.delete(dept) : next.add(dept);
    return next;
  });

  const effectiveDepts = visibleDepts ?? new Set(allDepts);
  const allChecked = showTotalLine && allDepts.every(d => effectiveDepts.has(d));
  const toggleAll = () => {
    if (allChecked) { setVisibleDepts(new Set()); setShowTotalLine(false); }
    else { setVisibleDepts(new Set(allDepts)); setShowTotalLine(true); }
  };

  const CATEGORY_PERIODS = [
    { key: 'maand',    label: 'Maand',    factor: 1 },
    { key: 'kwartaal', label: 'Kwartaal', factor: 3 },
    { key: 'jaar',     label: 'Jaar',     factor: 12 },
  ];
  const categoryFactor = CATEGORY_PERIODS.find(p => p.key === categoryPeriod)?.factor ?? 1;

  const categoryCosts = {};
  activeSubs.forEach(s => {
    const cat = s.category || 'Overig';
    categoryCosts[cat] = (categoryCosts[cat] || 0) + toEurMonthly(s) * categoryFactor;
  });
  const sortedCategories = Object.entries(categoryCosts).sort((a, b) => b[1] - a[1]);

  const departmentCosts = {};
  activeSubs.forEach(s => {
    const dept = s.department || 'Geen afdeling';
    departmentCosts[dept] = (departmentCosts[dept] || 0) + toEurMonthly(s) * categoryFactor;
  });
  const sortedDepartments = Object.entries(departmentCosts).sort((a, b) => b[1] - a[1]);

  const breakdownRows = breakdownMode === 'categorie' ? sortedCategories : sortedDepartments;
  const maxCost = breakdownRows[0]?.[1] ?? 1;

  // Month-over-month trend: vergelijk huidige maand met vorige maand
  const prevMonthIdx = currentMonth - 1;
  const prevYear = prevMonthIdx < 0 ? currentYear - 1 : currentYear;
  const prevMonthNum = prevMonthIdx < 0 ? 11 : prevMonthIdx;
  const prevSnap = snapshots.find(s => s.year === prevYear && s.month === prevMonthNum);
  const prevMonthCost = prevSnap ? Number(prevSnap.total_cost) : 0;
  const momChange = prevMonthCost > 0
    ? ((totalMonthlyCost - prevMonthCost) / prevMonthCost) * 100
    : null;

  // Top 5 duurste actieve abonnementen
  const topSpenders = [...activeSubs]
    .map(s => ({ sub: s, monthly: toEurMonthly(s) }))
    .filter(x => x.monthly > 0)
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 5);
  const topSpendersMax = topSpenders[0]?.monthly ?? 1;

  const unusedSubs = activeSubs
    .map(sub => ({ sub, ev: evaluaties.find(e => e.subscription_id === sub.id) }))
    .filter(({ ev }) => ev && ev.usage_pct <= 30)
    .sort((a, b) => a.ev.usage_pct - b.ev.usage_pct);

  if (subscriptions.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="bg-white rounded-2xl border border-slate-200/70 p-16 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Welkom bij Flexurity Abonnementenbeheer</h2>
          <p className="text-sm text-slate-500 mt-3 max-w-md mx-auto">
            Voeg je eerste abonnement toe — kosten, gebruik en verlopingsinzichten verschijnen automatisch.
          </p>
          <a href="#/subscriptions" className="btn-primary text-sm mt-6 inline-flex items-center gap-1">
            Naar Abonnementen <ChevronRightIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  // Helper voor euro formatting met tabular nums
  const fmtEur = (v) => `€${v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtEurNoDec = (v) => `€${v.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* KPI rij — minimal, modern */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Maandkosten"
          value={fmtEur(totalMonthlyCost)}
          large
          trend={momChange !== null ? <TrendBadge change={momChange} /> : null}
          hint={
            momChange !== null
              ? `${momChange >= 0 ? '+' : ''}${(totalMonthlyCost - prevMonthCost).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t.o.v. vorige maand`
              : hasForeignCurrency ? `incl. ${ratesLabel}` : 'Eerste maand'
          }
        />
        <MetricCard
          label="Jaarkosten"
          value={fmtEurNoDec(totalYearlyCost)}
          hint={hasForeignCurrency ? `incl. ${ratesLabel}` : 'op basis van huidige actieve subs'}
        />
        <MetricCard
          label="Actieve abonnementen"
          value={activeSubs.length}
          hint={`${subscriptions.length - activeSubs.length} inactief`}
        />
        <MetricCard
          label="Verouderde evaluaties"
          value={verouderdCount}
          hint={verouderdCount === 0 ? 'Alles up-to-date' : 'ouder dan 4 maanden'}
        />
      </div>

      {/* Cost breakdown widget — boven de chart */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verdeling</p>
            <h2 className="text-base font-semibold text-slate-900 mt-0.5">Per {breakdownMode === 'categorie' ? 'categorie' : 'afdeling'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setBreakdownMode('afdeling')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${breakdownMode === 'afdeling' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Afdeling
              </button>
              <button
                onClick={() => setBreakdownMode('categorie')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${breakdownMode === 'categorie' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Categorie
              </button>
            </div>
            <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
              {CATEGORY_PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setCategoryPeriod(p.key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${categoryPeriod === p.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {breakdownRows.length === 0 ? (
          <p className="text-sm text-slate-400">Nog geen data.</p>
        ) : (
          <div className="space-y-3">
            {breakdownRows.map(([label, cost]) => {
              const color = breakdownMode === 'afdeling'
                ? (deptColorMap[label] ?? '#F47920')
                : '#F47920';
              const widthPct = (cost / maxCost) * 100;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      {breakdownMode === 'afdeling' && (
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      )}
                      <span className="font-medium">{label}</span>
                    </span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      €<AnimatedNumber value={cost} format={(v) => Math.round(v).toLocaleString('nl-NL')} />
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: color,
                        transition: 'width 700ms cubic-bezier(0.33, 1, 0.68, 1)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cashflow grafiek */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cashflow</p>
            <h2 className="text-base font-semibold text-slate-900 mt-0.5">Maandkosten {selectedYear}</h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setWindowStart(w => Math.max(w - 1, minYear))}
                disabled={windowStart <= minYear}
                className="px-2 py-1 rounded-md text-sm text-slate-400 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >‹</button>
              {visibleYears.map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${selectedYear === y ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {y}
                </button>
              ))}
              <button
                onClick={() => setWindowStart(w => w + 1)}
                className="px-2 py-1 rounded-md text-sm text-slate-400 hover:bg-white hover:shadow-sm transition-all"
              >›</button>
            </div>
            <button
              onClick={handleToggleLegend}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${legendOpen ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <span className="flex gap-0.5">
                {DEPT_COLORS.slice(0, 3).map(c => <span key={c} className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />)}
              </span>
              Afdelingen
            </button>
          </div>
        </div>

        {legendOpen && (
          <div className="mb-4 p-3 bg-slate-50/70 rounded-xl flex flex-wrap gap-x-5 gap-y-2 items-center border border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-xs font-semibold text-slate-500">Alles</span>
            </label>
            <div className="w-px h-4 bg-slate-200" />
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showTotalLine}
                onChange={() => setShowTotalLine(v => !v)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="inline-block w-4 h-0.5 rounded bg-primary" />
              <span className="text-xs text-slate-600 font-medium">Totaal</span>
            </label>
            {allDepts.map((dept) => {
              const color = deptColorMap[dept];
              const checked = effectiveVisibleDepts.has(dept);
              return (
                <label key={dept} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDept(dept)}
                    className="rounded border-gray-300 focus:ring-primary"
                    style={{ accentColor: color }}
                  />
                  <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: color }} />
                  <span className="text-xs text-slate-600">{dept}</span>
                </label>
              );
            })}
          </div>
        )}

        <LineChart
          data={selectedCashflow}
          showTotal={showTotalLine}
          currentMonth={selectedYear === currentYear ? currentMonth : (selectedYear < currentYear ? 11 : -1)}
          months={MONTHS}
          snapshots={snapshots}
          currentYear={selectedYear}
          chartMax={chartMax}
          departmentData={departmentCashflow}
          visibleDepts={effectiveVisibleDepts}
          colorMap={deptColorMap}
        />
      </div>

      {/* Bottom row — Top duurste + Verloopt + Weinig gebruikt */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Top 5 duurste */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Top 5 duurste</p>
              <h2 className="text-base font-semibold text-slate-900 mt-0.5">Hoogste maandkosten</h2>
            </div>
          </div>
          {topSpenders.length === 0 ? (
            <p className="text-sm text-slate-400">Nog geen data.</p>
          ) : (
            <div className="space-y-3">
              {topSpenders.map(({ sub, monthly }) => (
                <div key={sub.id} onClick={() => setDetailSub(sub)} className="cursor-pointer group">
                  <div className="flex items-center justify-between mb-1.5 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <SubLogo vendor={sub.vendor} name={sub.name} size="sm" />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">{sub.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums flex-shrink-0">{fmtEur(monthly)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-primary/80 rounded-full transition-all duration-500" style={{ width: `${(monthly / topSpendersMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verloopt binnenkort */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verloopt binnen 60 dagen</p>
            <h2 className="text-base font-semibold text-slate-900 mt-0.5">{expiringSoonList.length} {expiringSoonList.length === 1 ? 'abonnement' : 'abonnementen'}</h2>
          </div>
          {expiringSoonList.length === 0 ? (
            <p className="text-sm text-slate-400">Niets staat op verlopen.</p>
          ) : (
            <div className="space-y-1 -mx-1">
              {expiringSoonList.slice(0, 6).map(sub => {
                const expiryDate = sub.renewal_date;
                const days = Math.ceil((new Date(expiryDate) - now) / (1000 * 60 * 60 * 24));
                const urgent = days < 30;
                return (
                  <CompactSubRow
                    key={sub.id}
                    sub={sub}
                    onClick={() => setDetailSub(sub)}
                    accent={urgent ? 'danger' : 'warn'}
                    primary={
                      <p className={`text-sm font-semibold tabular-nums ${urgent ? 'text-red-600' : 'text-orange-600'}`}>
                        nog {days}d
                      </p>
                    }
                    secondary={
                      <p className="text-xs text-slate-400 tabular-nums">{format(new Date(expiryDate), 'dd MMM yyyy')}</p>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Weinig gebruikt */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Weinig gebruikt</p>
            <h2 className="text-base font-semibold text-slate-900 mt-0.5">{unusedSubs.length} {unusedSubs.length === 1 ? 'abonnement' : 'abonnementen'} <span className="text-xs font-normal text-slate-400">≤ 30%</span></h2>
          </div>
          {unusedSubs.length === 0 ? (
            <p className="text-sm text-slate-400">Geen abonnementen met laag gebruik.</p>
          ) : (
            <div className="space-y-1 -mx-1">
              {unusedSubs.slice(0, 6).map(({ sub, ev }) => (
                <CompactSubRow
                  key={sub.id}
                  sub={sub}
                  onClick={() => setDetailSub(sub)}
                  primary={<p className="text-sm font-semibold text-slate-900 tabular-nums">{ev.usage_pct}%</p>}
                  secondary={<p className="text-xs text-slate-400 tabular-nums">{fmtEurNoDec(toEurMonthly(sub))}/mnd</p>}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {detailSub && (
        <SubscriptionDetailPanel
          sub={detailSub}
          onClose={() => setDetailSub(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {modalOpen && editingSub && (
        <SubscriptionModal
          subscription={editingSub}
          categoryOptions={categories.map(c => c.name)}
          typeOptions={types.map(t => t.name)}
          departmentOptions={settingDepartments.map(d => d.name)}
          onAddCategory={addCategory}
          onAddType={addType}
          onAddDepartment={addDepartment}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export default DashboardPage;

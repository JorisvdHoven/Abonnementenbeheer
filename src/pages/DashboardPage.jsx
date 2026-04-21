import { useState, useRef, useEffect } from 'react';
import { useMonthlySnapshots } from '../hooks/useMonthlySnapshots';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useEvaluaties } from '../hooks/useEvaluaties';
import { useNotifications } from '../hooks/useNotifications';
import { useSettings } from '../hooks/useSettings';
import { format, addDays, isBefore } from 'date-fns';
import { SubLogo } from '../components/SubLogo';
import { toMonthly, toYearly } from '../lib/costUtils';
import { SubscriptionDetailPanel } from '../components/SubscriptionDetailPanel';
import SubscriptionModal from '../components/SubscriptionModal';
import {
  CreditCardIcon,
  BanknotesIcon,
  ClockIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
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

function LineChart({ data, showTotal = true, currentMonth, months, snapshots, currentYear, chartMax, departmentData, visibleDepts, colorMap = {} }) {
  const [tooltip, setTooltip] = useState(null);
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

        {/* Dots + hover areas */}
        {animData.map((v, i) => {
          const isFuture = i > currentMonth;
          const isCurrent = i === currentMonth;
          return (
            <g key={i}>
              {showTotal && (
                <circle
                  cx={x(i)} cy={y(v)} r={isCurrent ? 5 : 4}
                  fill={isFuture ? 'white' : '#F47920'}
                  stroke="#F47920" strokeWidth={isFuture ? 1.5 : 0}
                  opacity={isFuture ? 0.5 : 1}
                />
              )}
              <rect
                x={x(i) - 20} y={padT} width={40} height={innerH + 10}
                fill="transparent"
                onMouseEnter={(e) => { setTooltip({ i, v }); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'default' }}
              />
            </g>
          );
        })}

        {/* Month labels */}
        {months.map((m, i) => (
          <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize="10"
            fill={i === currentMonth ? '#F47920' : '#94a3b8'}
            fontWeight={i === currentMonth ? '600' : '400'}
          >{m}</text>
        ))}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-lg space-y-1"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 36 }}
        >
          {showTotal && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 rounded bg-primary flex-shrink-0" />
              <span className="text-slate-300">Totaal</span>
              <span className="font-semibold ml-auto pl-3">€{(data[tooltip.i] ?? 0).toFixed(0)}</span>
            </div>
          )}
          {deptEntries.map(([dept, deptData]) => (
            <div key={dept} className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 rounded flex-shrink-0" style={{ backgroundColor: colorMap[dept] ?? '#94a3b8' }} />
              <span className="text-slate-300">{dept}</span>
              <span className="font-medium ml-auto pl-3">€{(deptData[tooltip.i] ?? 0).toFixed(0)}</span>
            </div>
          ))}
          <div className="text-slate-500 pt-0.5">{months[tooltip.i]}</div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  const accents = {
    orange: 'bg-orange-100 text-primary',
    red:    'bg-red-100 text-red-500',
    green:  'bg-green-100 text-green-600',
    slate:  'bg-slate-100 text-slate-600',
  };
  return (
    <div className="surface-card-strong p-5 flex items-center gap-4 hover:shadow-lg transition-all duration-200">
      <div className={`flex-shrink-0 rounded-2xl p-3 ${accents[accent]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-dark leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { subscriptions, loading: subsLoading, updateSubscription, deleteSubscription } = useSubscriptions();
  const { snapshots } = useMonthlySnapshots();
  const { evaluaties, loading: evalLoading } = useEvaluaties();
  const { notifications } = useNotifications();
  const { exchangeRate, categories, types, departments: settingDepartments, addCategory, addType, addDepartment } = useSettings();
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
    await updateSubscription(editingSub.id, subData);
    setModalOpen(false);
  };

  const toEurMonthly = (sub) => toMonthly(sub.cost || 0, sub.cost_period) * (sub.cost_per_seat ? (sub.seats || 1) : 1) * (sub.currency === 'USD' ? exchangeRate : 1);

  const isActiveInMonth = (sub, year, month) => {
    const monthStart = new Date(year, month, 1);
    if (sub.end_date && new Date(sub.end_date) < monthStart) return false;
    if (!sub.auto_renew && sub.renewal_date && new Date(sub.renewal_date) < monthStart) return false;
    return true;
  };

  if (subsLoading || evalLoading) return <div className="p-6">Loading...</div>;

  const activeSubs = subscriptions.filter(s => s.status === 'actief');
  const totalMonthlyCost = activeSubs.reduce((sum, s) => sum + toEurMonthly(s), 0);
  const totalYearlyCost = totalMonthlyCost * 12;
  const hasUsdSubs = activeSubs.some(s => s.currency === 'USD');

  const now = new Date();
  const sixtyDays = addDays(now, 60);
  const expiringSoonList = activeSubs
    .filter(s => {
      if (s.auto_renew) return false;
      const renewalSoon = s.renewal_date && isBefore(new Date(s.renewal_date), sixtyDays);
      const endSoon = s.end_date && isBefore(new Date(s.end_date), sixtyDays);
      return renewalSoon || endSoon;
    })
    .sort((a, b) => {
      const dateA = new Date(a.renewal_date || a.end_date);
      const dateB = new Date(b.renewal_date || b.end_date);
      return dateA - dateB;
    });

  const vierMaandenGeleden = new Date();
  vierMaandenGeleden.setMonth(vierMaandenGeleden.getMonth() - 4);
  const verouderdCount = evaluaties.filter(e => new Date(e.updated_at) < vierMaandenGeleden).length;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const MONTHS = ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];

  const monthlyCashflow = Array(12).fill(0).map((_, m) => {
    // Gebruik snapshot als die beschikbaar is voor die maand
    const snapshot = snapshots.find(s => s.year === currentYear && s.month === m);
    if (snapshot) return snapshot.total_cost;

    // Toekomstige maanden én huidige maand zonder snapshot: bereken uit huidige abonnementen
    if (m >= currentMonth) {
      return activeSubs
        .filter(sub => isActiveInMonth(sub, currentYear, m))
        .reduce((sum, sub) => sum + toEurMonthly(sub), 0);
    }

    return 0;
  });
  const maxCashflow = Math.max(...monthlyCashflow, 1);

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

  const unusedSubs = activeSubs
    .map(sub => ({ sub, ev: evaluaties.find(e => e.subscription_id === sub.id) }))
    .filter(({ ev }) => ev && ev.usage_pct <= 30)
    .sort((a, b) => a.ev.usage_pct - b.ev.usage_pct);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-dark">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CreditCardIcon}
          label="Actieve abonnementen"
          value={activeSubs.length}
          accent="slate"
        />
        <StatCard
          icon={BanknotesIcon}
          label="Maandkosten"
          value={`€${totalMonthlyCost.toFixed(2)}`}
          sub={hasUsdSubs ? `incl. USD (koers ${exchangeRate})` : null}
          accent="orange"
        />
        <StatCard
          icon={CalendarDaysIcon}
          label="Jaarkosten"
          value={`€${totalYearlyCost.toFixed(0)}`}
          sub={hasUsdSubs ? `incl. USD (koers ${exchangeRate})` : null}
          accent="green"
        />
        <StatCard
          icon={ClipboardDocumentCheckIcon}
          label="Evaluaties verouderd"
          value={verouderdCount}
          sub={verouderdCount === 0 ? 'Alles up-to-date' : 'ouder dan 4 maanden'}
          accent={verouderdCount > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:grid-rows-1" style={{ minHeight: '22rem' }}>

        {/* Expiring soon */}
        <div className="surface-card-strong p-5 flex flex-col">
          <h2 className="text-base font-semibold text-dark mb-4">Verloopt binnen 60 dagen</h2>
          {expiringSoonList.length === 0 ? (
            <p className="text-sm text-slate-400">Geen abonnementen die binnenkort verlopen.</p>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {expiringSoonList.map(sub => {
                const expiryDate = sub.renewal_date || sub.end_date;
              const days = Math.ceil((new Date(expiryDate) - now) / (1000 * 60 * 60 * 24));
                const urgent = days < 30;
                return (
                  <div key={sub.id} onClick={() => setDetailSub(sub)} className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer hover:brightness-95 transition-all ${urgent ? 'bg-red-50' : 'bg-orange-50'}`}>
                    <div className="flex items-center gap-3">
                      <SubLogo vendor={sub.vendor} name={sub.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-dark">{sub.name}</p>
                        <p className="text-xs text-slate-400">{sub.vendor || '-'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${urgent ? 'text-red-500' : 'text-orange-500'}`}>
                        {format(new Date(expiryDate), 'dd-MM-yyyy')}
                      </p>
                      <p className={`text-xs ${urgent ? 'text-red-400' : 'text-orange-400'}`}>
                        nog {days} dagen
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Laag gebruik */}
        <div className="surface-card-strong p-5 flex flex-col">
          <h2 className="text-base font-semibold text-dark mb-4">Weinig gebruikt <span className="text-xs font-normal text-slate-400 ml-1">≤ 30% gebruik</span></h2>
          {unusedSubs.length === 0 ? (
            <p className="text-sm text-slate-400">Geen abonnementen met laag gebruik.</p>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {unusedSubs.map(({ sub, ev }) => (
                <div key={sub.id} onClick={() => setDetailSub(sub)} className="flex items-center justify-between rounded-lg px-3 py-2 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all">
                  <div className="flex items-center gap-3">
                    <SubLogo vendor={sub.vendor} name={sub.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-dark">{sub.name}</p>
                      <p className="text-xs text-slate-400">{sub.vendor || '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-500">{ev.usage_pct}%</p>
                    <p className="text-xs text-slate-400">€{toEurMonthly(sub).toFixed(0)}/mnd</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cost breakdown widget */}
        <div className="surface-card-strong p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setBreakdownMode('afdeling')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${breakdownMode === 'afdeling' ? 'bg-white shadow text-dark' : 'text-slate-500 hover:text-dark'}`}
              >
                Afdeling
              </button>
              <button
                onClick={() => setBreakdownMode('categorie')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${breakdownMode === 'categorie' ? 'bg-white shadow text-dark' : 'text-slate-500 hover:text-dark'}`}
              >
                Categorie
              </button>
            </div>
            <div className="flex gap-1">
              {CATEGORY_PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setCategoryPeriod(p.key)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${categoryPeriod === p.key ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                  {p.label}
                </button>
              ))}
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
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1.5">
                        {breakdownMode === 'afdeling' && (
                          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        )}
                        {label}
                      </span>
                      <span className="font-medium text-dark">€{cost.toFixed(0)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(cost / maxCost) * 100}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cashflow grafiek */}
      <div className="surface-card-strong p-5" style={{ resize: 'both', overflow: 'hidden', minWidth: '40%', maxWidth: '100%', width: '100%', minHeight: '280px' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-dark">Cashflow</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWindowStart(w => Math.max(w - 1, minYear))}
                disabled={windowStart <= minYear}
                className="px-2 py-1 rounded-md text-sm text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >‹</button>
              {visibleYears.map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${selectedYear === y ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                  {y}
                </button>
              ))}
              <button
                onClick={() => setWindowStart(w => w + 1)}
                className="px-2 py-1 rounded-md text-sm text-slate-400 hover:bg-slate-100 transition-colors"
              >›</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-primary rounded" />Historisch</span>
              <span className="flex items-center gap-1.5">
                <svg width="16" height="2" className="flex-shrink-0"><line x1="0" y1="1" x2="16" y2="1" stroke="#F47920" strokeWidth="2" strokeDasharray="3,2" strokeOpacity="0.5" /></svg>
                Prognose
              </span>
            </div>
            <button
              onClick={handleToggleLegend}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${legendOpen ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'}`}
            >
              <span className="flex gap-0.5">
                {DEPT_COLORS.slice(0, 3).map(c => <span key={c} className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />)}
              </span>
              Afdelingen
            </button>
          </div>
        </div>

        {legendOpen && (
          <div className="mb-3 p-3 bg-slate-50 rounded-xl flex flex-wrap gap-x-5 gap-y-2 items-center">
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

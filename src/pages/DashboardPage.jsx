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

function LineChart({ data, currentMonth, months, snapshots, currentYear }) {
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
  const max = Math.max(...data, 1);

  const x = (i) => padL + (i / 11) * innerW;
  const y = (v) => padT + innerH - (v / max) * innerH;

  const histPoints = data
    .map((v, i) => ({ v, i, hasSnap: snapshots.some(s => s.year === currentYear && s.month === i) }))
    .filter(p => p.i <= currentMonth);
  const forePoints = data
    .map((v, i) => ({ v, i }))
    .filter(p => p.i >= currentMonth);

  const toPath = (points) => points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: 'calc(100% - 48px)', minHeight: 150 }}>
      <svg width={W} height={H} className="w-full h-full">
        {/* Y gridlines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y(max * f)} y2={y(max * f)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={padL - 6} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">€{(max * f).toFixed(0)}</text>
          </g>
        ))}

        {/* Historical line */}
        {histPoints.length > 1 && (
          <path d={toPath(histPoints)} fill="none" stroke="#F47920" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Forecast line (dashed) */}
        {forePoints.length > 1 && (
          <path d={toPath(forePoints)} fill="none" stroke="#F47920" strokeWidth="2" strokeDasharray="5,4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        )}

        {/* Dots + hover areas */}
        {data.map((v, i) => {
          const isFuture = i > currentMonth;
          const isCurrent = i === currentMonth;
          return (
            <g key={i}>
              <circle
                cx={x(i)} cy={y(v)} r={isCurrent ? 5 : 4}
                fill={isFuture ? 'white' : '#F47920'}
                stroke="#F47920" strokeWidth={isFuture ? 1.5 : 0}
                opacity={isFuture ? 0.5 : 1}
              />
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
          className="pointer-events-none fixed z-50 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white shadow-lg"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 36 }}
        >
          <span className="text-slate-400 mr-1">{months[tooltip.i]}</span>
          <span className="font-semibold">€{tooltip.v.toFixed(0)}</span>
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
  const { exchangeRate, categories, types, addCategory, addType } = useSettings();
  const [detailSub, setDetailSub] = useState(null);
  const [editingSub, setEditingSub] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [windowStart, setWindowStart] = useState(new Date().getFullYear() - 1);
  const [categoryPeriod, setCategoryPeriod] = useState('maand');

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

  const toEurMonthly = (sub) => toMonthly(sub.cost || 0, sub.cost_period) * (sub.currency === 'USD' ? exchangeRate : 1);

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
    const snapshot = snapshots.find(s => s.year === selectedYear && s.month === m);
    if (snapshot) return snapshot.total_cost;
    if (selectedYear > currentYear || (selectedYear === currentYear && m >= currentMonth)) {
      return activeSubs
        .filter(sub => isActiveInMonth(sub, selectedYear, m))
        .reduce((sum, sub) => sum + toEurMonthly(sub), 0);
    }
    return 0;
  });

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
  const maxCost = sortedCategories[0]?.[1] ?? 1;

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Expiring soon */}
        <div className="surface-card-strong p-5">
          <h2 className="text-base font-semibold text-dark mb-4">Verloopt binnen 60 dagen</h2>
          {expiringSoonList.length === 0 ? (
            <p className="text-sm text-slate-400">Geen abonnementen die binnenkort verlopen.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
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
        <div className="surface-card-strong p-5">
          <h2 className="text-base font-semibold text-dark mb-4">Weinig gebruikt <span className="text-xs font-normal text-slate-400 ml-1">≤ 30% gebruik</span></h2>
          {unusedSubs.length === 0 ? (
            <p className="text-sm text-slate-400">Geen abonnementen met laag gebruik.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
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

        {/* Cost per category */}
        <div className="surface-card-strong p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-dark">Kosten per categorie</h2>
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
          {sortedCategories.length === 0 ? (
            <p className="text-sm text-slate-400">Nog geen data.</p>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map(([cat, cost]) => (
                <div key={cat}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{cat}</span>
                    <span className="font-medium text-dark">€{cost.toFixed(0)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${(cost / maxCost) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
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
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-primary rounded" />Historisch</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-primary/40 rounded" />Prognose</span>
          </div>
        </div>
        <LineChart data={selectedCashflow} currentMonth={selectedYear === currentYear ? currentMonth : (selectedYear < currentYear ? 11 : -1)} months={MONTHS} snapshots={snapshots} currentYear={selectedYear} />
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
          onAddCategory={addCategory}
          onAddType={addType}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export default DashboardPage;

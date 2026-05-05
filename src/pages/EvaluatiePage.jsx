import { useState } from 'react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useEvaluaties } from '../hooks/useEvaluaties';
import { useCurrentUser } from '../hooks/useCurrentUser';
import EvaluatieModal from '../components/EvaluatieModal';
import { SubscriptionDetailPanel } from '../components/SubscriptionDetailPanel';
import { SubLogo } from '../components/SubLogo';
import { formatDateLong } from '../lib/format';
import { MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

// ============================================================
// Sub-components
// ============================================================

function UsageBar({ pct }) {
  // 0% = rood, 50% = geel, 100% = groen
  const hue = Math.round(pct * 1.2);
  const color = `hsl(${hue}, 75%, 45%)`;
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold w-9 text-right tabular-nums" style={{ color }}>{pct}%</span>
    </div>
  );
}

function EvalCard({ sub, ev, isAdmin, onDetail, onEdit, onDelete, accent }) {
  const isOutdated = accent === 'orange';
  return (
    <div className={`bg-white rounded-2xl border ${isOutdated ? 'border-orange-200/80' : 'border-slate-200/70'} p-4 flex flex-col gap-3 hover:border-slate-300 transition-colors`}>
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => onDetail(sub)}
      >
        <div className="flex-shrink-0">
          <SubLogo vendor={sub.vendor} name={sub.name} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 text-sm truncate group-hover:text-primary transition-colors">{sub.name}</p>
          {sub.vendor && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub.vendor}</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {ev ? (
          <>
            <UsageBar pct={ev.usage_pct} />
            {ev.note && (
              <p className="text-xs text-slate-500 italic line-clamp-2 leading-relaxed">"{ev.note}"</p>
            )}
            <p className={`text-xs tabular-nums ${isOutdated ? 'text-orange-600' : 'text-slate-400'}`}>
              {isOutdated && <span className="mr-1">●</span>}
              {formatDateLong(ev.updated_at)}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-400">Nog niet geëvalueerd</p>
        )}
      </div>

      {isAdmin && onEdit && (
        <button
          onClick={() => onEdit(sub)}
          className={`mt-1 inline-flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            ev
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-primary text-white shadow-sm hover:brightness-110'
          }`}
        >
          {ev ? (
            <>
              <PencilSquareIcon className="h-3.5 w-3.5" />
              Bewerken
            </>
          ) : (
            <>
              <PlusIcon className="h-3.5 w-3.5" />
              Evaluatie toevoegen
            </>
          )}
        </button>
      )}

      {isAdmin && ev && onDelete && (
        <button
          onClick={() => onDelete(sub.id)}
          className="text-xs text-red-500 hover:text-red-700 text-center transition-colors"
        >
          Verwijder evaluatie
        </button>
      )}
    </div>
  );
}

function EvalSection({ title, rows, evaluaties, isAdmin, onDetail, onEdit, onDelete, accent, emptyText }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${
          accent === 'orange' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {rows.map(sub => {
            const ev = evaluaties.find(e => e.subscription_id === sub.id);
            return (
              <EvalCard
                key={sub.id}
                sub={sub}
                ev={ev}
                isAdmin={isAdmin}
                onDetail={onDetail}
                onEdit={onEdit}
                onDelete={onDelete}
                accent={accent}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

// ============================================================
// Hoofd-pagina
// ============================================================

function EvaluatiePage() {
  const { subscriptions, loading: subsLoading } = useSubscriptions();
  const { evaluaties, loading: evalLoading, upsertEvaluatie, deleteEvaluatie } = useEvaluaties();
  const { isAdmin } = useCurrentUser();
  const [selectedSub, setSelectedSub] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailSub, setDetailSub] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('actief');
  const [sortUsage, setSortUsage] = useState('hoog');

  const openModal = (sub) => { setSelectedSub(sub); setModalOpen(true); };

  const handleSave = async (subscriptionId, data) => {
    if (data === null) await deleteEvaluatie(subscriptionId);
    else await upsertEvaluatie(subscriptionId, data);
    setModalOpen(false);
  };

  const isVerouderd = (ev) => {
    const vierMaandenGeleden = new Date();
    vierMaandenGeleden.setMonth(vierMaandenGeleden.getMonth() - 4);
    return new Date(ev.updated_at) < vierMaandenGeleden;
  };

  if (subsLoading || evalLoading) return <div className="p-6">Loading...</div>;

  const actieveSubscriptions = subscriptions.filter(s => s.status === 'actief');
  const inactieveSubscriptions = subscriptions.filter(s => s.status !== 'actief');

  const filterSearch = (list) => list.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.vendor?.toLowerCase().includes(search.toLowerCase()))
  );

  const byUsage = (a, b) => {
    const evA = evaluaties.find(e => e.subscription_id === a.id);
    const evB = evaluaties.find(e => e.subscription_id === b.id);
    const diff = (evB?.usage_pct ?? 0) - (evA?.usage_pct ?? 0);
    return sortUsage === 'hoog' ? diff : -diff;
  };

  const filtered = filterSearch(actieveSubscriptions);
  const metEvaluatie = filtered.filter(s => evaluaties.some(e => e.subscription_id === s.id));
  const zonderEvaluatie = filtered.filter(s => !evaluaties.some(e => e.subscription_id === s.id));
  const verouderd = metEvaluatie.filter(s => isVerouderd(evaluaties.find(e => e.subscription_id === s.id))).sort(byUsage);
  const actueel = metEvaluatie.filter(s => !isVerouderd(evaluaties.find(e => e.subscription_id === s.id))).sort(byUsage);
  const archief = filterSearch(inactieveSubscriptions).filter(s => evaluaties.some(e => e.subscription_id === s.id)).sort(byUsage);

  const totalActive = actieveSubscriptions.length;
  const evaluatedCount = metEvaluatie.length;
  const evalPct = totalActive > 0 ? Math.round((evaluatedCount / totalActive) * 100) : 0;

  return (
    <div className="p-6 space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Evaluatie</h1>
            <div className="relative group">
              <InformationCircleIcon className="h-4 w-4 text-slate-300 hover:text-slate-500 cursor-help transition-colors" />
              <div className="absolute left-0 top-6 z-10 hidden group-hover:block w-80 rounded-xl bg-slate-900 text-white text-xs p-3.5 shadow-xl ring-1 ring-white/10">
                <p className="font-semibold mb-1">Wat is evaluatie?</p>
                <p className="mb-2 text-slate-300">Hier geef je per abonnement aan hoe intensief het gebruikt wordt binnen jullie organisatie.</p>
                <p className="mb-2 text-slate-300">Vul een <strong className="text-white">gebruikspercentage</strong> in (0–100%) en optioneel een notitie. Dit helpt om te bepalen welke abonnementen de moeite waard zijn.</p>
                <p className="mb-2 text-slate-300">Evaluaties ouder dan <strong className="text-white">4 maanden</strong> worden gemarkeerd als verouderd — dan is het tijd om opnieuw te beoordelen.</p>
                <p className="text-slate-300">Abonnementen met een laag gebruik zijn zichtbaar op het dashboard als bespaartip.</p>
              </div>
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-500 tabular-nums">
            {evaluatedCount} van {totalActive} actieve abonnementen geëvalueerd
            {totalActive > 0 && <span className="text-slate-400"> · {evalPct}%</span>}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Tabs */}
          <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab('actief')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'actief' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Actief
            </button>
            <button
              onClick={() => setTab('archief')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'archief' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Archief
              {archief.length > 0 && <span className="ml-1.5 text-xs text-slate-400 tabular-nums">{archief.length}</span>}
            </button>
          </div>

          {/* Status indicator */}
          {verouderd.length > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 ring-1 ring-orange-200/60">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-50 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-orange-500" />
              </span>
              <span className="text-xs font-semibold text-orange-700 tabular-nums">{verouderd.length} verouderd</span>
            </div>
          ) : evaluatedCount > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 ring-1 ring-green-200/60">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-green-700">Up-to-date</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Zoek op naam of leverancier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setSortUsage('hoog')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sortUsage === 'hoog' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Meest gebruikt
          </button>
          <button
            onClick={() => setSortUsage('laag')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${sortUsage === 'laag' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Minst gebruikt
          </button>
        </div>
      </div>

      {/* Sections */}
      {tab === 'actief' && (
        <div className="space-y-6">
          {verouderd.length > 0 && (
            <EvalSection
              title="Opnieuw evalueren"
              rows={verouderd}
              evaluaties={evaluaties}
              isAdmin={isAdmin}
              onDetail={setDetailSub}
              onEdit={openModal}
              accent="orange"
              emptyText="Geen verouderde evaluaties."
            />
          )}
          <EvalSection
            title="Geëvalueerd"
            rows={actueel}
            evaluaties={evaluaties}
            isAdmin={isAdmin}
            onDetail={setDetailSub}
            onEdit={openModal}
            emptyText="Nog geen geëvalueerde abonnementen."
          />
          {isAdmin && (
            <EvalSection
              title="Nog niet geëvalueerd"
              rows={zonderEvaluatie}
              evaluaties={evaluaties}
              isAdmin={isAdmin}
              onDetail={setDetailSub}
              onEdit={openModal}
              emptyText="Alle abonnementen zijn geëvalueerd."
            />
          )}
        </div>
      )}

      {tab === 'archief' && (
        <EvalSection
          title="Verlopen abonnementen"
          rows={archief}
          evaluaties={evaluaties}
          isAdmin={isAdmin}
          onDetail={setDetailSub}
          onDelete={(subId) => deleteEvaluatie(subId)}
          emptyText="Geen geëvalueerde verlopen abonnementen."
        />
      )}

      {detailSub && (
        <SubscriptionDetailPanel
          sub={detailSub}
          onClose={() => setDetailSub(null)}
          onEdit={(sub) => { setDetailSub(null); setSelectedSub(sub); setModalOpen(true); }}
          onDelete={() => setDetailSub(null)}
        />
      )}

      {modalOpen && selectedSub && (
        <EvaluatieModal
          subscription={selectedSub}
          existing={evaluaties.find(e => e.subscription_id === selectedSub.id) ?? null}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export default EvaluatiePage;

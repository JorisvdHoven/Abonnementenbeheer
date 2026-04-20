import { useState } from 'react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useEvaluaties } from '../hooks/useEvaluaties';
import { useCurrentUser } from '../hooks/useCurrentUser';
import EvaluatieModal from '../components/EvaluatieModal';
import { SubscriptionDetailPanel } from '../components/SubscriptionDetailPanel';
import { SubLogo } from '../components/SubLogo';

function UsageBar({ pct }) {
  const hue = Math.round(pct * 1.2);
  const color = `hsl(${hue}, 85%, 45%)`;
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

function EvalCard({ sub, ev, isAdmin, onDetail, onEdit, onDelete, accent }) {
  const formatDate = (iso) => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className={`surface-card-strong flex flex-col gap-3 p-4 ${accent === 'orange' ? 'border-l-4 border-orange-400' : ''}`}>
      <div
        className="flex items-center gap-3 cursor-pointer group/header"
        onClick={() => onDetail(sub)}
      >
        <div className="flex-shrink-0">
          <SubLogo vendor={sub.vendor} name={sub.name} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-dark text-sm truncate group-hover/header:text-primary transition-colors">{sub.name}</p>
          {sub.vendor && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub.vendor}</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {ev ? (
          <>
            <UsageBar pct={ev.usage_pct} />
            {ev.note
              ? <p className="text-xs text-slate-500 italic truncate">"{ev.note}"</p>
              : <div className="h-4" />}
            <p className={`text-xs ${accent === 'orange' ? 'text-orange-400' : 'text-slate-400'}`}>{formatDate(ev.updated_at)}</p>
          </>
        ) : (
          <p className="text-xs text-slate-400">Nog niet geëvalueerd</p>
        )}
      </div>

      {isAdmin && onEdit && (
        <button
          onClick={() => onEdit(sub)}
          className={`mt-1 w-full py-1.5 rounded-md text-xs font-semibold transition-colors ${
            ev
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-primary text-white hover:opacity-90'
          }`}
        >
          {ev ? 'Bewerken' : '+ Evaluatie toevoegen'}
        </button>
      )}

      {isAdmin && ev && onDelete && (
        <button
          onClick={() => onDelete(sub.id)}
          className="text-xs text-red-400 hover:text-red-600 text-center"
        >
          Verwijder evaluatie
        </button>
      )}
    </div>
  );
}

function EvalSection({ title, rows, evaluaties, isAdmin, onDetail, onEdit, onDelete, accent, showStatus, emptyText }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className={`font-semibold text-sm ${accent === 'orange' ? 'text-orange-500' : 'text-slate-500'}`}>{title}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${accent === 'orange' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
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
                showStatus={showStatus}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

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

  return (
    <div className="p-6 space-y-4">
      <div className="surface-card-strong p-5 flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div>
          <h1 className="text-2xl font-bold text-dark">Evaluatie</h1>
          <p className="mt-1 text-sm text-slate-500">
            {metEvaluatie.length} van {actieveSubscriptions.length} actieve abonnementen geëvalueerd
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setTab('actief')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'actief' ? 'bg-white shadow text-dark' : 'text-slate-500 hover:text-dark'}`}
          >
            Actief
          </button>
          <button
            onClick={() => setTab('archief')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'archief' ? 'bg-white shadow text-dark' : 'text-slate-500 hover:text-dark'}`}
          >
            Archief {archief.length > 0 && <span className="ml-1 text-xs text-slate-400">({archief.length})</span>}
          </button>
        </div>
        {verouderd.length > 0 ? (
          <div className="text-right">
            <p className="text-sm font-semibold text-orange-500">{verouderd.length} verouderd</p>
            <p className="text-xs text-slate-400 mt-0.5">Opnieuw evalueren aanbevolen</p>
          </div>
        ) : metEvaluatie.length > 0 ? (
          <div className="text-right">
            <p className="text-sm font-semibold text-green-600">Alles up-to-date</p>
            <p className="text-xs text-slate-400 mt-0.5">Geen verouderde evaluaties</p>
          </div>
        ) : null}
      </div>

      <div className="surface-card p-3 flex gap-2">
        <input
          type="text"
          placeholder="Zoek op naam of leverancier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field-strong flex-1 px-3 py-2 rounded-md border text-sm focus:outline-none"
        />
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setSortUsage('hoog')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sortUsage === 'hoog' ? 'bg-white shadow text-dark' : 'text-slate-500 hover:text-dark'}`}
          >
            Meest gebruikt
          </button>
          <button
            onClick={() => setSortUsage('laag')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sortUsage === 'laag' ? 'bg-white shadow text-dark' : 'text-slate-500 hover:text-dark'}`}
          >
            Minst gebruikt
          </button>
        </div>
      </div>

      {tab === 'actief' && (<>
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
      </>)}

      {tab === 'archief' && (
        <EvalSection
          title="Verlopen abonnementen"
          rows={archief}
          evaluaties={evaluaties}
          isAdmin={isAdmin}
          onDetail={setDetailSub}
          onDelete={(subId) => deleteEvaluatie(subId)}
          showStatus
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

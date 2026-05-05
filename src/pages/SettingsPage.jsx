import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { currencySymbol } from '../lib/format';
import {
  InformationCircleIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  UsersIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const FOREIGN_CURRENCIES = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'GBP', label: 'Brits Pond' },
  { code: 'CHF', label: 'Zwitserse Frank' },
];

// ============================================================
// Section primitive — sectie met titel, subtekst en optionele info-tooltip
// ============================================================

function SectionHeader({ title, hint, info }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {info && (
        <div className="relative group">
          <InformationCircleIcon className="h-4 w-4 text-slate-300 hover:text-slate-500 cursor-help transition-colors" />
          <div className="absolute left-0 top-6 z-10 hidden group-hover:block w-72 rounded-xl bg-slate-900 text-white text-xs p-3.5 shadow-xl ring-1 ring-white/10 leading-relaxed">
            {info}
          </div>
        </div>
      )}
      {hint && <span className="ml-auto text-xs text-slate-400">{hint}</span>}
    </div>
  );
}

const cardClass = 'bg-white rounded-2xl border border-slate-200/70 p-5';
const inputClass = 'block w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

// ============================================================
// Wisselkoers-rij met inline auto-save feedback
// ============================================================

function ExchangeRateRow({ currency, label, value, onSave, isAdmin }) {
  const [input, setInput] = useState((value ?? '').toString());
  const [saved, setSaved] = useState(false);

  const commit = () => {
    const parsed = parseFloat(input);
    if (isNaN(parsed) || parsed <= 0) return;
    if (parsed === parseFloat(value)) return;
    onSave(currency, parsed);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
        <span className="text-sm text-slate-600">
          1 {currency} <span className="text-slate-400">({label})</span>
        </span>
        <span className="text-sm font-medium text-slate-900 tabular-nums">{value ?? '?'} EUR</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700">
          1 {currency}
          <span className="ml-2 text-xs text-slate-400 font-normal">({label})</span>
        </p>
        <p className="text-xs text-slate-400 tabular-nums">{currencySymbol(currency)} → €</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.0001"
          min="0.01"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
          className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
        <span className="text-sm text-slate-500">EUR</span>
        <span className={`inline-flex items-center justify-center w-6 h-6 transition-all ${saved ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <CheckIcon className="h-4 w-4 text-green-500" />
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Taxonomie lijst (categorieën, types, afdelingen)
// ============================================================

function TaxonomyList({ title, info, items, onAdd, onDelete, isAdmin, placeholder, emptyText }) {
  const [input, setInput] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    await onAdd(trimmed);
    setInput('');
  };

  return (
    <section className={cardClass}>
      <SectionHeader title={title} info={info} hint={items.length > 0 ? `${items.length}` : null} />

      {isAdmin && (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-primary shadow-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PlusIcon className="h-4 w-4" />
            Toevoegen
          </button>
        </form>
      )}

      <div>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">{emptyText}</p>
        ) : (
          <div>
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between py-2 px-1 -mx-1 rounded-lg border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
              >
                <span className="text-sm text-slate-700">{item.name}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    aria-label={`Verwijder ${item.name}`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================
// Hoofd-pagina
// ============================================================

function SettingsPage() {
  const {
    categories, types, departments, loading,
    exchangeRates, updateExchangeRate,
    addCategory, addType, addDepartment,
    deleteCategory, deleteType, deleteDepartment,
  } = useSettings();
  const { isAdmin } = useCurrentUser();
  const navigate = useNavigate();

  if (loading) return <div className="p-6">Loading instellingen...</div>;

  return (
    <div className="p-6 space-y-5">

      {/* Header — plain, geen card */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Instellingen</h1>
        <p className="text-sm text-slate-500 mt-1">
          Beheer wisselkoersen, afdelingen, types en categorieën.
        </p>
      </div>

      {/* Wisselkoersen */}
      <section className={cardClass}>
        <SectionHeader
          title="Wisselkoersen"
          info={
            <>
              <p className="font-semibold mb-1">Wisselkoersen voor vreemde valuta</p>
              <p className="text-slate-300">
                Worden gebruikt om abonnementen in USD, GBP of CHF om te rekenen naar EUR
                op het dashboard. Wijzigingen worden direct opgeslagen.
              </p>
            </>
          }
        />
        <div>
          {FOREIGN_CURRENCIES.map(({ code, label }) => (
            <ExchangeRateRow
              key={code}
              currency={code}
              label={label}
              value={exchangeRates[code]}
              onSave={updateExchangeRate}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </section>

      {/* Taxonomie grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <TaxonomyList
          title="Afdelingen"
          info={
            <>
              <p className="font-semibold mb-1">Afdeling</p>
              <p className="mb-2 text-slate-300">Welke afdeling of team is verantwoordelijk voor het abonnement.</p>
              <p className="mb-2 text-slate-300">Voorbeelden: <em>Facilitair, Sales, Finance, IT, HR</em>.</p>
              <p className="text-slate-300">Gebruikt voor de cashflow grafiek per afdeling op het dashboard.</p>
            </>
          }
          items={departments}
          onAdd={addDepartment}
          onDelete={deleteDepartment}
          isAdmin={isAdmin}
          placeholder="Nieuwe afdeling…"
          emptyText="Nog geen afdelingen toegevoegd."
        />
        <TaxonomyList
          title="Types"
          info={
            <>
              <p className="font-semibold mb-1">Type</p>
              <p className="mb-2 text-slate-300">Hoe een abonnement wordt afgerekend.</p>
              <p className="text-slate-300">Voorbeelden: <em>Licentie, Abonnement, Pay-per-use, Eenmalig</em>.</p>
            </>
          }
          items={types}
          onAdd={addType}
          onDelete={deleteType}
          isAdmin={isAdmin}
          placeholder="Nieuw type…"
          emptyText="Nog geen types toegevoegd."
        />
        <TaxonomyList
          title="Categorieën"
          info={
            <>
              <p className="font-semibold mb-1">Categorie</p>
              <p className="mb-2 text-slate-300">Categoriseert abonnementen op gebruiksdomein.</p>
              <p className="text-slate-300">Optioneel — leeg laten bij toevoegen geeft automatisch <em>Overig</em>.</p>
            </>
          }
          items={categories}
          onAdd={addCategory}
          onDelete={deleteCategory}
          isAdmin={isAdmin}
          placeholder="Nieuwe categorie…"
          emptyText="Nog geen categorieën toegevoegd."
        />
      </div>

      {/* Gebruikersbeheer link */}
      {isAdmin && (
        <button
          onClick={() => navigate('/gebruikers')}
          className={`${cardClass} w-full flex items-center justify-between hover:border-slate-300 hover:bg-slate-50/40 transition-all text-left group`}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UsersIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Gebruikersbeheer</h2>
              <p className="text-sm text-slate-500 mt-0.5">Beheer gebruikers en rollen (admin of viewer).</p>
            </div>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </button>
      )}
    </div>
  );
}

export default SettingsPage;

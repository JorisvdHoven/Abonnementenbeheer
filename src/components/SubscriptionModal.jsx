import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BILLING_PERIODS, toMonthly } from '../lib/costUtils';
import { currencySymbol, formatDate } from '../lib/format';
import { ChevronDownIcon, PlusIcon, TrashIcon, InformationCircleIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { SubLogo } from './SubLogo';
import Modal from './Modal';
import { recomputeSubscriptionSnapshots } from '../lib/snapshotUtils';

// ============================================================
// Layout primitives — modern, minimaal
// ============================================================

function Section({ label, hint, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h3>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function CollapsibleSection({ label, hint, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-left group"
      >
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-700 transition-colors">{label}</h3>
          {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
        </div>
        <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </section>
  );
}

function Field({ label, hint, error, required, value, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className={value ? 'text-slate-400' : 'text-red-500'}>*</span>}
      </label>
      {children}
      {error
        ? <p className="mt-1 text-xs text-red-600">{error}</p>
        : hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function FieldGrid({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function ToggleSwitch({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      <div className="flex-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors mt-0.5 ${checked ? 'bg-primary' : 'bg-slate-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform translate-y-0.5 ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

const inputClass = 'block w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';
const inputClassError = 'block w-full px-3 py-2 rounded-md border border-red-300 bg-red-50/40 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors';

// ============================================================
// AddableSelect — combobox met inline "+ toevoegen"
// ============================================================

function AddableSelect({ label, value, options, onChange, onAdd, error, required, hint }) {
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  const handleSelect = (e) => {
    if (e.target.value === '__new__') setAdding(true);
    else onChange(e.target.value);
  };

  const handleConfirm = async () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    await onAdd(trimmed);
    onChange(trimmed);
    setNewValue('');
    setAdding(false);
  };

  return (
    <Field label={label} required={required} value={value} error={error} hint={hint}>
      {adding ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={`Nieuwe ${label.toLowerCase()}...`}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } }}
            className={inputClass}
          />
          <button type="button" onClick={handleConfirm} className="btn-primary whitespace-nowrap text-sm">Toevoegen</button>
          <button type="button" onClick={() => { setAdding(false); setNewValue(''); }} className="btn-secondary text-sm">✕</button>
        </div>
      ) : (
        <select
          value={value}
          onChange={handleSelect}
          className={error ? inputClassError : inputClass}
        >
          <option value="">Kies een {label.toLowerCase()}</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          <option disabled>──────────</option>
          <option value="__new__">+ Nieuwe {label.toLowerCase()} toevoegen</option>
        </select>
      )}
    </Field>
  );
}

// ============================================================
// Accounts manager — inline list met add/remove
// ============================================================

function AccountsManager({ accounts, onChange, defaultCost, currency, period }) {
  const [showArchive, setShowArchive] = useState(false);

  const addAccount = () => {
    onChange([...accounts, { _tempId: crypto.randomUUID(), owner_name: '', start_date: '', end_date: '', auto_renew: false, cost: '', archived_at: null }]);
  };

  // Operate on accounts via stable key (id voor bestaande, _tempId voor nieuwe)
  const keyOf = (a) => a.id ?? a._tempId;

  const updateByKey = (key, patch) => {
    onChange(accounts.map(a => keyOf(a) === key ? { ...a, ...patch } : a));
  };

  const archiveAccount = (key) => {
    updateByKey(key, { archived_at: new Date().toISOString() });
  };

  const restoreAccount = (key) => {
    updateByKey(key, { archived_at: null });
  };

  const permanentlyDeleteAccount = (key) => {
    if (!confirm('Account definitief verwijderen? Dit verwijdert ook de historische cashflow van deze account. Niet ongedaan te maken.')) return;
    onChange(accounts.filter(a => keyOf(a) !== key));
  };

  // Active = niet gearchiveerd, sortable op start_date
  const activeAccounts = accounts.filter(a => !a.archived_at);
  const archivedAccounts = accounts.filter(a => a.archived_at);

  const sym = currencySymbol(currency);
  const totalMonthly = activeAccounts.reduce((sum, a) => {
    const cost = a.cost !== '' && a.cost !== null && a.cost !== undefined
      ? parseFloat(a.cost) || 0
      : parseFloat(defaultCost) || 0;
    return sum + toMonthly(cost, period);
  }, 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden">
      <div className="px-3.5 py-2.5 bg-slate-100/70 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600 flex items-center gap-1.5">
          {activeAccounts.length} account{activeAccounts.length !== 1 ? 's' : ''}
          <span className="relative group">
            <InformationCircleIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
            <span className="absolute left-0 top-5 z-20 hidden group-hover:block w-80 rounded-xl bg-slate-900 text-white text-xs p-3.5 shadow-xl ring-1 ring-white/10 leading-relaxed font-normal normal-case tracking-normal">
              <p className="font-semibold mb-1.5">Hoe werken accounts?</p>
              <p className="text-slate-300 mb-2">
                Elke account is een aparte licentie met een eigen <strong className="text-white">start- en vervaldatum</strong>.
              </p>
              <p className="text-slate-300 mb-2">
                <strong className="text-white">Auto-verlenging aan</strong> → vervaldatum schuift automatisch door (handig voor ChatGPT/OpenAI individueel).
              </p>
              <p className="text-slate-300 mb-2">
                <strong className="text-white">Auto-verlenging uit</strong> → account stopt op vervaldatum. Bv. wanneer iemand vertrekt.
              </p>
              <p className="text-slate-300">
                <strong className="text-white">Vervaldatum leeg</strong> = doorlopend zonder einde.
              </p>
            </span>
          </span>
        </span>
        {totalMonthly > 0 && (
          <span className="text-slate-500">≈ {sym}{totalMonthly.toFixed(2)} totaal/mnd</span>
        )}
      </div>
      {activeAccounts.length === 0 && archivedAccounts.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-slate-400">Nog geen accounts toegevoegd.</p>
          <button type="button" onClick={addAccount} className="btn-primary text-sm mt-3 inline-flex items-center gap-1.5">
            <PlusIcon className="h-4 w-4" />
            Eerste account toevoegen
          </button>
        </div>
      ) : (
        <>
          {activeAccounts.length > 0 && (
            <div className="divide-y divide-slate-200">
              {activeAccounts.map((account) => {
                const key = keyOf(account);
                return (
                  <div
                    key={key}
                    className="p-3 grid grid-cols-1 sm:grid-cols-[1fr,140px,180px,140px,auto] gap-2 items-end"
                  >
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Naam medewerker</label>
                      <input
                        type="text"
                        value={account.owner_name || ''}
                        onChange={(e) => updateByKey(key, { owner_name: e.target.value })}
                        placeholder="Bijv. Joris van den Hoven"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Startdatum</label>
                      <input
                        type="date"
                        value={account.start_date || ''}
                        onChange={(e) => updateByKey(key, { start_date: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Vervaldatum</label>
                      <div className="flex gap-1.5">
                        <input
                          type="date"
                          value={account.end_date || ''}
                          onChange={(e) => updateByKey(key, { end_date: e.target.value })}
                          className={`flex-1 min-w-0 ${inputClass}`}
                        />
                        <button
                          type="button"
                          onClick={() => updateByKey(key, { auto_renew: !account.auto_renew })}
                          title={account.auto_renew
                            ? 'Auto-verlenging aan — vervaldatum schuift automatisch door'
                            : 'Auto-verlenging uit — account stopt op vervaldatum'}
                          className={`flex-shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-md text-base font-semibold transition-all ${
                            account.auto_renew
                              ? 'bg-primary/15 text-primary hover:bg-primary/20'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                          }`}
                          aria-label={account.auto_renew ? 'Auto-verlenging aan' : 'Auto-verlenging uit'}
                        >
                          ↻
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        Prijs <span className="text-slate-400 font-normal">(optioneel)</span>
                      </label>
                      <div className="flex">
                        <span className="px-2.5 py-2 border border-slate-200 border-r-0 rounded-l-md bg-slate-100 text-sm text-slate-500 flex items-center">{sym}</span>
                        <input
                          type="number"
                          step="0.01"
                          value={account.cost ?? ''}
                          onChange={(e) => updateByKey(key, { cost: e.target.value })}
                          placeholder={defaultCost ? `${defaultCost}` : 'standaard'}
                          className="block w-full px-3 py-2 rounded-r-md border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => archiveAccount(key)}
                      className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Verplaats naar archief"
                      aria-label="Account archiveren"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={addAccount}
            className="w-full py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 border-t border-slate-200"
          >
            <PlusIcon className="h-4 w-4" />
            Account toevoegen
          </button>

          {archivedAccounts.length > 0 && (
            <div className="border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowArchive(s => !s)}
                className="w-full px-3.5 py-2 flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 transition-colors"
              >
                <span className="font-medium">Gearchiveerd ({archivedAccounts.length})</span>
                <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${showArchive ? '' : '-rotate-90'}`} />
              </button>
              {showArchive && (
                <div className="divide-y divide-slate-200 bg-slate-50/40">
                  {archivedAccounts.map(account => {
                    const key = keyOf(account);
                    return (
                      <div key={key} className="px-3.5 py-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-600 truncate">{account.owner_name || 'Zonder naam'}</p>
                          <p className="text-xs text-slate-400 tabular-nums">
                            {account.start_date ? formatDate(account.start_date) : '?'}
                            {' → '}
                            {account.end_date ? formatDate(account.end_date) : '∞'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => restoreAccount(key)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Herstellen"
                        >
                          <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                          Herstellen
                        </button>
                        <button
                          type="button"
                          onClick={() => permanentlyDeleteAccount(key)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="Definitief verwijderen — incl. historische cashflow"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Definitief
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Hoofd-component
// ============================================================

function SubscriptionModal({ subscription, categoryOptions = [], typeOptions = [], departmentOptions = [], onAddCategory, onAddType, onAddDepartment, onSave, onClose, saveError }) {
  const [formData, setFormData] = useState({
    name: '', vendor: '', account_owner: '',
    contact_name: '', contact_email: '', contact_phone: '',
    category: '', type: '', department: '',
    cost: '', base_cost: '', currency: 'EUR', cost_period: '',
    seats: 1, cost_per_seat: false,
    is_variable_cost: false,
    start_date: '', end_date: '', renewal_date: '',
    status: 'actief', auto_renew: false,
    terms: '', notes: '',
    document_name: '', document_type: '', document_content: ''
  });

  const [accounts, setAccounts] = useState([]);
  const [billingModel, setBillingModel] = useState('flat');
  const initialAccountsRef = useRef([]);

  // Afgeleide booleans voor leesbaarheid in JSX
  const isFlat       = billingModel === 'flat';
  const isPerSeat    = billingModel === 'per_seat';
  const isPerAccount = billingModel === 'per_account';
  const isLicSeats   = billingModel === 'license_plus_seats';
  const isVariable   = billingModel === 'variable';
  const showSeats    = isPerSeat || isLicSeats;
  const showBase     = isLicSeats || isVariable;
  const showAccounts = isPerAccount;

  useEffect(() => {
    if (subscription) {
      setFormData({
        name: subscription.name || '',
        vendor: subscription.vendor || '',
        account_owner: subscription.account_owner || '',
        contact_name: subscription.contact_name || '',
        contact_email: subscription.contact_email || '',
        contact_phone: subscription.contact_phone || '',
        category: subscription.category || '',
        type: subscription.type || '',
        department: subscription.department || '',
        cost: subscription.cost ?? '',
        base_cost: subscription.base_cost ?? '',
        currency: subscription.currency || 'EUR',
        cost_period: subscription.cost_period || '',
        seats: subscription.seats || 1,
        cost_per_seat: subscription.cost_per_seat || false,
        is_variable_cost: subscription.is_variable_cost || false,
        start_date: subscription.start_date ? subscription.start_date.split('T')[0] : '',
        end_date: subscription.end_date ? subscription.end_date.split('T')[0] : '',
        renewal_date: subscription.renewal_date ? subscription.renewal_date.split('T')[0] : '',
        status: subscription.status || 'actief',
        auto_renew: subscription.auto_renew || false,
        terms: subscription.terms || '',
        notes: subscription.notes || '',
        document_name: subscription.document_name || '',
        document_type: subscription.document_type || '',
        document_content: subscription.document_content || ''
      });

      const subAccounts = subscription.accounts || [];

      // Derive billing model from existing data
      let model = 'flat';
      if (subscription.is_variable_cost) model = 'variable';
      else if (subAccounts.some(a => !a.archived_at)) model = 'per_account';
      else if (subscription.base_cost && parseFloat(subscription.base_cost) > 0) model = 'license_plus_seats';
      else if (subscription.cost_per_seat) model = 'per_seat';
      setBillingModel(model);

      if (subAccounts.length > 0) {
        const formatted = subAccounts.map(a => ({
          id: a.id,
          owner_name: a.owner_name || '',
          start_date: a.start_date ? a.start_date.split('T')[0] : '',
          end_date: a.end_date ? a.end_date.split('T')[0] : '',
          auto_renew: !!a.auto_renew,
          cost: a.cost ?? '',
          archived_at: a.archived_at ?? null,
        }));
        setAccounts(formatted);
        initialAccountsRef.current = formatted;
      }
    }
  }, [subscription]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFormData(prev => ({ ...prev, document_name: '', document_type: '', document_content: '' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Kies een document kleiner dan 5 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        document_name: file.name,
        document_type: file.type || 'application/octet-stream',
        document_content: typeof reader.result === 'string' ? reader.result : ''
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocument = () => {
    setFormData(prev => ({ ...prev, document_name: '', document_type: '', document_content: '' }));
  };

  const [fieldErrors, setFieldErrors] = useState({});
  const [debouncedName, setDebouncedName] = useState(formData.name);
  const [debouncedVendor, setDebouncedVendor] = useState(formData.vendor);

  useEffect(() => { const t = setTimeout(() => setDebouncedName(formData.name), 1000); return () => clearTimeout(t); }, [formData.name]);
  useEffect(() => { const t = setTimeout(() => setDebouncedVendor(formData.vendor), 1000); return () => clearTimeout(t); }, [formData.vendor]);

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Naam is verplicht.';
    if (!formData.department) errors.department = 'Afdeling is verplicht.';
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email))
      errors.contact_email = 'Voer een geldig e-mailadres in.';
    if (formData.cost !== '' && (isNaN(parseFloat(formData.cost)) || parseFloat(formData.cost) < 0))
      errors.cost = 'Voer een geldig bedrag in (bijv. 9.99).';
    if (showSeats && formData.seats !== '' && (isNaN(parseInt(formData.seats)) || parseInt(formData.seats) < 1))
      errors.seats = 'Aantal gebruikers moet minimaal 1 zijn.';
    if (formData.start_date && isNaN(Date.parse(formData.start_date))) errors.start_date = 'Datum niet juist ingevoerd.';
    if (formData.renewal_date && isNaN(Date.parse(formData.renewal_date))) errors.renewal_date = 'Datum niet juist ingevoerd.';
    if (formData.renewal_date && formData.start_date && new Date(formData.renewal_date) < new Date(formData.start_date))
      errors.renewal_date = 'Vervaldatum mag niet vóór de startdatum liggen.';
    if (formData.status === 'actief' && !formData.auto_renew && formData.renewal_date && new Date(formData.renewal_date) < new Date())
      errors.status = 'Status kan niet actief zijn als de vervaldatum al verlopen is en auto-verlenging uit staat.';
    return errors;
  };

  const persistAccounts = async (subscriptionId) => {
    // Vergelijk huidige accounts state met initial ref → insert nieuwe, update bestaande, delete verwijderde
    const initial = initialAccountsRef.current;
    const initialIds = new Set(initial.map(a => a.id).filter(Boolean));
    const currentIds = new Set(accounts.map(a => a.id).filter(Boolean));

    // Delete: ids in initial maar niet in current
    const toDelete = [...initialIds].filter(id => !currentIds.has(id));
    if (toDelete.length > 0) {
      await supabase.from('subscription_accounts').delete().in('id', toDelete);
    }

    // Insert: items zonder id
    const toInsert = accounts.filter(a => !a.id).map(a => ({
      subscription_id: subscriptionId,
      owner_name: a.owner_name || null,
      start_date: a.start_date || null,
      end_date: a.end_date || null,
      auto_renew: !!a.auto_renew,
      cost: a.cost === '' || a.cost === null || a.cost === undefined ? null : parseFloat(a.cost),
      archived_at: a.archived_at || null,
    }));
    if (toInsert.length > 0) {
      await supabase.from('subscription_accounts').insert(toInsert);
    }

    // Update: items met id, vergelijk met initial
    for (const a of accounts) {
      if (!a.id) continue;
      const orig = initial.find(o => o.id === a.id);
      if (!orig) continue;
      const newCost = a.cost === '' || a.cost === null || a.cost === undefined ? null : parseFloat(a.cost);
      const origCost = orig.cost === '' || orig.cost === null || orig.cost === undefined ? null : parseFloat(orig.cost);
      const changed = orig.owner_name !== a.owner_name
        || orig.start_date !== a.start_date
        || orig.end_date !== a.end_date
        || !!orig.auto_renew !== !!a.auto_renew
        || origCost !== newCost
        || (orig.archived_at || null) !== (a.archived_at || null);
      if (changed) {
        // eslint-disable-next-line no-await-in-loop
        await supabase.from('subscription_accounts').update({
          owner_name: a.owner_name || null,
          start_date: a.start_date || null,
          end_date: a.end_date || null,
          auto_renew: !!a.auto_renew,
          cost: newCost,
          archived_at: a.archived_at || null,
          updated_at: new Date().toISOString(),
        }).eq('id', a.id);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const { data: { user } } = await supabase.auth.getUser();

    // Bij multi-account modus: account_owner en seats spelen geen rol meer
    // Apply billing model rules — alleen relevante velden bewaren per model
    const baseCostParsed = formData.base_cost === '' || formData.base_cost === null
      ? null
      : (parseFloat(formData.base_cost) || 0);

    const dataToSave = {
      ...formData,
      account_owner: isPerAccount ? null : (formData.account_owner || null),
      category: formData.category || 'Overig',
      cost: parseFloat(formData.cost) || 0,
      base_cost: showBase ? baseCostParsed : null,
      seats: showSeats ? (parseInt(formData.seats) || 1) : 1,
      cost_per_seat: showSeats,
      is_variable_cost: isVariable,
      start_date: formData.start_date || null,
      end_date: null,
      // Bij per_account modus: parent renewal/auto_renew zijn niet meer relevant
      renewal_date: isPerAccount ? null : (formData.renewal_date || null),
      auto_renew: isPerAccount ? false : !!formData.auto_renew,
      created_by: user?.id
    };

    const result = await onSave(dataToSave);
    if (result?.error) return;

    const savedSub = result?.data ?? subscription;
    if (savedSub?.id) {
      let accountsChanged = false;
      if (isPerAccount) {
        await persistAccounts(savedSub.id);
        accountsChanged = true;
      } else if (initialAccountsRef.current.length > 0) {
        // Model gewijzigd weg van per-account → alle accounts verwijderen
        await supabase.from('subscription_accounts').delete().eq('subscription_id', savedSub.id);
        accountsChanged = true;
      }

      // Snapshot opnieuw opbouwen met de actuele accounts staat — anders staan
      // historische maanden + cashflow grafiek nog op de oude waardes.
      if (accountsChanged) {
        await recomputeSubscriptionSnapshots(supabase, savedSub.id);
      }
    }
  };

  const monthlyPreview = (() => {
    const cost = parseFloat(formData.cost) || 0;
    const baseFee = showBase ? (parseFloat(formData.base_cost) || 0) : 0;
    let variablePerPeriod = 0;

    if (isPerAccount) {
      const today = new Date();
      const activeAccounts = accounts.filter(a => {
        const start = a.start_date ? new Date(a.start_date) : null;
        const end = a.end_date ? new Date(a.end_date) : null;
        if (start && start > today) return false;
        if (end && end < today && !a.auto_renew) return false;
        return true;
      });
      variablePerPeriod = activeAccounts.reduce((sum, a) => {
        const c = a.cost !== '' && a.cost !== null && a.cost !== undefined
          ? parseFloat(a.cost) || 0
          : cost;
        return sum + c;
      }, 0);
    } else if (showSeats) {
      const seats = parseInt(formData.seats) || 1;
      variablePerPeriod = cost * seats;
    } else {
      // flat / variable: cost is het hele bedrag
      variablePerPeriod = cost;
    }

    const total = baseFee + variablePerPeriod;
    if (total === 0) return null;
    return toMonthly(total, formData.cost_period);
  })();

  const sym = currencySymbol(formData.currency);

  return (
    <Modal onClose={onClose} size="2xl" scrollable ariaLabel={subscription ? 'Abonnement bewerken' : 'Nieuw abonnement'}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-4">
          {(debouncedVendor || debouncedName) && (
            <SubLogo vendor={debouncedVendor} name={debouncedName} size="xl" />
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-900">{subscription ? 'Bewerk abonnement' : 'Nieuw abonnement'}</h2>
            {(formData.name || formData.vendor) && (
              <p className="text-sm text-slate-400 mt-0.5">{formData.vendor || formData.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <form id="sub-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-7">
        {/* Basis */}
        <Section label="Basis">
          <FieldGrid>
            <Field label="Naam" required value={formData.name} error={fieldErrors.name}>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Bijv. LinkedIn Pro"
                className={fieldErrors.name ? inputClassError : inputClass}
              />
            </Field>
            <Field label="Leverancier" value={formData.vendor}>
              <input type="text" name="vendor" value={formData.vendor} onChange={handleChange} placeholder="Bijv. Microsoft" className={inputClass} />
            </Field>
            <Field label="Status" value={formData.status} error={fieldErrors.status}>
              <select name="status" value={formData.status} onChange={handleChange} className={fieldErrors.status ? inputClassError : inputClass}>
                <option value="actief">Actief</option>
                <option value="verlopen">Verlopen</option>
                <option value="opgezegd">Opgezegd</option>
              </select>
            </Field>
          </FieldGrid>
        </Section>

        <hr className="border-slate-100" />

        {/* Kosten & facturatie */}
        <Section label="Kosten & facturatie">

          {/* Kernvraag: hoe wordt dit afgerekend */}
          <Field label="Hoe wordt dit afgerekend?" value={billingModel}>
            <select
              value={billingModel}
              onChange={(e) => setBillingModel(e.target.value)}
              className={inputClass}
            >
              <option value="flat">Vast bedrag</option>
              <option value="per_seat">Per gebruiker</option>
              <option value="per_account">Per persoonlijk account</option>
              <option value="license_plus_seats">Vaste licentie + per gebruiker</option>
              <option value="variable">Op basis van verbruik</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              {isFlat        && <>Eén vast bedrag per facturatieperiode. Bv. Slack workspace, Netflix.</>}
              {isPerSeat     && <>Iedere gebruiker betaalt hetzelfde tarief × aantal gebruikers. Bv. Microsoft 365, Slack Pro.</>}
              {isPerAccount  && <>Iedere medewerker heeft een eigen account met eigen start-/einddatum en eventueel eigen prijs. Bv. LinkedIn Pro, Adobe individueel.</>}
              {isLicSeats    && <>Vaste licentie naast variabele kosten per gebruiker. Bv. Carerix (€300 licentie + €10/gebruiker).</>}
              {isVariable    && <>Bedrag varieert per maand op basis van gebruik — vul een schatting in. Optioneel: voeg vaste licentiekosten toe als die er ook zijn. Bv. AWS, Stripe fees, OpenAI API.</>}
            </p>
          </Field>

          {/* Kosten input — label & beschikbaarheid wisselt per model */}
          <FieldGrid>
            <Field
              label={
                isPerSeat        ? 'Prijs per gebruiker' :
                isPerAccount     ? 'Standaardprijs per account' :
                isLicSeats       ? 'Prijs per gebruiker' :
                isVariable       ? 'Geschatte kosten' :
                                   'Bedrag'
              }
              value={formData.cost}
              error={fieldErrors.cost}
              hint={isPerAccount ? 'Default — kan per account overschreven worden.' : undefined}
            >
              <div className="flex">
                <select name="currency" value={formData.currency} onChange={handleChange} className="px-2 py-2 border border-slate-200 border-r-0 rounded-l-md bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="EUR">€ EUR</option>
                  <option value="USD">$ USD</option>
                  <option value="GBP">£ GBP</option>
                  <option value="CHF">Fr. CHF</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2 rounded-r-md border ${fieldErrors.cost ? 'border-red-300 bg-red-50/40' : 'border-slate-200'} text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary`}
                />
              </div>
            </Field>
            <Field label="Facturatieperiode" value={formData.cost_period}>
              <select name="cost_period" value={formData.cost_period} onChange={handleChange} className={inputClass}>
                <option value="">Kies een periode</option>
                {BILLING_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
          </FieldGrid>

          {/* Conditional: vaste licentiekosten (license_plus_seats of variable) */}
          {showBase && (
            <Field
              label={isVariable ? 'Vaste licentiekosten (optioneel)' : 'Vaste licentiekosten'}
              value={formData.base_cost}
              hint={isVariable
                ? 'Wordt opgeteld bij de variabele kosten. Laat leeg als er geen vast licentiedeel is.'
                : 'Wordt opgeteld bij de per-gebruiker kosten.'}
            >
              <div className="flex max-w-xs">
                <span className="px-3 py-2 border border-slate-200 border-r-0 rounded-l-md bg-slate-50 text-sm text-slate-500">{sym}</span>
                <input
                  type="number"
                  step="0.01"
                  name="base_cost"
                  value={formData.base_cost}
                  onChange={handleChange}
                  placeholder="0,00"
                  className="block w-full px-3 py-2 rounded-r-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </Field>
          )}

          {/* Conditional: aantal gebruikers */}
          {showSeats && (
            <Field label="Aantal gebruikers" value={formData.seats} error={fieldErrors.seats}>
              <input
                type="number"
                name="seats"
                min="1"
                value={formData.seats}
                onChange={handleChange}
                className={`max-w-[120px] ${fieldErrors.seats ? inputClassError : inputClass}`}
              />
            </Field>
          )}

          {/* Conditional: accounts manager */}
          {showAccounts && (
            <AccountsManager
              accounts={accounts}
              onChange={setAccounts}
              defaultCost={formData.cost}
              currency={formData.currency}
              period={formData.cost_period}
            />
          )}

          {/* Live preview onderaan */}
          {monthlyPreview !== null && (() => {
            const baseFee = showBase ? (parseFloat(formData.base_cost) || 0) : 0;
            const baseFeeMonthly = toMonthly(baseFee, formData.cost_period);
            const variableMonthly = monthlyPreview - baseFeeMonthly;
            const showBreakdown = baseFee > 0 && variableMonthly > 0;
            return (
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 flex items-baseline justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Maandtotaal</span>
                <div className="text-sm tabular-nums">
                  <span className="font-semibold text-slate-900">
                    {isVariable ? '± ' : '≈ '}{sym}{monthlyPreview.toFixed(2)}
                  </span>
                  <span className="text-slate-400 ml-1">/mnd</span>
                  {showBreakdown && (
                    <span className="ml-3 text-slate-400">
                      ({sym}{baseFeeMonthly.toFixed(2)} licentie + {isVariable ? '± ' : ''}{sym}{variableMonthly.toFixed(2)} {isVariable ? 'verbruik' : 'variabel'})
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </Section>

        <hr className="border-slate-100" />

        {/* Categorisatie */}
        <Section label="Categorisatie">
          <FieldGrid>
            <AddableSelect
              label="Afdeling"
              value={formData.department}
              options={departmentOptions}
              onChange={(v) => setFormData(prev => ({ ...prev, department: v }))}
              onAdd={onAddDepartment}
              error={fieldErrors.department}
              required
            />
            <AddableSelect
              label="Categorie"
              value={formData.category}
              options={categoryOptions}
              onChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
              onAdd={onAddCategory}
              error={fieldErrors.category}
              hint="Optioneel — leeg = automatisch 'Overig'."
            />
          </FieldGrid>
        </Section>

        <hr className="border-slate-100" />

        {/* Datums & verlenging */}
        <Section label={isPerAccount ? 'Startdatum' : 'Datums & verlenging'}>
          <FieldGrid>
            <Field
              label="Startdatum"
              value={formData.start_date}
              error={fieldErrors.start_date}
              hint={!fieldErrors.start_date
                ? (isPerAccount
                    ? 'Wanneer dit abonnement begon — gebruikt voor historische cashflow.'
                    : 'Mag leeg gelaten worden.')
                : undefined}
            >
              <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className={fieldErrors.start_date ? inputClassError : inputClass} />
            </Field>
            {!isPerAccount && (
              <Field
                label="Vervaldatum"
                value={formData.renewal_date}
                error={fieldErrors.renewal_date}
                hint={!fieldErrors.renewal_date
                  ? (formData.auto_renew
                      ? 'Schuift automatisch door naar volgende periode op deze datum.'
                      : 'Op deze datum stopt het abonnement (tenzij verlengd).')
                  : undefined}
              >
                <input type="date" name="renewal_date" value={formData.renewal_date} onChange={handleChange} className={fieldErrors.renewal_date ? inputClassError : inputClass} />
              </Field>
            )}
          </FieldGrid>
          {!isPerAccount && (
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
              <ToggleSwitch
                label="Auto-verlenging"
                hint={formData.auto_renew
                  ? 'Vervaldatum schuift automatisch door bij elke periode. Het abonnement blijft actief.'
                  : 'Abonnement stopt op de vervaldatum. Schakel uit voor abonnementen die je opzegt.'}
                checked={formData.auto_renew}
                onChange={(v) => setFormData(prev => ({ ...prev, auto_renew: v }))}
              />
            </div>
          )}
        </Section>

        <hr className="border-slate-100" />

        {/* Contact (collapsible) */}
        <CollapsibleSection label="Contact" hint="Contactpersoon bij de leverancier — optioneel">
          <FieldGrid>
            <Field label="Contactpersoon" value={formData.contact_name}>
              <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} className={inputClass} />
            </Field>
            <Field label="E-mail contact" value={formData.contact_email} error={fieldErrors.contact_email}>
              <input type="text" name="contact_email" value={formData.contact_email} onChange={handleChange} className={fieldErrors.contact_email ? inputClassError : inputClass} />
            </Field>
            <Field label="Telefoon contact" value={formData.contact_phone}>
              <input type="tel" name="contact_phone" value={formData.contact_phone} onChange={handleChange} className={inputClass} />
            </Field>
          </FieldGrid>
        </CollapsibleSection>

        <hr className="border-slate-100" />

        {/* Extra (collapsible) */}
        <CollapsibleSection label="Notities & document" hint="Contractvoorwaarden, bijlage, vrije notities">
          <Field label="Contractvoorwaarden" value={formData.terms}>
            <textarea name="terms" value={formData.terms} onChange={handleChange} rows={3} className={inputClass} />
          </Field>
          <Field label="Document" hint="PDF, Word, afbeelding of tekst tot 5 MB.">
            <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" onChange={handleFileChange} className={inputClass} />
            {formData.document_name && (
              <div className="mt-2 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <div className="font-medium text-slate-700">Geselecteerd document</div>
                  <div className="text-slate-500">{formData.document_name}</div>
                </div>
                <div className="flex items-center gap-3">
                  {formData.document_content && (
                    <a href={formData.document_content} download={formData.document_name} className="text-primary hover:underline">Open</a>
                  )}
                  <button type="button" onClick={handleRemoveDocument} className="text-red-500 hover:underline">Verwijder</button>
                </div>
              </div>
            )}
          </Field>
          <Field label="Notities" value={formData.notes}>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className={inputClass} />
          </Field>
        </CollapsibleSection>

        {saveError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {saveError}
          </div>
        )}
      </form>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 sticky bottom-0">
        <button type="button" onClick={onClose} className="btn-secondary">Annuleren</button>
        <button type="submit" form="sub-form" className="btn-primary">Opslaan</button>
      </div>
    </Modal>
  );
}

export default SubscriptionModal;

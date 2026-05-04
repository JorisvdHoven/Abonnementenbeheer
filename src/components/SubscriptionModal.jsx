import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BILLING_PERIODS, toMonthly } from '../lib/costUtils';
import { currencySymbol } from '../lib/format';
import { ChevronDownIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
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
  const addAccount = () => {
    onChange([...accounts, { _tempId: crypto.randomUUID(), owner_name: '', start_date: '', end_date: '', cost: '' }]);
  };

  const updateAccount = (idx, patch) => {
    onChange(accounts.map((a, i) => i === idx ? { ...a, ...patch } : a));
  };

  const removeAccount = (idx) => {
    onChange(accounts.filter((_, i) => i !== idx));
  };

  const sym = currencySymbol(currency);
  const totalMonthly = accounts.reduce((sum, a) => {
    const cost = a.cost !== '' && a.cost !== null && a.cost !== undefined
      ? parseFloat(a.cost) || 0
      : parseFloat(defaultCost) || 0;
    return sum + toMonthly(cost, period);
  }, 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden">
      <div className="px-3.5 py-2.5 bg-slate-100/70 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
        {totalMonthly > 0 && (
          <span className="text-slate-500">≈ {sym}{totalMonthly.toFixed(2)} totaal/mnd</span>
        )}
      </div>
      {accounts.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-slate-400">Nog geen accounts toegevoegd.</p>
          <button type="button" onClick={addAccount} className="btn-primary text-sm mt-3 inline-flex items-center gap-1.5">
            <PlusIcon className="h-4 w-4" />
            Eerste account toevoegen
          </button>
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-200">
            {accounts.map((account, idx) => (
              <div
                key={account.id ?? account._tempId ?? idx}
                className="p-3 grid grid-cols-1 sm:grid-cols-[1fr,140px,140px,140px,auto] gap-2 items-end"
              >
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Naam medewerker</label>
                  <input
                    type="text"
                    value={account.owner_name || ''}
                    onChange={(e) => updateAccount(idx, { owner_name: e.target.value })}
                    placeholder="Bijv. Joris van den Hoven"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Startdatum</label>
                  <input
                    type="date"
                    value={account.start_date || ''}
                    onChange={(e) => updateAccount(idx, { start_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Einddatum</label>
                  <input
                    type="date"
                    value={account.end_date || ''}
                    onChange={(e) => updateAccount(idx, { end_date: e.target.value })}
                    className={inputClass}
                  />
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
                      onChange={(e) => updateAccount(idx, { cost: e.target.value })}
                      placeholder={defaultCost ? `${defaultCost}` : 'standaard'}
                      className="block w-full px-3 py-2 rounded-r-md border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAccount(idx)}
                  className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  aria-label="Account verwijderen"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addAccount}
            className="w-full py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 border-t border-slate-200"
          >
            <PlusIcon className="h-4 w-4" />
            Account toevoegen
          </button>
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
    cost: '', currency: 'EUR', cost_period: '',
    seats: 1, cost_per_seat: false,
    start_date: '', end_date: '', renewal_date: '',
    status: 'actief', auto_renew: false,
    terms: '', notes: '',
    document_name: '', document_type: '', document_content: ''
  });

  const [accounts, setAccounts] = useState([]);
  const [multiAccount, setMultiAccount] = useState(false);
  const initialAccountsRef = useRef([]);

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
        currency: subscription.currency || 'EUR',
        cost_period: subscription.cost_period || '',
        seats: subscription.seats || 1,
        cost_per_seat: subscription.cost_per_seat || false,
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
      if (subAccounts.length > 0) {
        setMultiAccount(true);
        const formatted = subAccounts.map(a => ({
          id: a.id,
          owner_name: a.owner_name || '',
          start_date: a.start_date ? a.start_date.split('T')[0] : '',
          end_date: a.end_date ? a.end_date.split('T')[0] : '',
          cost: a.cost ?? '',
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
    if (!formData.type) errors.type = 'Type is verplicht.';
    if (!formData.department) errors.department = 'Afdeling is verplicht.';
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email))
      errors.contact_email = 'Voer een geldig e-mailadres in.';
    if (formData.cost !== '' && (isNaN(parseFloat(formData.cost)) || parseFloat(formData.cost) < 0))
      errors.cost = 'Voer een geldig bedrag in (bijv. 9.99).';
    if (!multiAccount && formData.seats !== '' && (isNaN(parseInt(formData.seats)) || parseInt(formData.seats) < 1))
      errors.seats = 'Aantal seats moet minimaal 1 zijn.';
    if (formData.start_date && isNaN(Date.parse(formData.start_date))) errors.start_date = 'Datum niet juist ingevoerd.';
    if (formData.end_date && isNaN(Date.parse(formData.end_date))) errors.end_date = 'Datum niet juist ingevoerd.';
    if (formData.end_date && formData.start_date && new Date(formData.end_date) < new Date(formData.start_date))
      errors.end_date = 'Einddatum mag niet vóór de startdatum liggen.';
    if (formData.renewal_date && isNaN(Date.parse(formData.renewal_date))) errors.renewal_date = 'Datum niet juist ingevoerd.';
    if (formData.status === 'actief' && formData.end_date && new Date(formData.end_date) < new Date())
      errors.status = 'Status kan niet actief zijn als de einddatum al verlopen is.';
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
      cost: a.cost === '' || a.cost === null || a.cost === undefined ? null : parseFloat(a.cost),
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
        || origCost !== newCost;
      if (changed) {
        // eslint-disable-next-line no-await-in-loop
        await supabase.from('subscription_accounts').update({
          owner_name: a.owner_name || null,
          start_date: a.start_date || null,
          end_date: a.end_date || null,
          cost: newCost,
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
    const dataToSave = {
      ...formData,
      account_owner: multiAccount ? null : (formData.account_owner || null),
      category: formData.category || 'Overig',
      cost: parseFloat(formData.cost) || 0,
      seats: multiAccount ? 1 : (parseInt(formData.seats) || 1),
      cost_per_seat: multiAccount ? false : formData.cost_per_seat,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      renewal_date: formData.renewal_date || null,
      created_by: user?.id
    };

    const result = await onSave(dataToSave);
    if (result?.error) return;

    const savedSub = result?.data ?? subscription;
    if (savedSub?.id) {
      let accountsChanged = false;
      if (multiAccount) {
        await persistAccounts(savedSub.id);
        accountsChanged = true;
      } else if (initialAccountsRef.current.length > 0) {
        // Toggle uitgezet → alle accounts verwijderen
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
    if (multiAccount) {
      const today = new Date();
      const activeAccounts = accounts.filter(a => {
        const start = a.start_date ? new Date(a.start_date) : null;
        const end = a.end_date ? new Date(a.end_date) : null;
        if (start && start > today) return false;
        if (end && end < today) return false;
        return true;
      });
      if (activeAccounts.length === 0) return null;
      const totalCost = activeAccounts.reduce((sum, a) => {
        const c = a.cost !== '' && a.cost !== null && a.cost !== undefined
          ? parseFloat(a.cost) || 0
          : parseFloat(formData.cost) || 0;
        return sum + c;
      }, 0);
      return toMonthly(totalCost, formData.cost_period);
    }
    const baseMonthly = toMonthly(parseFloat(formData.cost) || 0, formData.cost_period);
    if (!baseMonthly) return null;
    const seats = parseInt(formData.seats) || 1;
    return baseMonthly * (formData.cost_per_seat ? seats : 1);
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
          <FieldGrid>
            <Field label={multiAccount ? 'Standaardprijs per account' : 'Kosten'} value={formData.cost} error={fieldErrors.cost} hint={multiAccount ? 'Wordt gebruikt als geen eigen prijs is ingevuld bij een account.' : undefined}>
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

          {monthlyPreview !== null && (
            <div className="text-xs text-slate-500 -mt-1">
              ≈ {sym}{monthlyPreview.toFixed(2)} per maand totaal
            </div>
          )}

          <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
            <ToggleSwitch
              label="Heeft meerdere accounts"
              hint="Voor abonnementen waar elke medewerker een eigen account heeft (bv. LinkedIn Pro, Adobe). Elk account heeft een eigen start- en einddatum."
              checked={multiAccount}
              onChange={setMultiAccount}
            />
          </div>

          {multiAccount ? (
            <AccountsManager
              accounts={accounts}
              onChange={setAccounts}
              defaultCost={formData.cost}
              currency={formData.currency}
              period={formData.cost_period}
            />
          ) : (
            <FieldGrid>
              <Field label="Aantal seats" value={formData.seats} error={fieldErrors.seats}>
                <input type="number" name="seats" value={formData.seats} onChange={handleChange} className={fieldErrors.seats ? inputClassError : inputClass} />
              </Field>
              <div className="flex items-end pb-1">
                <ToggleSwitch
                  label="Prijs per seat"
                  hint="Vermenigvuldig kosten met aantal seats."
                  checked={formData.cost_per_seat}
                  onChange={(v) => setFormData(prev => ({ ...prev, cost_per_seat: v }))}
                />
              </div>
            </FieldGrid>
          )}
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
              label="Type"
              value={formData.type}
              options={typeOptions}
              onChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
              onAdd={onAddType}
              error={fieldErrors.type}
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
        <Section label="Datums & verlenging">
          <FieldGrid>
            <Field label="Startdatum" value={formData.start_date} error={fieldErrors.start_date} hint={!fieldErrors.start_date ? 'Mag leeg gelaten worden.' : undefined}>
              <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className={fieldErrors.start_date ? inputClassError : inputClass} />
            </Field>
            <Field label="Einddatum" value={formData.end_date} error={fieldErrors.end_date} hint={!fieldErrors.end_date ? 'Laat leeg als er geen vaste einddatum is.' : undefined}>
              <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className={fieldErrors.end_date ? inputClassError : inputClass} />
            </Field>
            <Field label="Verlengingsdatum" value={formData.renewal_date} error={fieldErrors.renewal_date} hint={!fieldErrors.renewal_date ? 'Wordt gebruikt voor verloopmeldingen.' : undefined}>
              <input type="date" name="renewal_date" value={formData.renewal_date} onChange={handleChange} className={fieldErrors.renewal_date ? inputClassError : inputClass} />
            </Field>
            <div className="flex items-end pb-1">
              <ToggleSwitch
                label="Auto-verlenging"
                checked={formData.auto_renew}
                onChange={(v) => setFormData(prev => ({ ...prev, auto_renew: v }))}
              />
            </div>
          </FieldGrid>
        </Section>

        <hr className="border-slate-100" />

        {/* Contact (collapsible) */}
        <CollapsibleSection label="Contact" hint="Contactpersoon bij de leverancier — optioneel">
          <FieldGrid>
            {!multiAccount && (
              <Field label="Account van" value={formData.account_owner} hint="De interne medewerker bij wie dit account hoort.">
                <input type="text" name="account_owner" value={formData.account_owner} onChange={handleChange} placeholder="Bijv. Joris van den Hoven" className={inputClass} />
              </Field>
            )}
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

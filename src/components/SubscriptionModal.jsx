import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BILLING_PERIODS, toMonthly } from '../lib/costUtils';
import { SubLogo } from './SubLogo';

function AddableSelect({ label, value, options, onChange, onAdd, error, required, tooltip }) {
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  const handleSelect = (e) => {
    if (e.target.value === '__new__') {
      setAdding(true);
    } else {
      onChange(e.target.value);
    }
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
    <div>
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          {label}{required && <span className={`ml-0.5 ${value ? 'text-gray-900' : 'text-red-500'}`}>*</span>}
        </label>
        {tooltip && (
          <div className="relative group mb-0.5">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-300 text-white text-xs font-bold cursor-default select-none">i</span>
            <span className="absolute left-6 top-1/2 -translate-y-1/2 z-10 hidden group-hover:block w-64 rounded-md bg-slate-800 text-white text-xs p-3 shadow-lg font-normal">
              {tooltip}
            </span>
          </div>
        )}
      </div>
      {adding ? (
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={`Nieuwe ${label.toLowerCase()}...`}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
          <button type="button" onClick={handleConfirm} className="btn-primary whitespace-nowrap">Toevoegen</button>
          <button type="button" onClick={() => { setAdding(false); setNewValue(''); }} className="btn-secondary">✕</button>
        </div>
      ) : (
        <select
          value={value}
          onChange={handleSelect}
          className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary ${error ? 'border-red-400' : 'border-gray-300'}`}
        >
          <option value="">Kies een {label.toLowerCase()}</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          <option disabled>──────────</option>
          <option value="__new__">+ Nieuwe {label.toLowerCase()} toevoegen</option>
        </select>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SubscriptionModal({ subscription, categoryOptions = [], typeOptions = [], onAddCategory, onAddType, onSave, onClose, saveError }) {
  const [formData, setFormData] = useState({
    name: '',
    vendor: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    category: '',
    type: '',
    cost: '',
    currency: 'EUR',
    cost_period: '',
    seats: 1,
    cost_per_seat: false,
    start_date: '',
    end_date: '',
    renewal_date: '',
    status: 'actief',
    auto_renew: false,
    terms: '',
    notes: '',
    document_name: '',
    document_type: '',
    document_content: ''
  });

  useEffect(() => {
    if (subscription) {
      setFormData({
        name: subscription.name || '',
        vendor: subscription.vendor || '',
        contact_name: subscription.contact_name || '',
        contact_email: subscription.contact_email || '',
        contact_phone: subscription.contact_phone || '',
        category: subscription.category || '',
        type: subscription.type || '',
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
    }
  }, [subscription]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setFormData(prev => ({
        ...prev,
        document_name: '',
        document_type: '',
        document_content: ''
      }));
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
    setFormData(prev => ({
      ...prev,
      document_name: '',
      document_type: '',
      document_content: ''
    }));
  };

  const [fieldErrors, setFieldErrors] = useState({});
  const [debouncedName, setDebouncedName] = useState(formData.name);
  const [debouncedVendor, setDebouncedVendor] = useState(formData.vendor);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(formData.name), 1000);
    return () => clearTimeout(t);
  }, [formData.name]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedVendor(formData.vendor), 1000);
    return () => clearTimeout(t);
  }, [formData.vendor]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const validate = () => {
    const errors = {};
    if (!formData.name.trim())
      errors.name = 'Naam is verplicht.';
    if (!formData.category)
      errors.category = 'Categorie is verplicht.';
    if (!formData.type)
      errors.type = 'Type is verplicht.';
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email))
      errors.contact_email = 'Voer een geldig e-mailadres in.';
    if (formData.cost !== '' && (isNaN(parseFloat(formData.cost)) || parseFloat(formData.cost) < 0))
      errors.cost = 'Voer een geldig bedrag in (bijv. 9.99).';
    if (formData.seats !== '' && (isNaN(parseInt(formData.seats)) || parseInt(formData.seats) < 1))
      errors.seats = 'Aantal seats moet minimaal 1 zijn.';
    if (formData.start_date && isNaN(Date.parse(formData.start_date)))
      errors.start_date = 'Datum niet juist ingevoerd.';
    if (formData.end_date && isNaN(Date.parse(formData.end_date)))
      errors.end_date = 'Datum niet juist ingevoerd.';
    if (formData.end_date && formData.start_date && new Date(formData.end_date) < new Date(formData.start_date))
      errors.end_date = 'Einddatum mag niet vóór de startdatum liggen.';
    if (formData.renewal_date && isNaN(Date.parse(formData.renewal_date)))
      errors.renewal_date = 'Datum niet juist ingevoerd.';
    return errors;
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
    const dataToSave = {
      ...formData,
      cost: parseFloat(formData.cost) || 0,
      seats: parseInt(formData.seats) || 1,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      renewal_date: formData.renewal_date || null,
      created_by: user?.id
    };
    await onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60">
      <div className="surface-card-strong max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-5">
            {(debouncedVendor || debouncedName) && (
              <SubLogo vendor={debouncedVendor} name={debouncedName} size="xl" />
            )}
            <div>
              <h2 className="text-xl font-bold">{subscription ? 'Bewerk abonnement' : 'Nieuw abonnement'}</h2>
              {(formData.name || formData.vendor) && (
                <p className="text-sm text-slate-400 mt-0.5">{formData.vendor || formData.name}</p>
              )}
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Naam <span className={formData.name.trim() ? 'text-gray-900' : 'text-red-500'}>*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary ${fieldErrors.name ? 'border-red-400' : 'border-gray-300'}`}
                />
                {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Leverancier</label>
                <input
                  type="text"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contactpersoon</label>
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">E-mail contact</label>
                <input
                  type="text"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary ${fieldErrors.contact_email ? 'border-red-400' : 'border-gray-300'}`}
                />
                {fieldErrors.contact_email && <p className="mt-1 text-xs text-red-600">{fieldErrors.contact_email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefoon contact</label>
                <input
                  type="tel"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <AddableSelect
                label="Categorie"
                value={formData.category}
                options={categoryOptions}
                onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                onAdd={onAddCategory}
                error={fieldErrors.category}
                required
                tooltip="Categorie geeft aan tot welk bedrijfsonderdeel of kostenpost een abonnement behoort. Voorbeelden: Software, Hardware, Marketing, HR."
              />
              <AddableSelect
                label="Type"
                value={formData.type}
                options={typeOptions}
                onChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
                onAdd={onAddType}
                error={fieldErrors.type}
                required
                tooltip="Type geeft aan op welke manier een abonnement wordt afgerekend. Voorbeelden: Licentie, Abonnement, Pay-per-use, Eenmalig."
              />
              <div>
                <label className="block text-sm font-medium text-gray-700">Kosten</label>
                <div className="mt-1 flex">
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="px-2 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-sm focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="EUR">€ EUR</option>
                    <option value="USD">$ USD</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    name="cost"
                    value={formData.cost}
                    onChange={handleChange}
                    className={`block w-full px-3 py-2 border rounded-r-md focus:outline-none focus:ring-primary focus:border-primary ${fieldErrors.cost ? 'border-red-400' : 'border-gray-300'}`}
                  />
                </div>
                {fieldErrors.cost && <p className="mt-1 text-xs text-red-600">{fieldErrors.cost}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Facturatieperiode</label>
                <select
                  name="cost_period"
                  value={formData.cost_period}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="">Kies een periode</option>
                  {BILLING_PERIODS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                {formData.cost_period && formData.cost_period !== 'Maandelijks' && formData.cost_period !== 'Eenmalig' && formData.cost !== '' && (
                  <p className="mt-1 text-xs text-slate-500">
                    ≈ {formData.currency === 'USD' ? '$' : '€'}{(toMonthly(parseFloat(formData.cost), formData.cost_period) * (formData.cost_per_seat ? (parseInt(formData.seats) || 1) : 1)).toFixed(2)} per maand{formData.cost_per_seat && parseInt(formData.seats) > 1 ? ` (${formData.seats} seats)` : ''}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Seats</label>
                <input
                  type="number"
                  name="seats"
                  value={formData.seats}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary ${fieldErrors.seats ? 'border-red-400' : 'border-gray-300'}`}
                />
                {fieldErrors.seats && <p className="mt-1 text-xs text-red-600">{fieldErrors.seats}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cost_per_seat"
                    name="cost_per_seat"
                    checked={formData.cost_per_seat}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="cost_per_seat" className="text-sm text-gray-600">Prijs per seat</label>
                  <div className="relative group">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-300 text-white text-xs font-bold cursor-default select-none">i</span>
                    <span className="absolute right-0 bottom-6 z-10 hidden group-hover:block w-72 rounded-md bg-slate-800 text-white text-xs p-3 shadow-lg font-normal">
                      Als ingeschakeld wordt de kosten vermenigvuldigd met het aantal seats. Handig als je per gebruiker betaalt, bijv. €10 × 5 seats = €50 per maand.
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="actief">Actief</option>
                  <option value="verlopen">Verlopen</option>
                  <option value="opgezegd">Opgezegd</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Startdatum</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary ${fieldErrors.start_date ? 'border-red-400' : 'border-gray-300'}`}
                />
                {fieldErrors.start_date
                  ? <p className="mt-1 text-xs text-red-600">{fieldErrors.start_date}</p>
                  : <p className="mt-1 text-xs text-gray-400">Mag leeg gelaten worden.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Einddatum</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary ${fieldErrors.end_date ? 'border-red-400' : 'border-gray-300'}`}
                />
                {fieldErrors.end_date
                  ? <p className="mt-1 text-xs text-red-600">{fieldErrors.end_date}</p>
                  : <p className="mt-1 text-xs text-gray-400">Laat leeg als er geen vaste einddatum is.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Verlengingsdatum</label>
                <input
                  type="date"
                  name="renewal_date"
                  value={formData.renewal_date}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary ${fieldErrors.renewal_date ? 'border-red-400' : 'border-gray-300'}`}
                />
                {fieldErrors.renewal_date
                  ? <p className="mt-1 text-xs text-red-600">{fieldErrors.renewal_date}</p>
                  : <p className="mt-1 text-xs text-gray-400">Wordt gebruikt voor verloopmeldingen op het dashboard.</p>}
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="auto_renew"
                  checked={formData.auto_renew}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">Auto-verlenging</label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contractvoorwaarden</label>
              <textarea
                name="terms"
                value={formData.terms}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Document</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                onChange={handleFileChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-gray-500">Ondersteunt onder andere PDF, Word, afbeeldingen en tekstbestanden tot 5 MB.</p>
              {formData.document_name && (
                <div className="mt-2 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-700">Geselecteerd document</div>
                    <div className="text-slate-500">{formData.document_name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {formData.document_content && (
                      <a
                        href={formData.document_content}
                        download={formData.document_name}
                        className="text-primary hover:underline"
                      >
                        Open
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveDocument}
                      className="text-red-600 hover:underline"
                    >
                      Verwijder document
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notities</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            {saveError && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {saveError}
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Opslaan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionModal;
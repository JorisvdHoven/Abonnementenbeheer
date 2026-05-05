import { useState } from 'react';
import Modal from './Modal';

const FIELDS = [
  { key: 'department', label: 'Afdeling',  type: 'select' },
  { key: 'category',   label: 'Categorie', type: 'select' },
  { key: 'status',     label: 'Status',    type: 'fixed', options: ['actief', 'verlopen', 'opgezegd'] },
];

function BulkEditModal({ count, categoryOptions = [], typeOptions = [], departmentOptions = [], onApply, onClose }) {
  const [field, setField] = useState('department');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fieldDef = FIELDS.find(f => f.key === field);

  const optionsFor = (key) => {
    if (key === 'department') return departmentOptions;
    if (key === 'category') return categoryOptions;
    return [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!value) return;
    setSaving(true);
    await onApply(field, value);
    setSaving(false);
  };

  return (
    <Modal onClose={() => !saving && onClose()} size="md" ariaLabel="Bulk wijzigen">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-dark">Bulk wijzigen</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Wijzig één veld voor <strong>{count} abonnement{count !== 1 ? 'en' : ''}</strong> tegelijk.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Veld</label>
          <select
            value={field}
            onChange={(e) => { setField(e.target.value); setValue(''); }}
            className="field-strong w-full px-3 py-2 rounded-md border focus:outline-none"
          >
            {FIELDS.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nieuwe waarde</label>
          {fieldDef.type === 'select' && (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="field-strong w-full px-3 py-2 rounded-md border focus:outline-none"
              required
            >
              <option value="">Kies een {fieldDef.label.toLowerCase()}</option>
              {optionsFor(field).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
          {fieldDef.type === 'fixed' && (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="field-strong w-full px-3 py-2 rounded-md border focus:outline-none"
              required
            >
              <option value="">Kies een status</option>
              {fieldDef.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-secondary"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={saving || !value}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Bezig...' : `Wijzig ${count} abonnement${count !== 1 ? 'en' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default BulkEditModal;

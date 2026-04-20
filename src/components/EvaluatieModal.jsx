import { useState, useEffect } from 'react';

function EvaluatieModal({ subscription, existing, onSave, onClose }) {
  const [usagePct, setUsagePct] = useState(existing?.usage_pct ?? 50);
  const [note, setNote] = useState(existing?.note ?? '');

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const hue = Math.round(usagePct * 1.2);
  const color = `hsl(${hue}, 85%, 45%)`;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(subscription.id, { usage_pct: usagePct, note });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60">
      <div className="surface-card-strong max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-1">{existing ? 'Evaluatie bewerken' : 'Evaluatie toevoegen'}</h2>
          <p className="text-sm text-slate-500 mb-5">{subscription.name}</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Geschat gebruik</label>
                <span className="text-sm font-semibold" style={{ color }}>{usagePct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={usagePct}
                onChange={(e) => setUsagePct(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{ width: `${usagePct}%`, backgroundColor: color }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Toelichting / aantekening</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="field-strong w-full px-3 py-2 rounded-md focus:outline-none"
                placeholder="Hoe wordt dit abonnement gebruikt? Is het de kosten waard?"
              />
            </div>
            <div className="flex justify-between items-center">
              {existing && (
                <button type="button" onClick={() => onSave(subscription.id, null)} className="text-sm text-red-500 hover:underline">
                  Evaluatie verwijderen
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button type="button" onClick={onClose} className="btn-secondary">Annuleren</button>
                <button type="submit" className="btn-primary">Opslaan</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EvaluatieModal;

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * Multi-select dropdown met checkboxes.
 * Trigger toont samenvatting (placeholder / één label / N geselecteerd).
 *
 * Props:
 * - options: [{ value, label, count? }]
 * - selected: Set<string>
 * - onChange: (Set) => void
 * - placeholder: tekst als niets geselecteerd is
 */
function MultiSelect({ options, selected, onChange, placeholder = 'Alle' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (value) => {
    const next = new Set(selected);
    next.has(value) ? next.delete(value) : next.add(value);
    onChange(next);
  };

  const clear = () => onChange(new Set());

  const label = (() => {
    if (selected.size === 0) return placeholder;
    if (selected.size === 1) {
      const v = [...selected][0];
      return options.find(o => o.value === v)?.label ?? v;
    }
    return `${selected.size} geselecteerd`;
  })();

  const hasSelection = selected.size > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full px-3 py-2 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors flex items-center gap-2 ${
          hasSelection
            ? 'border-primary/30 text-slate-900'
            : 'border-slate-200 text-slate-700 hover:border-slate-300'
        }`}
      >
        <span className="flex-1 text-left truncate">{label}</span>
        {hasSelection && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold tabular-nums">
            {selected.size}
          </span>
        )}
        <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 z-30 min-w-[220px] max-w-[300px] bg-white rounded-xl shadow-xl ring-1 ring-slate-200/70 overflow-hidden">
          {hasSelection && (
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 tabular-nums">{selected.size} actief</span>
              <button
                type="button"
                onClick={clear}
                className="text-xs font-medium text-primary hover:underline"
              >
                Wissen
              </button>
            </div>
          )}
          <div className="max-h-72 overflow-y-auto py-1">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">Geen opties.</p>
            ) : (
              options.map(opt => {
                const checked = selected.has(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                      checked ? 'bg-primary/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.value)}
                      className="rounded border-slate-300 text-primary focus:ring-primary/30 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 flex-1 truncate">{opt.label}</span>
                    {opt.count !== undefined && (
                      <span className="text-xs text-slate-400 tabular-nums">{opt.count}</span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiSelect;

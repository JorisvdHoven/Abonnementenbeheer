import { useEffect, useState } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { subscribeToasts, dismissToast } from '../lib/toast';

const STYLES = {
  success: { icon: CheckCircleIcon, ring: 'border-green-200', bg: 'bg-green-50', text: 'text-green-700', iconColor: 'text-green-500' },
  error:   { icon: ExclamationCircleIcon, ring: 'border-red-200',   bg: 'bg-red-50',   text: 'text-red-700',   iconColor: 'text-red-500' },
  info:    { icon: InformationCircleIcon, ring: 'border-slate-200', bg: 'bg-white',    text: 'text-slate-700', iconColor: 'text-slate-500' },
};

function ToastItem({ toast }) {
  const { id, type, message, duration } = toast;
  const style = STYLES[type] ?? STYLES.info;
  const Icon = style.icon;

  useEffect(() => {
    const t = setTimeout(() => dismissToast(id), duration);
    return () => clearTimeout(t);
  }, [id, duration]);

  return (
    <div className={`flex items-start gap-3 ${style.bg} ${style.text} border ${style.ring} shadow-lg rounded-xl px-4 py-3 min-w-[280px] max-w-md animate-slide-in`}>
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
      <p className="text-sm flex-1 break-words">{message}</p>
      <button
        onClick={() => dismissToast(id)}
        className="text-slate-400 hover:text-slate-600 flex-shrink-0"
        aria-label="Sluiten"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribeToasts((event) => {
      if (event.kind === 'add') {
        setToasts(prev => [...prev, event.toast]);
      } else if (event.kind === 'remove') {
        setToasts(prev => prev.filter(t => t.id !== event.id));
      }
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}

export default Toaster;

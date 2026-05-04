// Lichtgewicht toast-systeem zonder dependencies.
// `toast.error(...)`, `toast.success(...)`, `toast.info(...)` zijn vanaf overal aanroepbaar
// (ook vanuit hooks en niet-React modules). De <Toaster /> component subscribet en rendert.

const listeners = new Set();
let counter = 0;

function notify(type, message, options = {}) {
  const id = ++counter;
  const toastEntry = {
    id,
    type,
    message,
    duration: options.duration ?? (type === 'error' ? 6000 : 3500),
  };
  listeners.forEach(fn => fn({ kind: 'add', toast: toastEntry }));
  return id;
}

export function dismissToast(id) {
  listeners.forEach(fn => fn({ kind: 'remove', id }));
}

export function subscribeToasts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const toast = {
  success: (message, options) => notify('success', message, options),
  error: (message, options) => notify('error', message, options),
  info: (message, options) => notify('info', message, options),
};

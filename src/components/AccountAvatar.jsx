// AccountAvatar — initialen-cirkel met kleur op basis van naam-hash.
// Consistente kleur per persoon (handig om in één oogopslag accounts te onderscheiden).
// Stijl matcht de navbar-avatar.

const ACCOUNT_AVATAR_COLORS = [
  'from-orange-400 to-primary',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-purple-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-red-500',
  'from-sky-400 to-cyan-500',
  'from-violet-400 to-fuchsia-500',
];

function hashStringSimple(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Tussenvoegsels worden overgeslagen bij het bepalen van initialen.
// 'Edwin van Almkerk' → EA (niet EV), 'Joris van den Hoven' → JH.
// NL hoofdmoot + meest voorkomende DE/FR/IT varianten voor expat-namen.
const TUSSENVOEGSELS = new Set([
  'van', 'der', 'den', 'de', 'het', "'t", 'ten', 'ter', 'te',
  'von', 'zu', 'zur', 'zum',
  'la', 'le', 'les', 'du', 'des', 'da', 'di', 'del', 'della', 'dos', 'do', 'al',
  'op', 'in', 'aan', 'bij', 'onder', 'voor', 'achter',
]);

function getInitials(name) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const significant = words.filter(w => !TUSSENVOEGSELS.has(w.toLowerCase()));
  // Edge case: alleen tussenvoegsels (zeer zeldzaam) — fall back op originele woorden
  const pool = significant.length > 0 ? significant : words;
  if (pool.length === 1) return pool[0][0].toUpperCase();
  // Eerste + LAATSTE significante woord (= voor- en achternaam, ook bij middle names)
  return (pool[0][0] + pool[pool.length - 1][0]).toUpperCase();
}

export function AccountAvatar({ name, size = 'md' }) {
  const trimmed = (name || '').trim();
  const dim = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  if (!trimmed) {
    return (
      <div className={`flex-shrink-0 ${dim} rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-medium`}>
        ?
      </div>
    );
  }
  const initials = getInitials(trimmed);
  const colorClass = ACCOUNT_AVATAR_COLORS[hashStringSimple(trimmed.toLowerCase()) % ACCOUNT_AVATAR_COLORS.length];
  return (
    <div className={`flex-shrink-0 ${dim} rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold`}>
      {initials}
    </div>
  );
}

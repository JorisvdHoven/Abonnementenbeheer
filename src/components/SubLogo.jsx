import { useState, useEffect } from 'react';

// Genereert kandidaat-domeinen voor een merknaam. We proberen meerdere
// varianten omdat sommige merken een streepje in hun domein hebben
// (q-park.com, track-and-trace.com) en andere niet (microsoft.com).
// Volgorde maakt uit: meest specifieke variant eerst, dan fallbacks.
function toDomains(str) {
  if (!str) return [];
  const cleaned = str.toLowerCase().trim()
    .replace(/\s+(b\.v\.|bv|inc|llc|ltd|gmbh|ag|sa)\.?$/i, '');

  // Variant 1: streepjes behouden, spaties → streepje, rest gestript
  //   'Q-Park'         → 'q-park.com'
  //   'Track & Trace'  → 'track-trace.com'
  const hyphenated = cleaned
    .replace(/&/g, ' ')                  // '&' weg, niet vervangen door 'and'
    .replace(/\s+/g, '-')                // spaties → streepje
    .replace(/[^a-z0-9-]/g, '')          // overige rommel weg
    .replace(/-+/g, '-')                 // dubbele streepjes opschonen
    .replace(/^-+|-+$/g, '');            // randen trimmen

  // Variant 2: alles aaneen geplakt zonder streepjes
  //   'Q-Park'         → 'qpark.com'
  //   'Track & Trace'  → 'tracktrace.com'
  const stripped = cleaned.replace(/[^a-z0-9]/g, '');

  const candidates = [];
  if (hyphenated) candidates.push(`${hyphenated}.com`);
  if (stripped && stripped !== hyphenated) candidates.push(`${stripped}.com`);
  return candidates;
}

export function SubLogo({ vendor, name, size = 'sm' }) {
  const initial = (name || vendor || '?')[0].toUpperCase();
  const [srcIndex, setSrcIndex] = useState(0);
  useEffect(() => setSrcIndex(0), [name, vendor]);
  const sizeClass = size === 'xs'
    ? 'h-5 w-5 text-[10px]'
    : size === 'lg'
    ? 'h-12 w-12 text-lg'
    : size === 'xl'
    ? 'h-16 w-16 text-2xl'
    : 'h-8 w-8 text-xs';

  // Per merknaam meerdere domein-varianten × meerdere logo-bronnen.
  // Order: clearbit (mooiste) → duckduckgo (404t cleaner dan google) →
  // google favicon (laatste redmiddel, geeft default globe als domein niet
  // bekend is). Name eerst, dan vendor.
  const nameDomains = toDomains(name);
  const vendorDomains = toDomains(vendor);
  const buildSources = (d) => [
    `https://logo.clearbit.com/${d}`,
    `https://icons.duckduckgo.com/ip3/${d}.ico`,
    `https://www.google.com/s2/favicons?domain=${d}&sz=128`,
  ];
  const sources = [
    ...nameDomains.flatMap(buildSources),
    ...vendorDomains.flatMap(buildSources),
  ];

  if (sources.length > 0 && srcIndex < sources.length) {
    const currentSrc = sources[srcIndex];
    const isGoogleFavicon = currentSrc.includes('google.com/s2/favicons');
    return (
      <img
        key={currentSrc}
        src={currentSrc}
        alt={vendor || name}
        onError={() => setSrcIndex(i => i + 1)}
        onLoad={(e) => {
          // Fail-fast op echt-broken images (0×0)
          if (e.target.naturalWidth === 0) {
            setSrcIndex(i => i + 1);
            return;
          }
          // Google geeft een 16×16 'globe'-default voor onbekende domeinen
          // — die filteren we expliciet weg. Andere bronnen (Clearbit, DDG)
          // 404'en netjes bij onbekend, dus daar trustden we de afmeting.
          if (isGoogleFavicon && e.target.naturalWidth <= 16 && e.target.naturalHeight <= 16) {
            setSrcIndex(i => i + 1);
          }
        }}
        className={`${sizeClass} rounded-xl object-contain bg-white border border-slate-100 p-0.5 flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0`}>
      {initial}
    </div>
  );
}

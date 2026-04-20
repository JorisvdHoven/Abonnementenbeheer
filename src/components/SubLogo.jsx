import { useState, useEffect } from 'react';

function toDomain(str) {
  if (!str) return null;
  const raw = str.toLowerCase().trim()
    .replace(/\s+(b\.v\.|bv|inc|llc|ltd|gmbh|ag|sa)\.?$/i, '')
    .replace(/[^a-z0-9]/g, '');
  return raw ? `${raw}.com` : null;
}

export function SubLogo({ vendor, name, size = 'sm' }) {
  const initial = (name || vendor || '?')[0].toUpperCase();
  const [srcIndex, setSrcIndex] = useState(0);
  useEffect(() => setSrcIndex(0), [name, vendor]);
  const sizeClass = size === 'lg' ? 'h-12 w-12 text-lg' : size === 'xl' ? 'h-16 w-16 text-2xl' : 'h-8 w-8 text-xs';

  const nameDomain = toDomain(name);
  const vendorDomain = toDomain(vendor);
  const sources = [
    nameDomain   && `https://logo.clearbit.com/${nameDomain}`,
    nameDomain   && `https://www.google.com/s2/favicons?domain=${nameDomain}&sz=128`,
    vendorDomain && `https://logo.clearbit.com/${vendorDomain}`,
    vendorDomain && `https://www.google.com/s2/favicons?domain=${vendorDomain}&sz=128`,
  ].filter(Boolean);

  if (sources.length > 0 && srcIndex < sources.length) {
    return (
      <img
        key={sources[srcIndex]}
        src={sources[srcIndex]}
        alt={vendor || name}
        onError={() => setSrcIndex(i => i + 1)}
        onLoad={(e) => {
          if (e.target.naturalWidth <= 16 && e.target.naturalHeight <= 16) {
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

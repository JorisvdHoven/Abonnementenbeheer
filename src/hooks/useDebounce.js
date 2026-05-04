import { useEffect, useState } from 'react';

/**
 * Geeft `value` terug, maar pas nadat het `delay` ms onveranderd is gebleven.
 * Handig voor zoekfilters: voorkomt dat elke toetsaanslag een dure filter triggert.
 */
export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

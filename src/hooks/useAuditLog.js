import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';

export function useAuditLog(limit = 100) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async (max = limit) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(max);

    if (error) {
      console.error('Error fetching audit log:', error);
      toast.error('Activiteitenlog kon niet geladen worden.');
      setEntries([]);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return { entries, loading, refetch: fetchEntries };
}

// Haalt de meest recente entry op voor één specifiek record (voor "laatst gewijzigd door X").
export function useLatestAuditFor(entityType, entityId) {
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    if (!entityType || !entityId) return;
    let cancelled = false;
    supabase
      .from('audit_log')
      .select('user_email, action, created_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!cancelled) setLatest(data ?? null);
      });
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  return latest;
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useEvaluaties() {
  const [evaluaties, setEvaluaties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
      setCurrentUserEmail(user?.email ?? null);
      await fetchEvaluaties();
    };
    init();
  }, []);

  const fetchEvaluaties = async () => {
    const { data, error } = await supabase
      .from('evaluations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) console.error('Error fetching evaluaties:', error);
    else setEvaluaties(data ?? []);
    setLoading(false);
  };

  const upsertEvaluatie = async (subscriptionId, { usage_pct, note }) => {
    const { data: { user } } = await supabase.auth.getUser();

    const existing = evaluaties.find(e => e.subscription_id === subscriptionId);

    if (existing) {
      const { error } = await supabase
        .from('evaluations')
        .update({ usage_pct, note, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) { console.error(error); return; }
    } else {
      const { error } = await supabase
        .from('evaluations')
        .insert([{ subscription_id: subscriptionId, usage_pct, note, updated_by: user.id }]);
      if (error) { console.error(error); return; }
    }
    await fetchEvaluaties();
  };

  const deleteEvaluatie = async (subscriptionId) => {
    const existing = evaluaties.find(e => e.subscription_id === subscriptionId);
    if (!existing) return;
    const { error } = await supabase.from('evaluations').delete().eq('id', existing.id);
    if (error) { console.error(error); return; }
    await fetchEvaluaties();
  };

  return { evaluaties, loading, currentUserId, currentUserEmail, upsertEvaluatie, deleteEvaluatie, refetch: fetchEvaluaties };
}

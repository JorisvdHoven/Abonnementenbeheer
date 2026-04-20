import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useMonthlySnapshots() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('monthly_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (!error) setSnapshots(data || []);
    setLoading(false);
  };

  return { snapshots, loading };
}

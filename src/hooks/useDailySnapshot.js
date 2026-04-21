import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const STORAGE_KEY = 'last_snapshot_date';

const BILLING_FACTORS = {
  'Maandelijks':  1,
  'Per kwartaal': 1 / 3,
  'Jaarlijks':    1 / 12,
  'Eenmalig':     0,
};

export function useDailySnapshot() {
  useEffect(() => {
    takeSnapshotIfNeeded();
  }, []);

  const takeSnapshotIfNeeded = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (localStorage.getItem(STORAGE_KEY) === today) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'actief')
      .eq('created_by', user.id);

    if (error || !subs?.length) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const details = subs.map(sub => {
      const factor = BILLING_FACTORS[sub.cost_period] ?? 1;
      const monthly_equivalent = (sub.cost || 0) * factor * (sub.cost_per_seat ? (sub.seats || 1) : 1);
      return {
        id: sub.id,
        name: sub.name,
        vendor: sub.vendor,
        department: sub.department || null,
        cost: sub.cost,
        currency: sub.currency || 'EUR',
        cost_period: sub.cost_period,
        monthly_equivalent,
      };
    });

    const total_cost = details.reduce((sum, d) => sum + d.monthly_equivalent, 0);

    await supabase.from('monthly_snapshots').upsert(
      { user_id: user.id, year, month, total_cost, details },
      { onConflict: 'user_id,year,month' }
    );

    localStorage.setItem(STORAGE_KEY, today);
  };
}

const BILLING_FACTORS = {
  'Maandelijks':  1,
  'Per kwartaal': 1 / 3,
  'Jaarlijks':    1 / 12,
  'Eenmalig':     0,
};

export async function backfillSubscriptionSnapshots(supabase, sub, userId) {
  if (!sub.start_date || !sub.cost_period || sub.cost_period === 'Eenmalig') return;

  const startDate = new Date(sub.start_date);
  const now = new Date();
  if (startDate >= now) return;

  const factor = BILLING_FACTORS[sub.cost_period] ?? 1;
  const monthlyEquivalent = (sub.cost || 0) * factor;

  const subDetail = {
    id: sub.id,
    name: sub.name,
    vendor: sub.vendor,
    department: sub.department || null,
    cost: sub.cost,
    currency: sub.currency || 'EUR',
    cost_period: sub.cost_period,
    monthly_equivalent: monthlyEquivalent,
  };

  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // huidige maand laten we over aan de cron

  for (let y = startYear; y <= currentYear; y++) {
    const mStart = y === startYear ? startMonth : 0;
    const mEnd = y === currentYear ? currentMonth - 1 : 11;

    for (let m = mStart; m <= mEnd; m++) {
      const { data: existing } = await supabase
        .from('monthly_snapshots')
        .select('*')
        .eq('user_id', userId)
        .eq('year', y)
        .eq('month', m)
        .maybeSingle();

      if (existing) {
        const details = existing.details || [];
        if (details.some(d => d.id === sub.id)) continue; // al verwerkt

        const newDetails = [...details, subDetail];
        const newTotal = existing.total_cost + monthlyEquivalent;

        await supabase.from('monthly_snapshots').upsert(
          { user_id: userId, year: y, month: m, total_cost: newTotal, details: newDetails },
          { onConflict: 'user_id,year,month' }
        );
      } else {
        await supabase.from('monthly_snapshots').insert({
          user_id: userId,
          year: y,
          month: m,
          total_cost: monthlyEquivalent,
          details: [subDetail],
        });
      }
    }
  }
}

export async function removeSubscriptionFromSnapshots(supabase, subId, userId) {
  const { data: snapshots } = await supabase
    .from('monthly_snapshots')
    .select('*')
    .eq('user_id', userId);

  if (!snapshots?.length) return;

  const affected = snapshots.filter(s => (s.details || []).some(d => d.id === subId));

  for (const snap of affected) {
    const newDetails = snap.details.filter(d => d.id !== subId);
    const newTotal = newDetails.reduce((sum, d) => sum + (d.monthly_equivalent || 0), 0);

    await supabase.from('monthly_snapshots').upsert(
      { user_id: snap.user_id, year: snap.year, month: snap.month, total_cost: newTotal, details: newDetails },
      { onConflict: 'user_id,year,month' }
    );
  }
}

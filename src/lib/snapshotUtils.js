const BILLING_FACTORS = {
  'Maandelijks':  1,
  'Per kwartaal': 1 / 3,
  'Jaarlijks':    1 / 12,
  'Eenmalig':     0,
};

// Backfill een net toegevoegd/aangepast abonnement in de org-wide monthly_snapshots
// voor alle maanden van start_date tot en met vorige maand. Huidige maand wordt
// door de pg_cron functie afgehandeld.
export async function backfillSubscriptionSnapshots(supabase, sub) {
  if (!sub.start_date || !sub.cost_period || sub.cost_period === 'Eenmalig') return;

  const startDate = new Date(sub.start_date);
  const now = new Date();
  if (startDate >= now) return;

  const factor = BILLING_FACTORS[sub.cost_period] ?? 1;
  const monthlyEquivalent = (sub.cost || 0) * factor * (sub.cost_per_seat ? (sub.seats || 1) : 1);

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
        .eq('year', y)
        .eq('month', m)
        .maybeSingle();

      if (existing) {
        const details = existing.details || [];
        // Als sub al bestaat: vervang met huidige waarden (bijv. als cost is gewijzigd)
        const filtered = details.filter(d => d.id !== sub.id);
        const newDetails = [...filtered, subDetail];
        const newTotal = newDetails.reduce((sum, d) => sum + (d.monthly_equivalent || 0), 0);

        await supabase.from('monthly_snapshots').upsert(
          { year: y, month: m, total_cost: newTotal, details: newDetails },
          { onConflict: 'year,month' }
        );
      } else {
        await supabase.from('monthly_snapshots').insert({
          year: y,
          month: m,
          total_cost: monthlyEquivalent,
          details: [subDetail],
        });
      }
    }
  }
}

// Verwijder een abonnement uit alle org-wide snapshots waarin het voorkomt
export async function removeSubscriptionFromSnapshots(supabase, subId) {
  const { data: snapshots } = await supabase
    .from('monthly_snapshots')
    .select('*');

  if (!snapshots?.length) return;

  const affected = snapshots.filter(s => (s.details || []).some(d => d.id === subId));

  for (const snap of affected) {
    const newDetails = snap.details.filter(d => d.id !== subId);
    const newTotal = newDetails.reduce((sum, d) => sum + (d.monthly_equivalent || 0), 0);

    await supabase.from('monthly_snapshots').upsert(
      { year: snap.year, month: snap.month, total_cost: newTotal, details: newDetails },
      { onConflict: 'year,month' }
    );
  }
}

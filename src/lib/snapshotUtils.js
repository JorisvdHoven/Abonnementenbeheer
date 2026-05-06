// Factor formule: monthly = cost × (365/12) / dagen_in_periode
// 'Anders' wordt dynamisch berekend uit start→renewal in factorForSub().
const BILLING_FACTORS = {
  'Maandelijks':   1,
  'Wekelijks':     (365 / 12) / 7,
  'Per kwartaal':  1 / 3,
  'Halfjaarlijks': 1 / 6,
  'Jaarlijks':     1 / 12,
  'Eenmalig':      0,
};

function factorForSub(sub) {
  if (sub.cost_period === 'Anders') {
    if (!sub.start_date || !sub.renewal_date) return 0;
    const start = new Date(sub.start_date);
    const renewal = new Date(sub.renewal_date);
    const days = (renewal - start) / (1000 * 60 * 60 * 24);
    if (days <= 0) return 0;
    return (365 / 12) / days;
  }
  return BILLING_FACTORS[sub.cost_period] ?? 1;
}

// Is een account actief tussen first en last dag van een maand?
function isAccountActiveInRange(account, firstDay, lastDay) {
  const start = account.start_date ? new Date(account.start_date) : null;
  const end = account.end_date ? new Date(account.end_date) : null;
  const archivedAt = account.archived_at ? new Date(account.archived_at) : null;
  if (start && start > lastDay) return false;
  if (end && end < firstDay && !account.auto_renew) return false;
  if (archivedAt && archivedAt < firstDay) return false;
  return true;
}

function effectiveAccountCost(account, parentCost) {
  if (account.cost !== null && account.cost !== undefined && account.cost !== '') {
    return parseFloat(account.cost) || 0;
  }
  return parentCost || 0;
}

// Backfill een net toegevoegd/aangepast abonnement in de org-wide monthly_snapshots
// voor alle maanden van start_date tot en met huidige maand. Account-aware en
// FX-aware: bedragen worden in EUR opgeslagen, fx_rate per detail bewaard zodat
// historisch herleidbaar is welke koers gebruikt is.
export async function backfillSubscriptionSnapshots(supabase, sub) {
  if (!sub.start_date || !sub.cost_period || sub.cost_period === 'Eenmalig') return;

  const startDate = new Date(sub.start_date);
  const now = new Date();
  if (startDate >= now) return;

  // Fetch accounts vers uit DB als ze niet meekwamen op het sub-object
  let accounts = sub.accounts;
  if (accounts === undefined) {
    const { data } = await supabase
      .from('subscription_accounts')
      .select('*')
      .eq('subscription_id', sub.id);
    accounts = data || [];
  }
  const hasAccounts = accounts.length > 0;

  // FX rate uit DB ophalen — geen historische data beschikbaar, dus we gebruiken
  // de huidige rate voor alle backfilled maanden. Dat wordt expliciet bewaard
  // in details.fx_rate zodat duidelijk is welke koers is toegepast.
  const currency = sub.currency || 'EUR';
  let fxRate = 1.0;
  if (currency !== 'EUR') {
    const { data: rateRow } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('currency', currency)
      .maybeSingle();
    fxRate = rateRow?.rate ? parseFloat(rateRow.rate) : 1.0;
  }

  const factor = factorForSub(sub);
  const parentCost = parseFloat(sub.cost) || 0;
  const baseCost = parseFloat(sub.base_cost) || 0;

  const computeMonthlyNative = (year, month) => {
    let variable;
    if (hasAccounts) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const active = accounts.filter(a => isAccountActiveInRange(a, firstDay, lastDay));
      variable = active.reduce((sum, a) => sum + effectiveAccountCost(a, parentCost), 0);
    } else {
      const seatMul = sub.cost_per_seat ? (sub.seats || 1) : 1;
      variable = parentCost * seatMul;
    }
    return (baseCost + variable) * factor;
  };

  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  for (let y = startYear; y <= currentYear; y++) {
    const mStart = y === startYear ? startMonth : 0;
    const mEnd = y === currentYear ? currentMonth : 11;

    for (let m = mStart; m <= mEnd; m++) {
      const monthlyNative = computeMonthlyNative(y, m);
      const monthlyEur = monthlyNative * fxRate;

      const subDetail = {
        id: sub.id,
        name: sub.name,
        vendor: sub.vendor,
        department: sub.department || null,
        cost: sub.cost,
        base_cost: sub.base_cost ?? null,
        currency,
        cost_period: sub.cost_period,
        is_variable_cost: sub.is_variable_cost ?? false,
        // monthly_equivalent staat nu in EUR (was native, breaking change voor
        // foreign-currency subs). Bewaar native + fx_rate erbij voor herleidbaarheid.
        monthly_equivalent: monthlyEur,
        monthly_equivalent_native: monthlyNative,
        fx_rate: fxRate,
      };

      // eslint-disable-next-line no-await-in-loop
      const { data: existing } = await supabase
        .from('monthly_snapshots')
        .select('*')
        .eq('year', y)
        .eq('month', m)
        .maybeSingle();

      if (existing) {
        const details = existing.details || [];
        const filtered = details.filter(d => d.id !== sub.id);
        // Voeg sub alleen toe als er kosten zijn (anders geen rij in dat maand)
        const newDetails = monthlyEur > 0 ? [...filtered, subDetail] : filtered;
        const newTotal = newDetails.reduce((sum, d) => sum + (d.monthly_equivalent || 0), 0);

        // eslint-disable-next-line no-await-in-loop
        await supabase.from('monthly_snapshots').upsert(
          { year: y, month: m, total_cost: newTotal, details: newDetails },
          { onConflict: 'year,month' }
        );
      } else if (monthlyEur > 0) {
        // eslint-disable-next-line no-await-in-loop
        await supabase.from('monthly_snapshots').insert({
          year: y,
          month: m,
          total_cost: monthlyEur,
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

    // eslint-disable-next-line no-await-in-loop
    await supabase.from('monthly_snapshots').upsert(
      { year: snap.year, month: snap.month, total_cost: newTotal, details: newDetails },
      { onConflict: 'year,month' }
    );
  }
}

// Herbereken alle snapshots voor een abonnement op basis van de actuele DB-staat
// (sub + accounts). Roep dit aan na een wijziging waar accounts veranderd zijn,
// zodat historische maanden correct zijn.
export async function recomputeSubscriptionSnapshots(supabase, subscriptionId) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*, accounts:subscription_accounts(*)')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!sub) return;

  await removeSubscriptionFromSnapshots(supabase, subscriptionId);
  await backfillSubscriptionSnapshots(supabase, sub);
}

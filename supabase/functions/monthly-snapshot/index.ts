import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BILLING_FACTORS: Record<string, number> = {
  'Maandelijks':  1,
  'Per kwartaal': 1 / 3,
  'Jaarlijks':    1 / 12,
  'Eenmalig':     0,
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'actief');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Group subscriptions by user
  const byUser: Record<string, any[]> = {};
  for (const sub of subscriptions) {
    const uid = sub.created_by;
    if (!uid) continue;
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(sub);
  }

  let usersProcessed = 0;

  for (const [userId, subs] of Object.entries(byUser)) {
    const details = subs.map(sub => {
      const cost = sub.cost || 0;
      const factor = BILLING_FACTORS[sub.cost_period] ?? 1;
      const monthlyEquivalent = cost * factor;

      // Determine if this sub is actually billed this specific month
      let billedThisMonth = false;
      if (sub.cost_period === 'Maandelijks') {
        billedThisMonth = true;
      } else if (sub.cost_period === 'Per kwartaal') {
        const ref = new Date(sub.renewal_date || sub.start_date || now);
        billedThisMonth = (month - ref.getMonth() + 12) % 3 === 0;
      } else if (sub.cost_period === 'Jaarlijks') {
        const ref = new Date(sub.renewal_date || sub.start_date || now);
        billedThisMonth = ref.getMonth() === month;
      }

      return {
        id: sub.id,
        name: sub.name,
        vendor: sub.vendor,
        cost,
        currency: sub.currency || 'EUR',
        cost_period: sub.cost_period,
        monthly_equivalent: monthlyEquivalent,
        billed_this_month: billedThisMonth,
      };
    });

    const totalMonthlyEquivalent = details.reduce((sum, d) => sum + d.monthly_equivalent, 0);

    await supabase.from('monthly_snapshots').upsert({
      user_id: userId,
      year,
      month,
      total_cost: totalMonthlyEquivalent,
      details,
    }, { onConflict: 'user_id,year,month' });

    usersProcessed++;
  }

  return new Response(
    JSON.stringify({ success: true, usersProcessed, year, month }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

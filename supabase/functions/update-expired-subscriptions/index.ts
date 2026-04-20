import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const today = new Date().toISOString().split('T')[0];

  // Subscriptions verlopen als:
  // - status is 'actief'
  // - auto_renew is niet true
  // - end_date verstreken, OF renewal_date verstreken (als er geen end_date is)
  const { data: toExpire, error: fetchError } = await supabase
    .from('subscriptions')
    .select('id, name, end_date, renewal_date, auto_renew')
    .eq('status', 'actief')
    .or('auto_renew.is.null,auto_renew.eq.false');

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  const expiredIds = (toExpire ?? [])
    .filter(sub => {
      if (sub.end_date && sub.end_date < today) return true;
      if (!sub.end_date && sub.renewal_date && sub.renewal_date < today) return true;
      return false;
    })
    .map(sub => sub.id);

  if (expiredIds.length === 0) {
    return new Response(JSON.stringify({ success: true, updated: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({ status: 'verlopen' })
    .in('id', expiredIds);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ success: true, updated: expiredIds.length }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});

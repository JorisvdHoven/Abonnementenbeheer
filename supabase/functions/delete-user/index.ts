import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function getCallerIdFromJWT(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    const base64Payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64Payload));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

  const callerId = getCallerIdFromJWT(authHeader);
  if (!callerId) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', callerId).single();
  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Alleen admins kunnen gebruikers verwijderen' }), { status: 403, headers: corsHeaders });
  }

  const { user_id } = await req.json();
  if (!user_id) return new Response(JSON.stringify({ error: 'user_id is verplicht' }), { status: 400, headers: corsHeaders });
  if (user_id === callerId) return new Response(JSON.stringify({ error: 'Je kunt jezelf niet verwijderen' }), { status: 400, headers: corsHeaders });

  // Haal subscription IDs op voor cascade
  const { data: userSubs } = await supabase.from('subscriptions').select('id').eq('created_by', user_id);
  const subIds = (userSubs || []).map((s: { id: string }) => s.id);

  if (subIds.length > 0) {
    await supabase.from('evaluations').delete().in('subscription_id', subIds);
    await supabase.from('reviews').delete().in('subscription_id', subIds);
  }

  await supabase.from('evaluations').delete().eq('updated_by', user_id);
  await supabase.from('reviews').delete().eq('user_id', user_id);
  await supabase.from('monthly_snapshots').delete().eq('user_id', user_id);
  await supabase.from('subscriptions').delete().eq('created_by', user_id);

  const { error } = await supabase.auth.admin.deleteUser(user_id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
});

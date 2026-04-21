import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user: caller } } = await supabase.auth.getUser(token);
  if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', caller.id).single();
  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Alleen admins kunnen gebruikers verwijderen' }), { status: 403 });
  }

  const { user_id } = await req.json();
  if (!user_id) return new Response(JSON.stringify({ error: 'user_id is verplicht' }), { status: 400 });
  if (user_id === caller.id) return new Response(JSON.stringify({ error: 'Je kunt jezelf niet verwijderen' }), { status: 400 });

  await supabase.from('profiles').delete().eq('id', user_id);
  const { error } = await supabase.auth.admin.deleteUser(user_id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
});

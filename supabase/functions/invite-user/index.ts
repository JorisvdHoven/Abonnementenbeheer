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
    return new Response(JSON.stringify({ error: 'Alleen admins kunnen gebruikers uitnodigen' }), { status: 403, headers: corsHeaders });
  }

  const { email, full_name, role = 'viewer' } = await req.json();
  if (!email) return new Response(JSON.stringify({ error: 'E-mailadres is verplicht' }), { status: 400, headers: corsHeaders });

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: full_name || '',
      role,
    }, { onConflict: 'id' });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});

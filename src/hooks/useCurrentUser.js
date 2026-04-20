import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useCurrentUser() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile({ ...data, email: user.email, id: user.id });
      setLoading(false);
    });
  }, []);

  return { profile, isAdmin: profile?.role === 'admin', loading };
}

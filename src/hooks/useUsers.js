import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name', { ascending: true });
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  const updateUser = async (id, updates) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (!error) await fetchUsers();
    return { error };
  };

  const inviteUser = async ({ email, full_name, role }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email, full_name, role }),
    });
    const result = await res.json();
    if (res.ok) await fetchUsers();
    return result;
  };

  return { users, loading, updateUser, inviteUser, refetch: fetchUsers };
}

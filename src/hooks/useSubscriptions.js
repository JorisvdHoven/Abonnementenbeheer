import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { backfillSubscriptionSnapshots, removeSubscriptionFromSnapshots } from '../lib/snapshotUtils';

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
    } else {
      setSubscriptions(data);
    }
    setLoading(false);
  };

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  const addSubscription = async (subscription) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([subscription])
      .select();

    if (error) {
      console.error('Error adding subscription:', error);
      return { error };
    }

    const saved = data[0];
    setSubscriptions(prev => [saved, ...prev]);

    // Backfill historische snapshots als de startdatum in het verleden ligt
    const userId = await getUserId();
    if (userId) await backfillSubscriptionSnapshots(supabase, saved, userId);

    return { data: saved };
  };

  const updateSubscription = async (id, updates) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating subscription:', error);
      return { error };
    }

    const saved = data[0];
    setSubscriptions(prev => prev.map(sub => sub.id === id ? saved : sub));

    // Herbereken snapshots als startdatum of kosten gewijzigd zijn
    const userId = await getUserId();
    if (userId) {
      await removeSubscriptionFromSnapshots(supabase, id, userId);
      await backfillSubscriptionSnapshots(supabase, saved, userId);
    }

    return { data: saved };
  };

  const deleteSubscription = async (id) => {
    const userId = await getUserId();

    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting subscription:', error);
    } else {
      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
      if (userId) await removeSubscriptionFromSnapshots(supabase, id, userId);
    }
  };

  return {
    subscriptions,
    loading,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    refetch: fetchSubscriptions,
  };
}

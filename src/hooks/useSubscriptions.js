import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

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

  const addSubscription = async (subscription) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([subscription])
      .select();

    if (error) {
      console.error('Error adding subscription:', error);
      return null;
    } else {
      setSubscriptions([data[0], ...subscriptions]);
      return data[0];
    }
  };

  const updateSubscription = async (id, updates) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating subscription:', error);
    } else {
      setSubscriptions(subscriptions.map(sub => sub.id === id ? data[0] : sub));
    }
  };

  const deleteSubscription = async (id) => {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting subscription:', error);
    } else {
      setSubscriptions(subscriptions.filter(sub => sub.id !== id));
    }
  };

  return {
    subscriptions,
    loading,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    refetch: fetchSubscriptions
  };
}
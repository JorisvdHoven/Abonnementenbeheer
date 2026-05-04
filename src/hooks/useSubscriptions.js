import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { backfillSubscriptionSnapshots, removeSubscriptionFromSnapshots } from '../lib/snapshotUtils';
import { toast } from '../lib/toast';

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
      toast.error('Abonnementen konden niet geladen worden.');
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
      toast.error(`Toevoegen mislukt: ${error.message}`);
      return { error };
    }

    const saved = data[0];
    setSubscriptions(prev => [saved, ...prev]);
    toast.success(`${saved.name} toegevoegd.`);

    // Backfill historische snapshots als de startdatum in het verleden ligt
    await backfillSubscriptionSnapshots(supabase, saved);

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
      toast.error(`Opslaan mislukt: ${error.message}`);
      return { error };
    }

    const saved = data[0];
    setSubscriptions(prev => prev.map(sub => sub.id === id ? saved : sub));
    toast.success('Wijzigingen opgeslagen.');

    // Herbereken snapshots als startdatum of kosten gewijzigd zijn
    await removeSubscriptionFromSnapshots(supabase, id);
    await backfillSubscriptionSnapshots(supabase, saved);

    return { data: saved };
  };

  const deleteSubscription = async (id) => {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting subscription:', error);
      toast.error(`Verwijderen mislukt: ${error.message}`);
    } else {
      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
      await removeSubscriptionFromSnapshots(supabase, id);
      toast.success('Abonnement verwijderd.');
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

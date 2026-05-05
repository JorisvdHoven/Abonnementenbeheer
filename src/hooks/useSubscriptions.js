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
      .select('*, accounts:subscription_accounts(*)')
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

  const updateSubscription = async (id, updates, { silent = false } = {}) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating subscription:', error);
      if (!silent) toast.error(`Opslaan mislukt: ${error.message}`);
      return { error };
    }

    const saved = data[0];
    setSubscriptions(prev => prev.map(sub => sub.id === id ? saved : sub));
    if (!silent) toast.success('Wijzigingen opgeslagen.');

    // Herbereken snapshots als startdatum of kosten gewijzigd zijn
    await removeSubscriptionFromSnapshots(supabase, id);
    await backfillSubscriptionSnapshots(supabase, saved);

    return { data: saved };
  };

  // Soft delete: zet archived_at op nu, snapshots blijven onaangeroerd (historiek bewaard)
  const archiveSubscription = async (id, { silent = false } = {}) => {
    const archivedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ archived_at: archivedAt })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error archiving subscription:', error);
      if (!silent) toast.error(`Archiveren mislukt: ${error.message}`);
      return { error };
    }
    const updated = data[0];
    setSubscriptions(prev => prev.map(s => s.id === id ? updated : s));
    if (!silent) toast.success('Verplaatst naar archief.');
    return { ok: true };
  };

  // Restore: zet archived_at terug op null
  const restoreSubscription = async (id, { silent = false } = {}) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ archived_at: null })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error restoring subscription:', error);
      if (!silent) toast.error(`Herstellen mislukt: ${error.message}`);
      return { error };
    }
    const updated = data[0];
    setSubscriptions(prev => prev.map(s => s.id === id ? updated : s));
    if (!silent) toast.success('Hersteld uit archief.');
    return { ok: true };
  };

  // Backwards-compatible: deleteSubscription = archive (soft delete)
  const deleteSubscription = archiveSubscription;

  // Hard delete: verwijdert uit DB EN uit alle historische snapshots. Niet ongedaan te maken.
  const permanentlyDeleteSubscription = async (id, { silent = false } = {}) => {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error permanently deleting subscription:', error);
      if (!silent) toast.error(`Definitief verwijderen mislukt: ${error.message}`);
      return { error };
    }
    setSubscriptions(prev => prev.filter(sub => sub.id !== id));
    await removeSubscriptionFromSnapshots(supabase, id);
    if (!silent) toast.success('Definitief verwijderd.');
    return { ok: true };
  };

  return {
    subscriptions,
    loading,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    archiveSubscription,
    restoreSubscription,
    permanentlyDeleteSubscription,
    refetch: fetchSubscriptions,
  };
}

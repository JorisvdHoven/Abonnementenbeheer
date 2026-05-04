import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';

// Lichtgewicht helpers voor het beheren van accounts onder een abonnement.
// Geen state: we hangen accounts altijd onder de subscription via de useSubscriptions fetch.

export async function addAccount(subscriptionId, account) {
  const { data, error } = await supabase
    .from('subscription_accounts')
    .insert([{ ...account, subscription_id: subscriptionId }])
    .select()
    .single();

  if (error) {
    console.error('Error adding account:', error);
    toast.error(`Account toevoegen mislukt: ${error.message}`);
    return { error };
  }
  return { data };
}

export async function updateAccount(id, updates) {
  const { data, error } = await supabase
    .from('subscription_accounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating account:', error);
    toast.error(`Account bijwerken mislukt: ${error.message}`);
    return { error };
  }
  return { data };
}

export async function deleteAccount(id) {
  const { error } = await supabase
    .from('subscription_accounts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting account:', error);
    toast.error(`Account verwijderen mislukt: ${error.message}`);
    return { error };
  }
  return { ok: true };
}

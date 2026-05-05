import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';

export function useSettings() {
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  // Rates staan in DB (exchange_rates tabel). Snel-fallback uit localStorage
  // tijdens initial render, daarna sync vanuit DB in fetchSettings().
  const [exchangeRates, setExchangeRates] = useState(() => {
    try {
      const stored = localStorage.getItem('exchange_rates');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Could not parse exchange_rates cache', e);
    }
    return { USD: 0.93, GBP: 1.15, CHF: 1.05 };
  });

  const updateExchangeRate = async (currency, rate) => {
    const parsed = parseFloat(rate);
    if (isNaN(parsed) || parsed <= 0) return;
    const { error } = await supabase.rpc('upsert_exchange_rate', {
      p_currency: currency,
      p_rate: parsed,
    });
    if (error) {
      console.error('Error updating exchange rate:', error);
      toast.error(`Wisselkoers bijwerken mislukt: ${error.message}`);
      return;
    }
    const next = { ...exchangeRates, [currency]: parsed };
    localStorage.setItem('exchange_rates', JSON.stringify(next));
    setExchangeRates(next);
  };

  // Backwards-compat: blijf USD rate beschikbaar maken als `exchangeRate`
  const exchangeRate = exchangeRates.USD ?? 0.93;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);

    const [
      { data: categoriesData, error: categoriesError },
      { data: typesData, error: typesError },
      { data: departmentsData, error: departmentsError },
      { data: ratesData, error: ratesError }
    ] = await Promise.all([
      supabase.from('subscription_categories').select('*').order('name', { ascending: true }),
      supabase.from('subscription_types').select('*').order('name', { ascending: true }),
      supabase.from('subscription_departments').select('*').order('name', { ascending: true }),
      supabase.from('exchange_rates').select('currency, rate'),
    ]);

    // Sync DB rates → state + localStorage cache. Geen toast bij fail (silent fallback).
    if (!ratesError && ratesData?.length) {
      const ratesMap = Object.fromEntries(ratesData.map(r => [r.currency, parseFloat(r.rate)]));
      setExchangeRates(ratesMap);
      localStorage.setItem('exchange_rates', JSON.stringify(ratesMap));
    }

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      setCategories([]);
    } else {
      setCategories(categoriesData || []);
    }

    if (typesError) {
      console.error('Error fetching types:', typesError);
      setTypes([]);
    } else {
      setTypes(typesData || []);
    }

    if (departmentsError) {
      console.error('Error fetching departments:', departmentsError);
      setDepartments([]);
    } else {
      setDepartments(departmentsData || []);
    }

    setLoading(false);
  };

  const addCategory = async (name) => {
    if (!name) return null;
    const { data, error } = await supabase.from('subscription_categories').insert([{ name }]).select();
    if (error) {
      console.error('Error adding category:', error);
      toast.error(`Categorie toevoegen mislukt: ${error.message}`);
      return null;
    }
    setCategories([...categories, data[0]].sort((a, b) => a.name.localeCompare(b.name, 'nl')));
    return data[0];
  };

  const addType = async (name) => {
    if (!name) return null;
    const { data, error } = await supabase.from('subscription_types').insert([{ name }]).select();
    if (error) {
      console.error('Error adding type:', error);
      toast.error(`Type toevoegen mislukt: ${error.message}`);
      return null;
    }
    setTypes([...types, data[0]].sort((a, b) => a.name.localeCompare(b.name, 'nl')));
    return data[0];
  };

  const addDepartment = async (name) => {
    if (!name) return null;
    const { data, error } = await supabase.from('subscription_departments').insert([{ name }]).select();
    if (error) {
      console.error('Error adding department:', error);
      toast.error(`Afdeling toevoegen mislukt: ${error.message}`);
      return null;
    }
    setDepartments([...departments, data[0]].sort((a, b) => a.name.localeCompare(b.name, 'nl')));
    return data[0];
  };

  const deleteCategory = async (id) => {
    const { error } = await supabase.from('subscription_categories').delete().eq('id', id);
    if (error) {
      console.error('Error deleting category:', error);
      toast.error(`Categorie verwijderen mislukt: ${error.message}`);
      return;
    }
    setCategories(categories.filter((category) => category.id !== id));
  };

  const deleteType = async (id) => {
    const { error } = await supabase.from('subscription_types').delete().eq('id', id);
    if (error) {
      console.error('Error deleting type:', error);
      toast.error(`Type verwijderen mislukt: ${error.message}`);
      return;
    }
    setTypes(types.filter((type) => type.id !== id));
  };

  const deleteDepartment = async (id) => {
    const { error } = await supabase.from('subscription_departments').delete().eq('id', id);
    if (error) {
      console.error('Error deleting department:', error);
      toast.error(`Afdeling verwijderen mislukt: ${error.message}`);
      return;
    }
    setDepartments(departments.filter((dept) => dept.id !== id));
  };

  // Generieke rename helper via Postgres RPC — atomair binnen één transactie.
  // Master + cascade naar subscriptions slagen of falen samen, geen out-of-sync staat.
  const renameTaxonomy = async (rpcName, list, setList, id, newName) => {
    const trimmed = (newName || '').trim();
    const item = list.find(x => x.id === id);
    if (!trimmed || !item || item.name === trimmed) return false;

    const { data, error } = await supabase.rpc(rpcName, { p_id: id, p_new_name: trimmed });
    if (error) {
      console.error(`RPC ${rpcName} mislukt:`, error);
      toast.error(`Naam wijzigen mislukt: ${error.message}`);
      return false;
    }

    const affected = data?.[0]?.affected_subs ?? 0;
    toast.success(
      affected > 0
        ? `Hernoemd naar "${trimmed}" — ${affected} abonnement${affected !== 1 ? 'en' : ''} bijgewerkt.`
        : `Hernoemd naar "${trimmed}".`
    );

    setList(prev =>
      prev.map(x => x.id === id ? { ...x, name: trimmed } : x)
        .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
    );
    return true;
  };

  const updateCategory   = (id, name) => renameTaxonomy('rename_subscription_category',   categories,  setCategories,  id, name);
  const updateDepartment = (id, name) => renameTaxonomy('rename_subscription_department', departments, setDepartments, id, name);

  return {
    categories,
    types,
    departments,
    loading,
    exchangeRate,
    exchangeRates,
    updateExchangeRate,
    addCategory,
    addType,
    addDepartment,
    deleteCategory,
    deleteType,
    deleteDepartment,
    updateCategory,
    updateDepartment,
    refetch: fetchSettings
  };
}

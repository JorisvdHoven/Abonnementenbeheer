import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';

export function useSettings() {
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState(() => {
    // Backwards compat: lees oude 'usd_eur_rate' key als die bestaat
    try {
      const stored = localStorage.getItem('exchange_rates');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Could not parse exchange_rates', e);
    }
    const legacyUsd = parseFloat(localStorage.getItem('usd_eur_rate') || '0.93');
    return { USD: legacyUsd, GBP: 1.15, CHF: 1.05 };
  });

  const updateExchangeRate = (currency, rate) => {
    const parsed = parseFloat(rate);
    if (isNaN(parsed) || parsed <= 0) return;
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
      { data: departmentsData, error: departmentsError }
    ] = await Promise.all([
      supabase.from('subscription_categories').select('*').order('name', { ascending: true }),
      supabase.from('subscription_types').select('*').order('name', { ascending: true }),
      supabase.from('subscription_departments').select('*').order('name', { ascending: true }),
    ]);

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
    refetch: fetchSettings
  };
}

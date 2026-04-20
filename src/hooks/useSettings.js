import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSettings() {
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRateState] = useState(
    () => parseFloat(localStorage.getItem('usd_eur_rate') || '0.93')
  );

  const updateExchangeRate = (rate) => {
    const parsed = parseFloat(rate);
    if (!isNaN(parsed) && parsed > 0) {
      localStorage.setItem('usd_eur_rate', parsed.toString());
      setExchangeRateState(parsed);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);

    const [{ data: categoriesData, error: categoriesError }, { data: typesData, error: typesError }] = await Promise.all([
      supabase.from('subscription_categories').select('*').order('created_at', { ascending: false }),
      supabase.from('subscription_types').select('*').order('created_at', { ascending: false })
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

    setLoading(false);
  };

  const addCategory = async (name) => {
    if (!name) return null;
    const { data, error } = await supabase.from('subscription_categories').insert([{ name }]).select();
    if (error) {
      console.error('Error adding category:', error);
      return null;
    }
    setCategories([data[0], ...categories]);
    return data[0];
  };

  const addType = async (name) => {
    if (!name) return null;
    const { data, error } = await supabase.from('subscription_types').insert([{ name }]).select();
    if (error) {
      console.error('Error adding type:', error);
      return null;
    }
    setTypes([data[0], ...types]);
    return data[0];
  };

  const deleteCategory = async (id) => {
    const { error } = await supabase.from('subscription_categories').delete().eq('id', id);
    if (error) {
      console.error('Error deleting category:', error);
      return;
    }
    setCategories(categories.filter((category) => category.id !== id));
  };

  const deleteType = async (id) => {
    const { error } = await supabase.from('subscription_types').delete().eq('id', id);
    if (error) {
      console.error('Error deleting type:', error);
      return;
    }
    setTypes(types.filter((type) => type.id !== id));
  };

  return {
    categories,
    types,
    loading,
    exchangeRate,
    updateExchangeRate,
    addCategory,
    addType,
    deleteCategory,
    deleteType,
    refetch: fetchSettings
  };
}

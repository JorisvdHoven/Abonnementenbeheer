import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
      await fetchReviews();
    };
    init();
  }, []);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select(`*, subscriptions (name)`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
    } else {
      setReviews(data);
    }
    setLoading(false);
  };

  const addReview = async (review) => {
    const { data, error } = await supabase
      .from('reviews')
      .insert([review])
      .select();

    if (error) {
      console.error('Error adding review:', error);
      return null;
    }
    setReviews([data[0], ...reviews]);
    return data[0];
  };

  const deleteReview = async (id) => {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) { console.error('Error deleting review:', error); return; }
    setReviews(reviews.filter(r => r.id !== id));
  };

  const updateReview = async (id, updates) => {
    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating review:', error);
      return null;
    }
    if (data && data[0]) {
      setReviews(prev => prev.map(r => r.id === id ? data[0] : r));
    }
    return data?.[0] ?? null;
  };

  return {
    reviews,
    loading,
    currentUserId,
    addReview,
    updateReview,
    deleteReview,
    refetch: fetchReviews
  };
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        subscriptions (name)
      `)
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
    } else {
      setReviews([data[0], ...reviews]);
      return data[0];
    }
  };

  return {
    reviews,
    loading,
    addReview,
    refetch: fetchReviews
  };
}
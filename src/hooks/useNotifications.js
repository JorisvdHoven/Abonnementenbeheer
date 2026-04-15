import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { addDays, isBefore, isAfter } from 'date-fns';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'actief');

    if (error) {
      console.error('Error fetching subscriptions for notifications:', error);
      return;
    }

    const now = new Date();
    const thirtyDays = addDays(now, 30);
    const sixtyDays = addDays(now, 60);
    const ninetyDays = addDays(now, 90);

    const urgent = data.filter(sub => sub.renewal_date && isBefore(new Date(sub.renewal_date), thirtyDays));
    const soon = data.filter(sub => sub.renewal_date && isAfter(new Date(sub.renewal_date), thirtyDays) && isBefore(new Date(sub.renewal_date), sixtyDays));
    const future = data.filter(sub => sub.renewal_date && isAfter(new Date(sub.renewal_date), sixtyDays) && isBefore(new Date(sub.renewal_date), ninetyDays));

    setNotifications([...urgent, ...soon, ...future]);
  };

  return {
    notifications,
    refetch: fetchNotifications
  };
}
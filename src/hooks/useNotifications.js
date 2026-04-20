import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { addDays, isBefore, isAfter } from 'date-fns';

const STORAGE_KEY = 'dismissed_notifications';

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

export function useNotifications() {
  const [allNotifications, setAllNotifications] = useState([]);
  const [dismissed, setDismissed] = useState(getDismissed);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .in('status', ['actief', 'verlopen']);

    if (error) { console.error('Error fetching subscriptions for notifications:', error); return; }

    const now = new Date();
    const thirtyDays = addDays(now, 30);
    const sixtyDays = addDays(now, 60);
    const ninetyDays = addDays(now, 90);
    const sevenDaysAgo = addDays(now, -7);

    const isExpiringSoon = (sub, from, to) => {
      const d = sub.renewal_date || sub.end_date;
      if (!d) return false;
      const date = new Date(d);
      return (!from || isAfter(date, from)) && isBefore(date, to);
    };

    const actief = data.filter(s => s.status === 'actief');
    const urgent = actief.filter(sub => !sub.auto_renew && isExpiringSoon(sub, null, thirtyDays));
    const soon = actief.filter(sub => !sub.auto_renew && isExpiringSoon(sub, thirtyDays, sixtyDays));
    const future = actief.filter(sub => !sub.auto_renew && isExpiringSoon(sub, sixtyDays, ninetyDays));

    const recentlyExpired = data.filter(sub => {
      if (sub.status !== 'verlopen') return false;
      const d = sub.end_date || sub.renewal_date;
      if (!d) return false;
      const date = new Date(d);
      return isAfter(date, sevenDaysAgo) && isBefore(date, now);
    }).map(sub => ({ ...sub, _type: 'verlopen' }));

    setAllNotifications([...urgent, ...soon, ...future, ...recentlyExpired]);
  };

  const dismissNotification = (id) => {
    const updated = { ...dismissed, [id]: true };
    setDismissed(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const notifications = allNotifications.filter(n => !dismissed[n.id]);

  return { notifications, dismissNotification, refetch: fetchNotifications };
}
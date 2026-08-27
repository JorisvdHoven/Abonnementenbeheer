import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { addDays, isBefore, isAfter } from 'date-fns';
import { effectiveAutoRenew } from '../lib/costUtils';

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
      .select('*, accounts:subscription_accounts(*)')
      .is('archived_at', null)
      .in('status', ['actief', 'verlopen']);

    if (error) { console.error('Error fetching subscriptions for notifications:', error); return; }

    const now = new Date();
    const thirtyDays = addDays(now, 30);
    const sixtyDays = addDays(now, 60);
    const ninetyDays = addDays(now, 90);
    const sevenDaysAgo = addDays(now, -7);

    const isExpiringSoon = (sub, from, to) => {
      if (!sub.renewal_date) return false;
      const date = new Date(sub.renewal_date);
      return (!from || isAfter(date, from)) && isBefore(date, to);
    };

    const actief = data.filter(s => s.status === 'actief');
    // effectiveAutoRenew i.p.v. sub.auto_renew: bij per_account/parking staat
    // parent.auto_renew altijd op false (geforceerd in dataToSave), dus elk
    // parking-abo stond permanent in de bel als 'verloopt binnenkort'.
    const urgent = actief.filter(sub => !effectiveAutoRenew(sub) && isExpiringSoon(sub, null, thirtyDays));
    const soon = actief.filter(sub => !effectiveAutoRenew(sub) && isExpiringSoon(sub, thirtyDays, sixtyDays));
    const future = actief.filter(sub => !effectiveAutoRenew(sub) && isExpiringSoon(sub, sixtyDays, ninetyDays));

    const recentlyExpired = data.filter(sub => {
      if (sub.status !== 'verlopen') return false;
      if (!sub.renewal_date) return false;
      const date = new Date(sub.renewal_date);
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
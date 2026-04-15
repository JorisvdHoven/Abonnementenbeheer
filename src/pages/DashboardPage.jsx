import { useSubscriptions, useReviews } from '../hooks/useSubscriptions';
import { useNotifications } from '../hooks/useNotifications';
import { format, addDays, isBefore } from 'date-fns';

function DashboardPage() {
  const { subscriptions, loading: subsLoading } = useSubscriptions();
  const { reviews, loading: reviewsLoading } = useReviews();
  const { notifications } = useNotifications();

  if (subsLoading || reviewsLoading) {
    return <div className="p-6">Loading...</div>;
  }

  // Stats
  const activeSubs = subscriptions.filter(sub => sub.status === 'actief');
  const totalMonthlyCost = activeSubs.reduce((sum, sub) => sum + (sub.cost || 0), 0);
  const expiringSoon = notifications.length;
  const reviewedSubs = new Set(reviews.map(r => r.subscription_id)).size;
  const reviewPercentage = subscriptions.length > 0 ? Math.round((reviewedSubs / subscriptions.length) * 100) : 0;

  // Expiring within 60 days
  const now = new Date();
  const sixtyDays = addDays(now, 60);
  const expiringSoonList = activeSubs.filter(sub => sub.renewal_date && isBefore(new Date(sub.renewal_date), sixtyDays));

  // Cost per category
  const categoryCosts = {};
  activeSubs.forEach(sub => {
    const cat = sub.category || 'Overig';
    categoryCosts[cat] = (categoryCosts[cat] || 0) + (sub.cost || 0);
  });
  const maxCost = Math.max(...Object.values(categoryCosts));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-dark">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-500">Actieve abonnementen</div>
          <div className="text-2xl font-bold text-dark">{activeSubs.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-500">Maandkosten</div>
          <div className="text-2xl font-bold text-dark">€{totalMonthlyCost.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-500">Verloopt binnenkort</div>
          <div className="text-2xl font-bold text-dark">{expiringSoon}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-500">Reviews</div>
          <div className="text-2xl font-bold text-dark">{reviewPercentage}%</div>
        </div>
      </div>

      {/* Expiring Subscriptions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-lg font-semibold mb-4">Verloopt binnen 60 dagen</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Naam</th>
              <th className="text-left py-2">Leverancier</th>
              <th className="text-left py-2">Verlengingsdatum</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {expiringSoonList.map(sub => {
              const days = Math.ceil((new Date(sub.renewal_date) - now) / (1000 * 60 * 60 * 24));
              const isUrgent = days < 30;
              return (
                <tr key={sub.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{sub.name}</td>
                  <td className="py-2">{sub.vendor}</td>
                  <td className={`py-2 ${isUrgent ? 'text-red-500 font-semibold' : 'text-orange-500'}`}>
                    {format(new Date(sub.renewal_date), 'dd-MM-yyyy')}
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      sub.status === 'actief' ? 'bg-green-100 text-green-800' :
                      sub.status === 'verlopen' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cost per Category Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-lg font-semibold mb-4">Kosten per categorie</h2>
        <div className="space-y-2">
          {Object.entries(categoryCosts).map(([cat, cost]) => (
            <div key={cat} className="flex items-center">
              <div className="w-24 text-sm">{cat}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div
                  className="bg-primary h-4 rounded-full"
                  style={{ width: `${(cost / maxCost) * 100}%` }}
                ></div>
              </div>
              <div className="w-16 text-right text-sm">€{cost.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Review Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-lg font-semibold mb-4">Review voortgang</h2>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-primary h-4 rounded-full"
            style={{ width: `${reviewPercentage}%` }}
          ></div>
        </div>
        <div className="text-sm text-gray-500 mt-2">{reviewedSubs} van {subscriptions.length} abonnementen beoordeeld</div>
      </div>
    </div>
  );
}

export default DashboardPage;
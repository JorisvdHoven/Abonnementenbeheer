import { useState } from 'react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import SubscriptionModal from '../components/SubscriptionModal';

function SubscriptionsPage() {
  const { subscriptions, loading, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  const filteredSubs = subscriptions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(search.toLowerCase()) ||
                          (sub.vendor && sub.vendor.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !categoryFilter || sub.category === categoryFilter;
    const matchesStatus = !statusFilter || sub.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = [...new Set(subscriptions.map(sub => sub.category).filter(Boolean))];
  const statuses = [...new Set(subscriptions.map(sub => sub.status))];

  const handleAdd = () => {
    setEditingSub(null);
    setModalOpen(true);
  };

  const handleEdit = (sub) => {
    setEditingSub(sub);
    setModalOpen(true);
  };

  const handleSave = async (subData) => {
    if (editingSub) {
      await updateSubscription(editingSub.id, subData);
    } else {
      await addSubscription(subData);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (confirm('Weet je zeker dat je dit abonnement wilt verwijderen?')) {
      await deleteSubscription(id);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">Abonnementen</h1>
        <button
          onClick={handleAdd}
          className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90"
        >
          + Nieuw abonnement
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex space-x-4">
        <input
          type="text"
          placeholder="Zoek op naam of leverancier"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        >
          <option value="">Alle categorieën</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        >
          <option value="">Alle statussen</option>
          {statuses.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4">Naam</th>
              <th className="text-left py-3 px-4">Leverancier</th>
              <th className="text-left py-3 px-4">Categorie</th>
              <th className="text-left py-3 px-4">Seats</th>
              <th className="text-left py-3 px-4">Kosten/mnd</th>
              <th className="text-left py-3 px-4">Verlengingsdatum</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubs.map(sub => (
              <tr key={sub.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleEdit(sub)}>
                <td className="py-3 px-4">{sub.name}</td>
                <td className="py-3 px-4">{sub.vendor}</td>
                <td className="py-3 px-4">{sub.category}</td>
                <td className="py-3 px-4">{sub.seats}</td>
                <td className="py-3 px-4">€{sub.cost}</td>
                <td className="py-3 px-4">{sub.renewal_date ? new Date(sub.renewal_date).toLocaleDateString() : '-'}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    sub.status === 'actief' ? 'bg-green-100 text-green-800' :
                    sub.status === 'verlopen' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Verwijder
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <SubscriptionModal
          subscription={editingSub}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export default SubscriptionsPage;
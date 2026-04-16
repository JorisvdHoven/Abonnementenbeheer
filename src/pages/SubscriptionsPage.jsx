import { useState } from 'react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useSettings } from '../hooks/useSettings';
import SubscriptionModal from '../components/SubscriptionModal';

function SubscriptionsPage() {
  const { subscriptions, loading, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const { categories: settingCategories, types, loading: settingsLoading } = useSettings();

  const filteredSubs = subscriptions.filter(sub => {
    const searchText = search.toLowerCase();
    const matchesSearch = sub.name.toLowerCase().includes(searchText) ||
                          (sub.vendor && sub.vendor.toLowerCase().includes(searchText)) ||
                          (sub.contact_name && sub.contact_name.toLowerCase().includes(searchText)) ||
                          (sub.contact_email && sub.contact_email.toLowerCase().includes(searchText)) ||
                          (sub.contact_phone && sub.contact_phone.toLowerCase().includes(searchText));
    const matchesCategory = !categoryFilter || sub.category === categoryFilter;
    const matchesStatus = !statusFilter || sub.status === statusFilter;
    const matchesType = !typeFilter || sub.type === typeFilter;
    return matchesSearch && matchesCategory && matchesStatus && matchesType;
  });

  const categories = settingCategories.length > 0
    ? settingCategories.map((category) => category.name)
    : [...new Set(subscriptions.map(sub => sub.category).filter(Boolean))];
  const statuses = [...new Set(subscriptions.map(sub => sub.status))];
  const typesList = types.length > 0
    ? types.map((type) => type.name)
    : [...new Set(subscriptions.map(sub => sub.type).filter(Boolean))];

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
    <div className="p-6 space-y-5">
      <div className="surface-card-strong flex justify-between items-center p-5">
        <h1 className="text-2xl font-bold text-dark">Abonnementen</h1>
        <button
          onClick={handleAdd}
          className="btn-primary"
        >
          + Nieuw abonnement
        </button>
      </div>

      <div className="surface-card p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Zoek op naam, leverancier of contact"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field-strong flex-1 px-3 py-2 rounded-md focus:outline-none"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="field-strong px-3 py-2 rounded-md focus:outline-none"
          >
            <option value="">Alle categorieën</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="field-strong px-3 py-2 rounded-md focus:outline-none"
          >
            <option value="">Alle types</option>
            {typesList.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="field-strong px-3 py-2 rounded-md focus:outline-none"
          >
            <option value="">Alle statussen</option>
            {statuses.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        {typeFilter && (
          <div className="text-sm text-gray-600">
            Totaal kosten voor type <span className="font-semibold">{typeFilter}</span>: €{filteredSubs.reduce((sum, sub) => sum + (sub.cost || 0), 0).toFixed(2)}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="surface-card-strong overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4">Naam</th>
              <th className="text-left py-3 px-4">Leverancier</th>
              <th className="text-left py-3 px-4">Contactpersoon</th>
              <th className="text-left py-3 px-4">Telefoon</th>
              <th className="text-left py-3 px-4">E-mail</th>
              <th className="text-left py-3 px-4">Categorie</th>
              <th className="text-left py-3 px-4">Seats</th>
              <th className="text-left py-3 px-4">Kosten/mnd</th>
              <th className="text-left py-3 px-4">Verlengingsdatum</th>
              <th className="text-left py-3 px-4">Document</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubs.map(sub => (
              <tr key={sub.id} className="cursor-pointer border-b border-slate-100 transition-colors duration-150 hover:bg-orange-50" onClick={() => handleEdit(sub)}>
                <td className="py-3 px-4">{sub.name}</td>
                <td className="py-3 px-4">{sub.vendor}</td>
                <td className="py-3 px-4">{sub.contact_name || '-'}</td>
                <td className="py-3 px-4">{sub.contact_phone || '-'}</td>
                <td className="py-3 px-4">{sub.contact_email || '-'}</td>
                <td className="py-3 px-4">{sub.category}</td>
                <td className="py-3 px-4">{sub.seats}</td>
                <td className="py-3 px-4">€{sub.cost}</td>
                <td className="py-3 px-4">{sub.renewal_date ? new Date(sub.renewal_date).toLocaleDateString() : '-'}</td>
                <td className="py-3 px-4">
                  {sub.document_content ? (
                    <a
                      href={sub.document_content}
                      download={sub.document_name || `${sub.name}-document`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-primary transition-all duration-150 hover:text-orange-600 hover:underline"
                    >
                      {sub.document_name || 'Download'}
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
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
                    className="rounded-md px-2 py-1 font-medium text-red-600 transition-all duration-150 hover:bg-red-50 hover:text-red-800"
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
          typeOptions={typesList}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export default SubscriptionsPage;
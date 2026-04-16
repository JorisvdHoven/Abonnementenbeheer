import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

function SubscriptionModal({ subscription, typeOptions = [], onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    vendor: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    category: '',
    type: '',
    cost: '',
    cost_period: '',
    seats: 1,
    start_date: '',
    end_date: '',
    renewal_date: '',
    status: 'actief',
    auto_renew: false,
    terms: '',
    notes: '',
    document_name: '',
    document_type: '',
    document_content: ''
  });

  useEffect(() => {
    if (subscription) {
      setFormData({
        name: subscription.name || '',
        vendor: subscription.vendor || '',
        contact_name: subscription.contact_name || '',
        contact_email: subscription.contact_email || '',
        contact_phone: subscription.contact_phone || '',
        category: subscription.category || '',
        type: subscription.type || '',
        cost: subscription.cost ?? '',
        cost_period: subscription.cost_period || '',
        seats: subscription.seats || 1,
        start_date: subscription.start_date ? subscription.start_date.split('T')[0] : '',
        end_date: subscription.end_date ? subscription.end_date.split('T')[0] : '',
        renewal_date: subscription.renewal_date ? subscription.renewal_date.split('T')[0] : '',
        status: subscription.status || 'actief',
        auto_renew: subscription.auto_renew || false,
        terms: subscription.terms || '',
        notes: subscription.notes || '',
        document_name: subscription.document_name || '',
        document_type: subscription.document_type || '',
        document_content: subscription.document_content || ''
      });
    }
  }, [subscription]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setFormData(prev => ({
        ...prev,
        document_name: '',
        document_type: '',
        document_content: ''
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Kies een document kleiner dan 5 MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        document_name: file.name,
        document_type: file.type || 'application/octet-stream',
        document_content: typeof reader.result === 'string' ? reader.result : ''
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocument = () => {
    setFormData(prev => ({
      ...prev,
      document_name: '',
      document_type: '',
      document_content: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const dataToSave = {
      ...formData,
      cost: parseFloat(formData.cost) || 0,
      seats: parseInt(formData.seats) || 1,
      created_by: user?.id
    };
    await onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60">
      <div className="surface-card-strong max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">{subscription ? 'Bewerk abonnement' : 'Nieuw abonnement'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Naam</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Leverancier</label>
                <input
                  type="text"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contactpersoon</label>
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">E-mail contact</label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefoon contact</label>
                <input
                  type="tel"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Categorie</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                {typeOptions.length > 0 ? (
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="">Kies een type</option>
                    {typeOptions.map((typeOption) => (
                      <option key={typeOption} value={typeOption}>{typeOption}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kosten</label>
                <input
                  type="number"
                  step="0.01"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kostperiode</label>
                <input
                  type="text"
                  name="cost_period"
                  value={formData.cost_period}
                  onChange={handleChange}
                  placeholder="per gebruiker/maand"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Seats</label>
                <input
                  type="number"
                  name="seats"
                  value={formData.seats}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="actief">Actief</option>
                  <option value="verlopen">Verlopen</option>
                  <option value="opgezegd">Opgezegd</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Startdatum</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Einddatum</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Verlengingsdatum</label>
                <input
                  type="date"
                  name="renewal_date"
                  value={formData.renewal_date}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="auto_renew"
                  checked={formData.auto_renew}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">Auto-verlenging</label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contractvoorwaarden</label>
              <textarea
                name="terms"
                value={formData.terms}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Document</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                onChange={handleFileChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-gray-500">Ondersteunt onder andere PDF, Word, afbeeldingen en tekstbestanden tot 5 MB.</p>
              {formData.document_name && (
                <div className="mt-2 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-700">Geselecteerd document</div>
                    <div className="text-slate-500">{formData.document_name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {formData.document_content && (
                      <a
                        href={formData.document_content}
                        download={formData.document_name}
                        className="text-primary hover:underline"
                      >
                        Open
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveDocument}
                      className="text-red-600 hover:underline"
                    >
                      Verwijder document
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notities</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Opslaan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionModal;
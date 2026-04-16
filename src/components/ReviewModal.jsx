import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function ReviewModal({ subscription, onSave, onClose }) {
  const [rating, setRating] = useState(0);
  const [usagePct, setUsagePct] = useState(50);
  const [note, setNote] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const reviewData = {
      subscription_id: subscription.id,
      user_id: user.id,
      rating,
      usage_pct: usagePct,
      note
    };
    await onSave(reviewData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60">
      <div className="surface-card-strong max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Review {subscription.name}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sterrenscore</label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Geschat gebruik: {usagePct}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={usagePct}
                onChange={(e) => setUsagePct(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Toelichting</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="field-strong w-full px-3 py-2 rounded-md focus:outline-none"
                placeholder="Deel je ervaringen..."
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
                disabled={rating === 0}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
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

export default ReviewModal;
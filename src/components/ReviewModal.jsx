import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

function ReviewModal({ subscription, existingReview, onSave, onClose }) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);
  const [usagePct, setUsagePct] = useState(existingReview?.usage_pct ?? 50);
  const [note, setNote] = useState(existingReview?.note ?? '');

  const isEditing = !!existingReview;

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
    await onSave(reviewData, existingReview?.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60">
      <div className="surface-card-strong max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-1">{isEditing ? 'Beoordeling bewerken' : 'Review toevoegen'}</h2>
          <p className="text-sm text-slate-500 mb-4">{subscription.name}</p>
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
              <button type="button" onClick={onClose} className="btn-secondary">Annuleren</button>
              <button
                type="submit"
                disabled={rating === 0}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isEditing ? 'Opslaan' : 'Toevoegen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ReviewModal;

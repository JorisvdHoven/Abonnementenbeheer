import { useState } from 'react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useReviews } from '../hooks/useReviews';
import ReviewModal from '../components/ReviewModal';

function UsageBar({ pct }) {
  const hue = Math.round(pct * 1.2);
  const color = `hsl(${hue}, 85%, 45%)`;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Gemiddeld gebruik</span>
        <span className="font-medium" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StarDisplay({ rating }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
      ))}
    </div>
  );
}

function ReviewsPage() {
  const { subscriptions, loading: subsLoading } = useSubscriptions();
  const { reviews, loading: reviewsLoading, currentUserId, addReview, updateReview, deleteReview } = useReviews();
  const [selectedSub, setSelectedSub] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = (sub, existingReview = null) => {
    setSelectedSub(sub);
    setEditingReview(existingReview);
    setModalOpen(true);
  };

  const handleSaveReview = async (reviewData, existingId) => {
    if (existingId) {
      await updateReview(existingId, { rating: reviewData.rating, usage_pct: reviewData.usage_pct, note: reviewData.note });
    } else {
      await addReview(reviewData);
    }
    setModalOpen(false);
  };

  if (subsLoading || reviewsLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="surface-card-strong p-5">
        <h1 className="text-2xl font-bold text-dark">Reviews</h1>
        <p className="mt-1 text-sm text-slate-600">Beoordeel abonnementen en bekijk wat collega's ervan vinden.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subscriptions.map(sub => {
          const subReviews = reviews.filter(r => r.subscription_id === sub.id);
          const myReview = subReviews.find(r => r.user_id === currentUserId);
          const otherReviews = subReviews.filter(r => r.user_id !== currentUserId);
          const avgRating = subReviews.length > 0
            ? Math.round(subReviews.reduce((sum, r) => sum + r.rating, 0) / subReviews.length * 10) / 10
            : null;
          const avgUsage = subReviews.length > 0
            ? Math.round(subReviews.reduce((sum, r) => sum + r.usage_pct, 0) / subReviews.length)
            : null;

          return (
            <div key={sub.id} className="surface-card-strong p-4 flex flex-col gap-3">
              <div>
                <h3 className="font-semibold text-lg">{sub.name}</h3>
                <p className="text-sm text-gray-500">{sub.vendor}</p>
              </div>

              {avgRating !== null && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StarDisplay rating={Math.round(avgRating)} />
                    <span className="text-sm text-gray-500">{avgRating}/5 ({subReviews.length} {subReviews.length === 1 ? 'beoordeling' : 'beoordelingen'})</span>
                  </div>
                  <UsageBar pct={avgUsage} />
                </div>
              )}

              {/* Eigen review */}
              <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-600">Jouw beoordeling</span>
                  {myReview ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(sub, myReview)}
                        className="text-xs text-primary hover:underline"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => { if (confirm('Beoordeling verwijderen?')) deleteReview(myReview.id); }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Verwijderen
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openModal(sub, null)}
                      className="text-xs text-primary hover:underline"
                    >
                      + Toevoegen
                    </button>
                  )}
                </div>
                {myReview ? (
                  <div className="space-y-1">
                    <StarDisplay rating={myReview.rating} />
                    <p className="text-xs text-slate-500">Gebruik: {myReview.usage_pct}%</p>
                    {myReview.note && <p className="text-xs text-slate-600 italic">"{myReview.note}"</p>}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Nog niet beoordeeld</p>
                )}
              </div>

              {/* Beoordelingen van collega's */}
              {otherReviews.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600">Collega's ({otherReviews.length})</span>
                  {otherReviews.map(r => (
                    <div key={r.id} className="rounded-md bg-slate-50 border border-slate-200 p-3 space-y-1">
                      <StarDisplay rating={r.rating} />
                      <p className="text-xs text-slate-500">Gebruik: {r.usage_pct}%</p>
                      {r.note && <p className="text-xs text-slate-600 italic">"{r.note}"</p>}
                    </div>
                  ))}
                </div>
              )}

              {subReviews.length === 0 && (
                <p className="text-xs text-gray-400">Nog geen beoordelingen</p>
              )}
            </div>
          );
        })}
      </div>

      {modalOpen && selectedSub && (
        <ReviewModal
          subscription={selectedSub}
          existingReview={editingReview}
          onSave={handleSaveReview}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export default ReviewsPage;

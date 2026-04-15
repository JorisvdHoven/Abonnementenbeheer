import { useState } from 'react';
import { useSubscriptions, useReviews } from '../hooks/useSubscriptions';
import ReviewModal from '../components/ReviewModal';

function ReviewsPage() {
  const { subscriptions, loading: subsLoading } = useSubscriptions();
  const { reviews, addReview } = useReviews();
  const [selectedSub, setSelectedSub] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const getAverageRating = (subId) => {
    const subReviews = reviews.filter(r => r.subscription_id === subId);
    if (subReviews.length === 0) return null;
    const avg = subReviews.reduce((sum, r) => sum + r.rating, 0) / subReviews.length;
    return Math.round(avg * 10) / 10;
  };

  const handleReview = (sub) => {
    setSelectedSub(sub);
    setModalOpen(true);
  };

  const handleSaveReview = async (reviewData) => {
    await addReview(reviewData);
    setModalOpen(false);
  };

  if (subsLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-dark mb-6">Reviews</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subscriptions.map(sub => {
          const avgRating = getAverageRating(sub.id);
          const userReview = reviews.find(r => r.subscription_id === sub.id && r.user_id === 'current_user'); // Placeholder, need to get current user

          return (
            <div
              key={sub.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleReview(sub)}
            >
              <h3 className="font-semibold text-lg mb-2">{sub.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{sub.vendor}</p>
              {avgRating ? (
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < Math.floor(avgRating) ? 'text-yellow-400' : 'text-gray-300'}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">{avgRating}/5</span>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-2">Nog geen reviews</p>
              )}
              {userReview && (
                <p className="text-xs text-green-600">Je hebt dit al beoordeeld</p>
              )}
            </div>
          );
        })}
      </div>

      {modalOpen && selectedSub && (
        <ReviewModal
          subscription={selectedSub}
          onSave={handleSaveReview}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export default ReviewsPage;
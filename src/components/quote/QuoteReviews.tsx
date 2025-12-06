import { EditableText } from "../EditableText";
import { Star } from "lucide-react";

interface Review {
  author: string;
  text: string;
  rating: number;
}

interface QuoteReviewsProps {
  title: string;
  onTitleChange: (value: string) => void;
  overallRating: string;
  onOverallRatingChange: (value: string) => void;
  totalReviews: string;
  onTotalReviewsChange: (value: string) => void;
  reviews: Review[];
  onReviewsChange: (reviews: Review[]) => void;
}

export function QuoteReviews({
  title,
  onTitleChange,
  overallRating,
  onOverallRatingChange,
  totalReviews,
  onTotalReviewsChange,
  reviews,
  onReviewsChange,
}: QuoteReviewsProps) {
  const updateReviewAuthor = (index: number, newAuthor: string) => {
    const newReviews = [...reviews];
    newReviews[index] = { ...newReviews[index], author: newAuthor };
    onReviewsChange(newReviews);
  };

  const updateReviewText = (index: number, newText: string) => {
    const newReviews = [...reviews];
    newReviews[index] = { ...newReviews[index], text: newText };
    onReviewsChange(newReviews);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <section className="reviews-section mb-16 p-8 bg-muted/30 rounded-lg" data-pdf-section="reviews">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4" data-pdf-editable="reviews-title">
          <EditableText
            value={title}
            onChange={onTitleChange}
            placeholder="Ce que nos voyageurs disent de nous"
            className="text-3xl font-bold"
          />
        </h2>

        {/* Note globale */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((star) => (
              <Star
                key={star}
                className="h-6 w-6 fill-yellow-400 text-yellow-400"
              />
            ))}
            {/* 5ème étoile partiellement remplie pour simuler 4.9 */}
            <div className="relative">
               {/* Étoile de fond (grise) */}
               <Star className="h-6 w-6 text-gray-300 fill-gray-300" />
               {/* Étoile de remplissage (jaune), coupée pour l'effet 4.9 */}
               <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '80%' }}>
                 <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
               </div>
            </div>
          </div>
          <span className="text-2xl font-bold" data-pdf-editable="reviews-rating">
            <EditableText
              value={overallRating}
              onChange={onOverallRatingChange}
              placeholder="4.9"
              className="text-2xl font-bold inline-block"
            />
            <span className="text-muted-foreground">/5</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Basé sur{" "}
          <EditableText
            value={totalReviews}
            onChange={onTotalReviewsChange}
            placeholder="150"
            className="inline-block font-semibold"
          />{" "}
          avis clients
        </p>
      </div>

      {/* Témoignages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews.map((review, index) => (
          <div
            key={index}
            className="p-6 bg-background rounded-lg shadow-sm border border-border"
            data-pdf-item="review"
          >
            <div className="mb-3">{renderStars(review.rating)}</div>
            <p className="text-sm text-muted-foreground italic mb-4" data-pdf-review-text>
              <EditableText
                value={review.text}
                onChange={(val) => updateReviewText(index, val)}
                multiline
                placeholder="Témoignage client..."
                className="text-sm text-muted-foreground italic"
              />
            </p>
            <p className="text-sm font-semibold" data-pdf-review-author>
              <EditableText
                value={review.author}
                onChange={(val) => updateReviewAuthor(index, val)}
                placeholder="Nom du voyageur"
                className="text-sm font-semibold"
              />
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

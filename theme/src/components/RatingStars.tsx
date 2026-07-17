type RatingStarsProps = {
  rating: number;
  reviews?: number;
};

export function RatingStars({ rating, reviews }: RatingStarsProps) {
  return (
    <div className="rating" aria-label={`${rating} out of 5 stars`}>
      <span className="stars">{"*".repeat(Math.round(rating)).padEnd(5, "-")}</span>
      <span>{rating.toFixed(1)}</span>
      {reviews ? <span className="muted">({reviews} reviews)</span> : null}
    </div>
  );
}

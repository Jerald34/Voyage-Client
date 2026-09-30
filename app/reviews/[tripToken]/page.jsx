import ReviewForm from "./ReviewForm";

export default async function ReviewPage({ params, searchParams }) {
  const { tripToken } = await params;
  const search = (await searchParams) ?? {};
  const initialRating = (() => {
    const n = parseInt(search.rating ?? "", 10);
    return n >= 1 && n <= 5 ? n : null;
  })();
  return <ReviewForm tripToken={tripToken} initialRating={initialRating} />;
}

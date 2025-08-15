import { ReviewCard } from "@/components/ReviewCard";
import { ReviewControls } from "@/components/ReviewControls";
import { ReviewProgress } from "@/components/ReviewProgress";
import SkeletonLoader from "@/components/SkeletonLoader";
import { useReviewQueue } from "@/components/hooks/useReviewQueue";

export function ReviewApp() {
  const { current, current_index, total, is_loading, is_error, error_message, is_flipped, flip, gradeCurrent } =
    useReviewQueue({ limit: 10 });

  if (is_loading) return <SkeletonLoader count={6} />;
  if (is_error) return <p className="text-red-600">{error_message ?? "Wystąpił błąd."}</p>;

  return (
    <>
      <ReviewProgress current_index={Math.min(current_index, Math.max(0, total - 1))} total={total} />
      {current ? (
        <ReviewCard question={current.question} answer={current.answer} is_flipped={is_flipped} onFlip={flip} />
      ) : (
        <div className="mt-6 text-center text-gray-600">Brak fiszek do powtórki.</div>
      )}
      <ReviewControls
        onGrade={async (g) => {
          try {
            await gradeCurrent(g);
          } catch {
            /* no-op */
          }
        }}
        disabled={!current}
      />
    </>
  );
}

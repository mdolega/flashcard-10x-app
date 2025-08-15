interface ReviewProgressProps {
  current_index: number;
  total: number;
}

export function ReviewProgress({ current_index, total }: ReviewProgressProps) {
  if (total === 0) {
    return (
      <p className="text-center text-sm text-gray-600" role="status">
        Brak fiszek do powtórki.
      </p>
    );
  }

  return (
    <p className="text-center text-sm text-gray-600" role="status">
      {current_index + 1} / {total}
    </p>
  );
}

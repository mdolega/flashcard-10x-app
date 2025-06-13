import React from "react";
import { Button } from "./ui/button";

interface RetryButtonProps {
  onRetry: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}

export default function RetryButton({ onRetry, loading = false, children = "Spróbuj ponownie" }: RetryButtonProps) {
  return (
    <Button
      onClick={onRetry}
      disabled={loading}
      variant="outline"
      className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-300"
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
          Próbuję ponownie...
        </>
      ) : (
        <>
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {children}
        </>
      )}
    </Button>
  );
}

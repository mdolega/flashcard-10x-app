import React from "react";
import GenerateForm from "./GenerateForm";
import FlashcardList from "./FlashcardList";
import SkeletonLoader from "./SkeletonLoader";
import RetryButton from "./RetryButton";
import { useGenerateFlashcards } from "./hooks/useGenerateFlashcards";
import type { GenerateFormData } from "../types";

export default function GenerateView() {
  const { data, loading, error, generate, retry } = useGenerateFlashcards();

  const handleGenerate = (formData: GenerateFormData) => {
    generate(formData);
  };

  const handleRetry = () => {
    retry();
  };

  return (
    <div className="space-y-8">
      <GenerateForm onGenerate={handleGenerate} loading={loading} />

      {loading && <SkeletonLoader />}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error.message}</p>
            </div>
          </div>
          <div className="mt-4">
            <RetryButton onRetry={handleRetry} />
          </div>
        </div>
      )}

      {data && data.flashcards && data.flashcards.length > 0 && <FlashcardList flashcards={data.flashcards} />}
    </div>
  );
}

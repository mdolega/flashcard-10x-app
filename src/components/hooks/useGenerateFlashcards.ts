import { useState, useCallback } from "react";
import type { FlashcardGenerateCommand, FlashcardGenerateResponseDto, GenerateFormData } from "../../types";

interface UseGenerateFlashcardsReturn {
  data: FlashcardGenerateResponseDto | null;
  loading: boolean;
  error: Error | null;
  generate: (formData: GenerateFormData) => Promise<void>;
  retry: () => Promise<void>;
}

export function useGenerateFlashcards(): UseGenerateFlashcardsReturn {
  const [data, setData] = useState<FlashcardGenerateResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastRequest, setLastRequest] = useState<GenerateFormData | null>(null);

  const generateFlashcards = useCallback(async (formData: GenerateFormData) => {
    // Early return for validation
    if (!formData.text || formData.text.length < 500 || formData.text.length > 10000) {
      setError(new Error("Tekst musi mieć od 500 do 10000 znaków"));
      return;
    }

    if (formData.count < 1 || formData.count > 20) {
      setError(new Error("Liczba fiszek musi być od 1 do 20"));
      return;
    }

    setLoading(true);
    setError(null);
    setLastRequest(formData);

    try {
      const command: FlashcardGenerateCommand = {
        text: formData.text,
        count: formData.count,
      };

      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TODO: Add authorization header when auth is implemented
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login
          window.location.href = "/login";
          return;
        }

        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Błąd walidacji danych");
        }

        if (response.status === 503) {
          throw new Error("Wystąpił błąd podczas generowania fiszek. Spróbuj ponownie.");
        }

        throw new Error("Wystąpił nieoczekiwany błąd");
      }

      const result: FlashcardGenerateResponseDto = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Wystąpił nieoczekiwany błąd"));
    } finally {
      setLoading(false);
    }
  }, []);

  const retry = useCallback(async () => {
    if (lastRequest) {
      await generateFlashcards(lastRequest);
    }
  }, [lastRequest, generateFlashcards]);

  return {
    data,
    loading,
    error,
    generate: generateFlashcards,
    retry,
  };
}

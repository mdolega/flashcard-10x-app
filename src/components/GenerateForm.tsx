import React, { useState, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import type { GenerateFormData } from "../types";

interface GenerateFormProps {
  onGenerate: (data: GenerateFormData) => void;
  loading?: boolean;
}

export default function GenerateForm({ onGenerate, loading = false }: GenerateFormProps) {
  const [text, setText] = useState("");
  const [count, setCount] = useState(5);
  const [errors, setErrors] = useState<{ text?: string; count?: string }>({});

  const validateForm = useCallback(() => {
    const newErrors: { text?: string; count?: string } = {};

    // Text validation
    if (!text.trim()) {
      newErrors.text = "Tekst jest wymagany";
    } else if (text.length < 500) {
      newErrors.text = `Tekst musi mieć co najmniej 500 znaków (obecnie: ${text.length})`;
    } else if (text.length > 10000) {
      newErrors.text = `Tekst może mieć maksymalnie 10000 znaków (obecnie: ${text.length})`;
    }

    // Count validation
    if (count < 1) {
      newErrors.count = "Liczba fiszek musi być co najmniej 1";
    } else if (count > 20) {
      newErrors.count = "Liczba fiszek może być maksymalnie 20";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [text, count]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      onGenerate({ text: text.trim(), count });
    },
    [text, count, validateForm, onGenerate]
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Clear text error on change
    if (errors.text) {
      setErrors((prev) => ({ ...prev, text: undefined }));
    }
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCount(isNaN(value) ? 1 : value);
    // Clear count error on change
    if (errors.count) {
      setErrors((prev) => ({ ...prev, count: undefined }));
    }
  };

  const isFormValid = text.length >= 500 && text.length <= 10000 && count >= 1 && count <= 20;
  const characterCount = text.length;
  const characterStatus = characterCount < 500 ? "too-few" : characterCount > 10000 ? "too-many" : "valid";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generuj fiszki z AI</CardTitle>
        <CardDescription>
          Wklej tekst źródłowy (500-10000 znaków) i wybierz liczbę fiszek do wygenerowania (1-20).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="source-text"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Tekst źródłowy
            </label>
            <Textarea
              id="source-text"
              placeholder="Wklej tutaj tekst, z którego mają zostać wygenerowane fiszki..."
              value={text}
              onChange={handleTextChange}
              className={`min-h-[200px] resize-y ${errors.text ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              aria-describedby="character-count text-error"
            />
            <div className="flex justify-between items-center text-sm">
              <div
                id="character-count"
                className={`${
                  characterStatus === "too-few"
                    ? "text-orange-600"
                    : characterStatus === "too-many"
                      ? "text-red-600"
                      : "text-green-600"
                }`}
              >
                {characterCount} / 10000 znaków
                {characterStatus === "too-few" && ` (potrzeba jeszcze ${500 - characterCount})`}
              </div>
            </div>
            {errors.text && (
              <p id="text-error" className="text-sm text-red-600" role="alert">
                {errors.text}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="flashcard-count"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Liczba fiszek do wygenerowania
            </label>
            <Input
              id="flashcard-count"
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={handleCountChange}
              className={`w-24 ${errors.count ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              aria-describedby="count-error"
            />
            {errors.count && (
              <p id="count-error" className="text-sm text-red-600" role="alert">
                {errors.count}
              </p>
            )}
          </div>

          <Button type="submit" disabled={!isFormValid || loading} className="w-full">
            {loading ? "Generuję fiszki..." : "Generuj fiszki"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

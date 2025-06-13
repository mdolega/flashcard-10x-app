import React, { useState, useCallback } from "react";
import FlashcardItem from "./FlashcardItem";
import type { GenerateFlashcardDto, EditableFlashcardDto } from "../types";

interface FlashcardListProps {
  flashcards: GenerateFlashcardDto[];
}

export default function FlashcardList({ flashcards }: FlashcardListProps) {
  // Convert to editable flashcards and manage edit state
  const [editableFlashcards, setEditableFlashcards] = useState<EditableFlashcardDto[]>(
    flashcards.map((card) => ({ ...card, isEdited: false, status: "ai-generated" }))
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleStartEdit = useCallback((index: number) => {
    setEditingIndex(index);
  }, []);

  const handleEdit = useCallback((index: number, field: keyof GenerateFlashcardDto, value: string) => {
    setEditableFlashcards((prev) => prev.map((card, i) => (i === index ? { ...card, [field]: value } : card)));
  }, []);

  const handleSave = useCallback((index: number) => {
    setEditableFlashcards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, isEdited: true, status: "ai-edited" } : card))
    );
    setEditingIndex(null);
  }, []);

  const handleCancel = useCallback(
    (index: number) => {
      // Revert to original flashcard data
      setEditableFlashcards((prev) =>
        prev.map((card, i) =>
          i === index ? { ...flashcards[index], isEdited: card.isEdited, status: card.status } : card
        )
      );
      setEditingIndex(null);
    },
    [flashcards]
  );

  if (!editableFlashcards || editableFlashcards.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Brak fiszek do wyświetlenia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Wygenerowane fiszki ({editableFlashcards.length})</h2>
        <div className="text-sm text-gray-500">Możesz teraz przejrzeć i edytować wygenerowane fiszki</div>
      </div>

      <div className="grid gap-4" role="list" aria-label="Lista wygenerowanych fiszek">
        {editableFlashcards.map((card, index) => (
          <div key={index} role="listitem">
            <FlashcardItem
              card={card}
              index={index}
              isEditing={editingIndex === index}
              onStartEdit={() => handleStartEdit(index)}
              onEdit={handleEdit}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

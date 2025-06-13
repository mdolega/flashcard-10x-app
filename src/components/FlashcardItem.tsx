import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Edit3, Save, X, CheckCircle } from "lucide-react";
import type { EditableFlashcardDto, GenerateFlashcardDto } from "../types";

interface FlashcardItemProps {
  card: EditableFlashcardDto;
  index?: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onEdit: (index: number, field: keyof GenerateFlashcardDto, value: string) => void;
  onSave: (index: number) => void;
  onCancel: (index: number) => void;
}

export default function FlashcardItem({
  card,
  index = 0,
  isEditing,
  onStartEdit,
  onEdit,
  onSave,
  onCancel,
}: FlashcardItemProps) {
  const [editForm, setEditForm] = useState({
    question: card.question,
    answer: card.answer,
    difficulty: card.difficulty,
  });

  // Update form when card changes
  useEffect(() => {
    if (!isEditing) {
      setEditForm({
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty,
      });
    }
  }, [card, isEditing]);

  const getDifficultyLabel = (difficulty: EditableFlashcardDto["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return "Łatwy";
      case "medium":
        return "Średni";
      case "hard":
        return "Trudny";
      default:
        return "Nieznany";
    }
  };

  const getDifficultyColor = (difficulty: EditableFlashcardDto["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "hard":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleFormChange = (field: keyof GenerateFlashcardDto, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    onEdit(index, field, value);
  };

  const handleSave = () => {
    if (editForm.question.trim() && editForm.answer.trim()) {
      onSave(index);
    }
  };

  const handleCancel = () => {
    setEditForm({
      question: card.question,
      answer: card.answer,
      difficulty: card.difficulty,
    });
    onCancel(index);
  };

  const isFormValid = editForm.question.trim().length > 0 && editForm.answer.trim().length > 0;

  return (
    <TooltipProvider>
      <div
        className={`bg-white border rounded-lg p-6 shadow-sm transition-all duration-200 ${
          isEditing ? "border-blue-300 bg-blue-50/30 shadow-md" : "border-gray-200 hover:shadow-md"
        }`}
      >
        <div className="space-y-4">
          {/* Header with title and edit button */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Pytanie {index + 1}
              {card.isEdited && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-600" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fiszka została edytowana</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </h3>

            {!isEditing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onStartEdit}
                    className="h-8 w-8 p-0"
                    aria-label={`Edytuj fiszkę ${index + 1}`}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edytuj fiszkę</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Question section */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Pytanie</h4>
            {isEditing ? (
              <Textarea
                value={editForm.question}
                onChange={(e) => handleFormChange("question", e.target.value)}
                placeholder="Wprowadź pytanie..."
                className="min-h-[80px] resize-none"
                aria-label="Pytanie fiszki"
              />
            ) : (
              <div className="text-gray-900 leading-relaxed prose prose-sm max-w-none">
                <ReactMarkdown>{card.question}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Answer section */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Odpowiedź</h4>
            {isEditing ? (
              <Textarea
                value={editForm.answer}
                onChange={(e) => handleFormChange("answer", e.target.value)}
                placeholder="Wprowadź odpowiedź..."
                className="min-h-[80px] resize-none"
                aria-label="Odpowiedź fiszki"
              />
            ) : (
              <div className="text-gray-900 leading-relaxed prose prose-sm max-w-none">
                <ReactMarkdown>{card.answer}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Difficulty and actions section */}
          <div className="flex items-center justify-between pt-2">
            {isEditing ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label htmlFor={`difficulty-${index}`} className="text-sm font-medium text-gray-700">
                    Poziom:
                  </label>
                  <Select value={editForm.difficulty} onValueChange={(value) => handleFormChange("difficulty", value)}>
                    <SelectTrigger className="w-32" id={`difficulty-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Łatwy</SelectItem>
                      <SelectItem value="medium">Średni</SelectItem>
                      <SelectItem value="hard">Trudny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleSave}
                        disabled={!isFormValid}
                        size="sm"
                        className="h-8"
                        aria-label="Zapisz zmiany"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Zapisz
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Zapisz zmiany w fiszce</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        size="sm"
                        className="h-8"
                        aria-label="Anuluj edycję"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Anuluj
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Anuluj edycję bez zapisywania</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Badge className={`${getDifficultyColor(card.difficulty)}`}>
                  {getDifficultyLabel(card.difficulty)}
                </Badge>
                {card.isEdited && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Edytowane
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

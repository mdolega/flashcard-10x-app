import { z } from "zod";

export const flashcardGenerateSchema = z.object({
  text: z
    .string({
      required_error: "Text is required",
      invalid_type_error: "Text must be a string",
    })
    .min(1000, "Text must be at least 1000 characters long")
    .max(10000, "Text must not exceed 10000 characters"),

  count: z
    .number({
      required_error: "Number of flashcards is required",
      invalid_type_error: "Number of flashcards must be a number",
    })
    .int("Number of flashcards must be an integer")
    .min(1, "At least 1 flashcard must be generated")
    .max(20, "Maximum 20 flashcards can be generated at once"),
});

export type FlashcardGenerateSchema = typeof flashcardGenerateSchema;
export type FlashcardGenerateInput = z.input<FlashcardGenerateSchema>;
export type FlashcardGenerateOutput = z.output<FlashcardGenerateSchema>;

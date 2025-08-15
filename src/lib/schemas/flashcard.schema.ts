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

// Schema for creating a new flashcard manually
export const flashcardCreateSchema = z.object({
  question: z
    .string({
      required_error: "Question is required",
      invalid_type_error: "Question must be a string",
    })
    .min(1, "Question cannot be empty")
    .max(200, "Question must not exceed 200 characters"),

  answer: z
    .string({
      required_error: "Answer is required",
      invalid_type_error: "Answer must be a string",
    })
    .min(1, "Answer cannot be empty")
    .max(500, "Answer must not exceed 500 characters"),

  difficulty: z
    .enum(["easy", "medium", "hard"], {
      invalid_type_error: "Difficulty must be easy, medium, or hard",
    })
    .default("medium"),
});

// Schema for updating an existing flashcard
export const flashcardUpdateSchema = z.object({
  question: z
    .string()
    .min(1, "Question cannot be empty")
    .max(200, "Question must not exceed 200 characters")
    .optional(),

  answer: z.string().min(1, "Answer cannot be empty").max(500, "Answer must not exceed 500 characters").optional(),

  difficulty: z
    .enum(["easy", "medium", "hard"], {
      invalid_type_error: "Difficulty must be easy, medium, or hard",
    })
    .optional(),
});

// Schema for query parameters
export const flashcardQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["manual", "ai-generated", "ai-edited"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  sort_by: z.enum(["created_at", "updated_at", "difficulty", "question"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const reviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort_by: z.enum(["next_review_at"]).default("next_review_at"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export const reviewGradeSchema = z.object({
  grade: z
    .number({ invalid_type_error: "grade must be a number" })
    .int("grade must be an integer")
    .min(0, "grade must be >= 0")
    .max(5, "grade must be <= 5"),
});

export type FlashcardGenerateSchema = typeof flashcardGenerateSchema;
export type FlashcardGenerateInput = z.input<FlashcardGenerateSchema>;
export type FlashcardGenerateOutput = z.output<FlashcardGenerateSchema>;

export type FlashcardCreateSchema = typeof flashcardCreateSchema;
export type FlashcardCreateInput = z.input<FlashcardCreateSchema>;
export type FlashcardCreateOutput = z.output<FlashcardCreateSchema>;

export type FlashcardUpdateSchema = typeof flashcardUpdateSchema;
export type FlashcardUpdateInput = z.input<FlashcardUpdateSchema>;
export type FlashcardUpdateOutput = z.output<FlashcardUpdateSchema>;

export type FlashcardQuerySchema = typeof flashcardQuerySchema;
export type FlashcardQueryInput = z.input<FlashcardQuerySchema>;
export type FlashcardQueryOutput = z.output<FlashcardQuerySchema>;

export type ReviewQuerySchema = typeof reviewQuerySchema;
export type ReviewQueryInput = z.input<ReviewQuerySchema>;
export type ReviewQueryOutput = z.output<ReviewQuerySchema>;

export type ReviewGradeSchema = typeof reviewGradeSchema;
export type ReviewGradeInput = z.input<ReviewGradeSchema>;
export type ReviewGradeOutput = z.output<ReviewGradeSchema>;

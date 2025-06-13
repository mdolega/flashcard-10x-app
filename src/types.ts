// src/types.ts
// DTO and Command Model definitions generated from database entities and API plan

import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

// Aliases for raw table row and insert/update types
type FlashcardRow = Tables<"flashcards">;
type FlashcardInsert = TablesInsert<"flashcards">;
type FlashcardUpdate = TablesUpdate<"flashcards">;
type AiLogRow = Tables<"ai_generations_logs">;

// Domain-specific enums and unions
/** Difficulty levels for flashcards */
export type Difficulty = "easy" | "medium" | "hard";
/** Flashcard status values */
export type FlashcardStatus = "manual" | "ai-generated" | "ai-edited";
/** AI log status values (from DB enum) */
export type AiLogStatus = AiLogRow["status"];

// Generic pagination and list response
/** Pagination metadata */
export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
}
/** Standard list response wrapper */
export interface ListResponse<T> {
  data: T[];
  pagination: PaginationDto;
}

// Generic query parameters for listing endpoints
export type QueryParams = Partial<{ page: number; limit: number; sort_by: string; order: "asc" | "desc" }>;

//----------------------
// Authentication
//----------------------
/** POST /auth/register */
export interface AuthRegisterCommand {
  email: string;
  password: string;
}
/** POST /auth/login */
export interface AuthLoginCommand {
  email: string;
  password: string;
}
/** Response for register/login */
export interface AuthResponseDto {
  access_token: string;
  token_type: "bearer";
}

//----------------------
// User
//----------------------
/** PATCH /users/password */
export interface UserPasswordUpdateCommand {
  current_password: string;
  new_password: string;
}

//----------------------
// Flashcards
//----------------------
/** Query parameters for GET /flashcards */
export type FlashcardQueryParamsDto = QueryParams & Partial<{ status: FlashcardStatus; difficulty: Difficulty }>;

/** Flashcard representation returned by GET endpoints */
export type FlashcardDto = Pick<
  FlashcardRow,
  "id" | "question" | "answer" | "status" | "difficulty" | "created_at" | "updated_at"
>;

/** Response wrapper for GET /flashcards */
export type FlashcardsListResponseDto = ListResponse<FlashcardDto>;

/** POST /flashcards */
export type FlashcardCreateCommand = Pick<FlashcardInsert, "question" | "answer" | "difficulty">;

/** PATCH /flashcards/{id} */
export type FlashcardUpdateCommand = Partial<Pick<FlashcardUpdate, "question" | "answer" | "difficulty">>;

/** PATCH /flashcards/{id}/status */
export interface FlashcardStatusUpdateCommand {
  status: "accepted" | "rejected";
}

/** POST /flashcards/generate */
export interface FlashcardGenerateCommand {
  text: string; // 500-10000 characters
  count: number; // 1-20 flashcards
}

/** Individual flashcard returned from generation */
export type GenerateFlashcardDto = Pick<FlashcardDto, "question" | "answer" | "difficulty">;

/** Editable flashcard with additional metadata for UI state */
export interface EditableFlashcardDto extends GenerateFlashcardDto {
  id?: string; // Optional ID for tracking
  status?: FlashcardStatus; // Status after editing
  isEdited?: boolean; // Flag if flashcard was edited by user
}

/** Callbacks for flashcard editing operations */
export interface FlashcardEditCallbacks {
  onEdit: (index: number, field: keyof GenerateFlashcardDto, value: string) => void;
  onSave: (index: number) => void;
  onCancel: (index: number) => void;
}

/** Response for POST /flashcards/generate */
export interface FlashcardGenerateResponseDto {
  flashcards: GenerateFlashcardDto[];
  generation_id: string;
}

/** Form data for the generate form */
export interface GenerateFormData {
  text: string;
  count: number;
}

/** Item returned by GET /flashcards/review */
export interface FlashcardReviewDto {
  id: FlashcardDto["id"];
  question: FlashcardDto["question"];
  next_review: string; // ISO timestamp
}

/** Response wrapper for GET /flashcards/review */
export type FlashcardReviewListResponseDto = ListResponse<FlashcardReviewDto>;

//----------------------
// AI Generation Logs
//----------------------
/** Query parameters for GET /ai-logs */
export type AiLogQueryParamsDto = QueryParams;

/** Summary of an AI generation log for list views */
export type AiLogDto = Pick<AiLogRow, "id" | "prompt" | "model" | "cost" | "tokens" | "status" | "created_at">;

/** Detailed view of an AI generation log */
export type AiLogDetailDto = Pick<
  AiLogRow,
  "id" | "prompt" | "response" | "model" | "cost" | "tokens" | "status" | "created_at"
>;

/** Response wrapper for GET /ai-logs */
export type AiLogsListResponseDto = ListResponse<AiLogDto>;

//----------------------
// OpenRouter Service
//----------------------
/** Message role for chat completion */
export type ChatMessageRole = "system" | "user" | "assistant";

/** Chat message structure */
export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

/** Model parameters for OpenRouter API */
export interface ModelParams {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/** Configuration for OpenRouter service */
export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultParams?: ModelParams;
}

/** Parameters for generating chat completion */
export interface GenerateChatParams {
  messages: ChatMessage[];
  model?: string;
  params?: ModelParams;
  responseFormat?: ResponseFormat;
}

/** JSON Schema response format */
export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, any>;
  };
}

/** OpenRouter API request payload */
export interface OpenRouterRequestPayload {
  model: string;
  messages: ChatMessage[];
  response_format?: ResponseFormat;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/** OpenRouter API response structure */
export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Custom error types for OpenRouter service */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends Error {
  public retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ServerError";
    this.statusCode = statusCode;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaValidationError";
  }
}

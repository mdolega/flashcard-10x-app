# REST API Plan

## 1. Resources

- **Auth**: Authentication and authorization endpoints (no direct table).
- **User**: Underlying Supabase `auth.users` table.
- **Flashcard**: CRUD operations against the `flashcards` table.
- **AI Generation Log**: CRUD/list operations against the `ai_generations_logs` table.
- **Review**: Virtual resource integrating SRS algorithm to determine due flashcards.

## 2. Endpoints

### 2.1 Authentication

#### POST /auth/register
- Description: Register a new user and issue a JWT.
- Request Body:
  ```json
  {
    "email": "string",      // valid email format
    "password": "string"    // min. 8 characters
  }
  ```
- Response 201:
  ```json
  {
    "access_token": "string",
    "token_type": "bearer"
  }
  ```
- Errors:
  - 400 Bad Request: Validation failed (invalid email, weak password)
  - 409 Conflict: Email already in use

#### POST /auth/login
- Description: Authenticate an existing user and issue a JWT.
- Request Body:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- Response 200:
  ```json
  {
    "access_token": "string",
    "token_type": "bearer"
  }
  ```
- Errors:
  - 400 Bad Request: Missing credentials
  - 401 Unauthorized: Invalid email or password

#### PATCH /users/password
- Description: Change password for authenticated user.
- Security: Bearer token required.
- Request Body:
  ```json
  {
    "current_password": "string",
    "new_password": "string"   // min. 8 characters
  }
  ```
- Response 200:
  ```json
  {
    "message": "Password updated successfully."
  }
  ```
- Errors:
  - 400 Bad Request: Validation failed
  - 403 Forbidden: Current password incorrect

#### DELETE /users/me
- Description: Delete authenticated user account and cascade delete related records (`flashcards`, `ai_generations_logs`).
- Security: Bearer token required.
- Response 204 No Content
- Errors:
  - 401 Unauthorized: Missing or invalid token

### 2.2 Flashcards

#### GET /flashcards
- Description: List flashcards for authenticated user.
- Security: Bearer token required.
- Query Parameters:
  - `page` (int, default=1)
  - `limit` (int, default=20)
  - `status` (string; one of `manual`, `ai-generated`, `ai-edited`)
  - `difficulty` (string; one of `easy`, `medium`, `hard`)
  - `sort_by` (string; e.g., `created_at`, `difficulty`)
  - `order` (string; `asc` or `desc`)
- Response 200:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "question": "string",
        "answer": "string",
        "status": "manual|ai-generated|ai-edited",
        "difficulty": "easy|medium|hard",
        "created_at": "timestamp",
        "updated_at": "timestamp"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 100 }
  }
  ```
- Errors:
  - 400 Bad Request: Invalid query parameters
  - 401 Unauthorized

#### POST /flashcards
- Description: Create a new flashcard manually.  Status set to `manual`
- Security: Bearer token required.
- Request Body:
  ```json
  {
    "question": "string",  // max 200 chars
    "answer": "string",    // max 500 chars
    "difficulty": "easy|medium|hard"  // optional, default `medium`
  }
  ```
- Response 201:
  ```json
  {
    "id": "uuid",
    "question": "string",
    "answer": "string",
    "status": "manual",
    "difficulty": "easy|medium|hard",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
  ```
- Errors:
  - 400 Bad Request: Validation failed
  - 401 Unauthorized

#### PATCH /flashcards/{id}
- Description: Update an existing flashcard (question/answer/difficulty). Status set to `ai-edited` if originally AI-generated.
- Security: Bearer token required.
- Path Parameters:
  - `id` (uuid)
- Request Body:
  ```json
  {
    "question": "string",  // optional, max 200 chars
    "answer": "string",    // optional, max 500 chars
    "difficulty": "easy|medium|hard"  // optional
  }
  ```
- Response 200:
  ```json
  {
    "id": "uuid",
    "status": "manual|ai-edited",
    "updated_at": "timestamp"
  }
  ```
- Errors:
  - 400 Bad Request
  - 401 Unauthorized
  - 404 Not Found

#### DELETE /flashcards/{id}
- Description: Soft-delete a flashcard by setting `deleted_at`.
- Security: Bearer token required.
- Path Parameters:
  - `id` (uuid)
- Response 204 No Content
- Errors:
  - 401 Unauthorized
  - 404 Not Found

#### POST /flashcards/generate
- Description: Generate flashcards via AI based on input text. Add record to ai-generation-logs
- Security: Bearer token required.
- Request Body:
  ```json
  {
    "text": "string",      // 500–10000 chars
    "count": number         // 1–20
  }
  ```
- Response 201:
  ```json
  {
    "flashcards": [
      { "question": "string", "answer": "string", "difficulty": "easy|medium|hard" }
    ],
    "generation_id": "uuid"
  }
  ```
- Errors:
  - 400 Bad Request: Validation failed
  - 401 Unauthorized
  - 503 Service Unavailable: AI service error (retryable)

#### PATCH /flashcards/{id}/status
- Description: Accept or reject an AI-generated flashcard.
- Security: Bearer token required.
- Path Parameters:
  - `id` (uuid)
- Request Body:
  ```json
  { "status": "accepted|rejected" }
  ```
- Response 200:
  ```json
  { "id": "uuid", "status": "accepted|rejected" }
  ```
- Errors:
  - 400 Bad Request: Invalid status
  - 401 Unauthorized
  - 404 Not Found

#### GET /flashcards/review
- Description: Retrieve flashcards due for review via SRS algorithm.
- Security: Bearer token required.
- Query Parameters:
  - `page`, `limit`, `sort_by`, `order`
- Response 200:
  ```json
  {
    "data": [ { "id": "uuid", "question": "string", "next_review": "timestamp" } ],
    "pagination": { "page": 1, "limit": 20, "total": 10 }
  }
  ```
- Errors:
  - 401 Unauthorized

### 2.3 AI Generation Logs

#### GET /ai-logs
- Description: List AI interaction logs.
- Security: Bearer token required.
- Query Parameters: `page`, `limit`, `sort_by`, `order`
- Response 200:
  ```json
  {
    "data": [
      { "id": "uuid", "prompt": "string", "model": "string", "cost": number, "tokens": number, "status": "success|error", "created_at": "timestamp" }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 50 }
  }
  ```
- Errors:
  - 401 Unauthorized

#### GET /ai-logs/{id}
- Description: Retrieve a specific AI generation log.
- Security: Bearer token required.
- Path Parameters: `id` (uuid)
- Response 200:
  ```json
  { "id": "uuid", "prompt": "string", "response": {}, "model": "string", "cost": number, "tokens": number, "status": "success|error", "created_at": "timestamp" }
  ```
- Errors:
  - 401 Unauthorized
  - 404 Not Found

## 3. Authentication and Authorization

- **Mechanism**: JWT Bearer tokens issued by `/auth/login` and `/auth/register`.
- **Authorization**: All resource endpoints require a valid token. Supabase RLS policies ensure users can only access records where `user_id = auth.uid()`.
- **Roles**: Single user role; no additional role hierarchy.

## 4. Validation and Business Logic

- **Flashcard Constraints**:
  - `question`: max length 200
  - `answer`: max length 500
  - `status`: one of `manual`, `ai-generated`, `ai-edited`
  - `difficulty`: one of `easy`, `medium`, `hard`
- **AI Generation**:
  - `text`: 500–10000 chars
  - `count`: 1–20 (env-configurable)
- **Error Handling**:
  - Early guard clauses for authentication and input validation.
  - HTTPException with appropriate status codes.
  - Retry logic for AI service failures (503 with retry-after header).
- **Pagination**:
  - Default `page=1`, `limit=20`.
  - Use B-tree indexes on `flashcards(user_id)` and `ai_generations_logs(user_id)` for efficient queries.
- **Soft Delete**:
  - `deleted_at` field on flashcards; filter out in list endpoints.
- **SRS Integration**:
  - Review endpoint calculates due items via SM-2 or similar; parameters configurable.

---
*This plan adheres to the provided database schema, PRD requirements, and technology stack.* 
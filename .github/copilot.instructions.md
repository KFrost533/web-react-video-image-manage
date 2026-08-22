# Language Learning App – Error Handling & Code Quality Guidelines

## 1. General Principles
- Prioritize **safety**, **predictability**, and **learning continuity**.
- No silent failures; all errors must be surfaced and handled.
- All comments written in English.
- Provide actionable next steps when errors occur.
- Update all affected modules and test thoroughly.

---

## 2. Learning Experience Principles
- Maintain user **flow**: errors must not interrupt learning sessions.
- Provide contextual fallback (e.g., simplified prompt, offline exercises).
- Avoid overwhelming users with technical messages.
- Encourage retry with supportive phrasing.
- Preserve user progress and session state during failures.

---

## 3. Cost Optimization
- Minimize Ollama requests; batch queries when possible.
- Cache AI responses safely (validated, with TTL).
- Avoid background polling; use lazy loading.
- Ensure database queries are optimized (use pgvector indexes for semantic search).
- Monitor response times from local Ollama server.
- **Note**: All processing runs locally with zero cloud costs. Ollama and Gemma models are completely free and open source.

---

## 4. Error Handling
- Wrap async, file, network, and UI initialization in try/catch.
- On AI failure:
  - Provide fallback learning content (vocabulary drill, grammar check).
  - Log detailed error info internally.
  - Never expose stack traces or internal details to users.
- On UI load failure:
  - Render minimal fallback UI with retry.
  - Log before rendering fallback.

---

## 5. Documentation
- Use JSDoc for all functions:
  - Purpose  
  - Parameters  
  - Returns  
  - Side effects  
  - Error cases  
- Add inline comments for non-obvious logic and learning‑specific behavior.

---

## 6. UI Fallback
- Provide fallback learning content (offline examples, cached exercises).
- Keep fallback minimal and distraction-free.
- Avoid dependency on failing components.
- Log before rendering fallback.

---

## 7. Code Quality
- Avoid deep nesting; use early returns.
- Validate all external inputs (user text, tokens, file paths).
- Await all promises.
- No unused or unreachable code.
- Prefer pure functions.
- Separate learning logic from UI logic.

---

## 8. Logging
- Log timestamp, function name, message, stack trace.
- Never log sensitive data (tokens, user text, personal info).
- Log learning‑related events (session start, exercise type, AI mode).

---

## 9. Security
- Sanitize all user inputs.
- Validate file paths and external resources.
- Avoid exposing internal details.
- Ensure Ollama server is only accessible from localhost (or trusted network).
- Never expose DATABASE_URL in logs or error messages.
- Validate all API request payloads (schema validation via AJV).
- Ensure safe handling of user-generated text and learning content.

---

## 10. AI Engine Handling
Support local LLM inference via Ollama:
- **Gemma/Ollama**: Local model (`gemma3:4b` for generation, `embeddinggemma` for embeddings).

Guidelines:
- Validate Ollama server connection before use.
- Implement fallback behavior if Ollama is unavailable.
- Ensure consistent output formatting.
- Gracefully handle model loading delays.

---

## 11. Session Continuity
- Preserve user progress during errors.
- Auto-save exercises.
- Provide “Resume Session” option after recovery.
- Avoid losing conversation context.

---

## 12. User Guidance
- Provide clear, supportive messages:
  - “Something went wrong, but your progress is safe.”
  - “Let’s retry together.”
- Avoid technical jargon.
- Encourage learning continuity.

---

## 13. Configuration & Setup
- Configure Ollama via environment variables:
  - `OLLAMA_BASE_URL`: Ollama server URL (default: `http://127.0.0.1:11434`)
  - `OLLAMA_MODEL`: Generation model (default: `gemma3:4b`)
  - `OLLAMA_EMBEDDING_MODEL`: Embedding model (default: `embeddinggemma`)
  - `DATABASE_URL`: PostgreSQL connection string (required)
- Validate configuration at startup.
- Provide clear error messages if Ollama is unreachable or models are missing.
- Use setup scripts (`npm run setup:ollama`) for initial environment configuration.

---

## 14. File Structure Recommendations
- `/core` – pure logic  
- `/ai` – engine adapters  
- `/ui` – components + fallback UI  
- `/utils` – logging, validation  
- `/config` – Ollama, Whisper, and database settings  

---

## 15. Testing
- Test all error paths (Ollama unavailable, DB connection failed, invalid inputs).
- Test fallback UI and content.
- Test Ollama connection retry logic.
- Test semantic search with vector embeddings.
- Test offline fallback exercises.
- Test session continuity features.
- Test Fast Pipeline generation, reasoning answers, and embedding workflows.
- Validate API responses match expected schema (AJV).
- Test model loading and latency handling.
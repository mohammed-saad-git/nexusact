/**
 * Shared product constants — single source of truth for the input surface,
 * Gemini output defaults, and payload bounds. Kept in one module so every
 * path (server, engine, tests) applies identical guards and fallbacks.
 */

/** Hard ceiling for user-supplied situation text. */
export const MAX_INPUT_LENGTH = 4000;

/** Cap on the decoded image payload the server will accept. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Cap on the base64-encoded image string (base64 inflates by ~33%, plus slack). */
export const MAX_IMAGE_BASE64_CHARS = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4096;

/** Cap on the raw JSON request body (base64 images inflate by ~33%). */
export const MAX_BODY_BYTES = "12mb";

/** Image MIME types accepted from the client as multimodal context. */
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Fallback used whenever the model omits or emits an invalid confidence. */
export const DEFAULT_CONFIDENCE = 0.94;

/** Fallback category applied when the model omits an intent category. */
export const DEFAULT_INTENT_CATEGORY = "GENERAL_ASSISTANCE";

/** Fallback primary intent shown to operators in report summaries. */
export const DEFAULT_PRIMARY_INTENT = "General Real-World Request";

/** Confidence floor/ceiling applied to any model-supplied value. */
export const CONFIDENCE_MIN = 0.0;
export const CONFIDENCE_MAX = 1.0;
import {
  GoogleGenAI,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from "@google/genai";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { gemini as fallbackClient } from "@/lib/gemini/client";

// A key gets a chance to retry this long after being invalidated — Gemini's free-tier daily
// quota resets roughly every 24h, so a key marked invalid for "quota exceeded" today is
// probably usable again tomorrow.
const RETRY_AFTER_HOURS = 20;

function isQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /RESOURCE_EXHAUSTED|quota|429/i.test(message);
}

// Rotates through `gemini_api_key_pool`: always tries the lowest sort_order valid key first
// (sticky — one key drains fully before the next takes over), marks a key invalid the moment
// it hits a quota error and moves on to the next, and falls back to the single shared
// GEMINI_API_KEY if the whole pool is empty or exhausted.
export async function generateWithKeyPool(
  params: GenerateContentParameters,
): Promise<GenerateContentResponse> {
  const admin = createAdminClient();
  const retryCutoff = new Date(Date.now() - RETRY_AFTER_HOURS * 60 * 60 * 1000).toISOString();

  const { data: candidates, error: fetchError } = await admin
    .from("gemini_api_key_pool")
    .select("id, api_key, is_valid, invalidated_at")
    .or(`is_valid.eq.true,invalidated_at.lt.${retryCutoff}`)
    .order("sort_order", { ascending: true });

  if (fetchError) {
    console.error("Failed to fetch Gemini key pool", fetchError);
  }

  for (const candidate of candidates ?? []) {
    let apiKey: string;
    try {
      apiKey = decrypt(candidate.api_key);
    } catch (err) {
      console.error("Failed to decrypt pooled Gemini key", candidate.id, err);
      continue;
    }

    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await client.models.generateContent(params);
      await admin
        .from("gemini_api_key_pool")
        .update({ is_valid: true, last_used_at: new Date().toISOString(), last_error: null })
        .eq("id", candidate.id);
      return response;
    } catch (err) {
      if (!isQuotaError(err)) throw err;

      console.error(`Gemini key ${candidate.id} exhausted, rotating to next`, err);
      await admin
        .from("gemini_api_key_pool")
        .update({
          is_valid: false,
          invalidated_at: new Date().toISOString(),
          last_error: err instanceof Error ? err.message : String(err),
        })
        .eq("id", candidate.id);
      // fall through to the next candidate in the loop
    }
  }

  // Pool empty or every key exhausted — last resort, the original single shared key.
  return fallbackClient.models.generateContent(params);
}

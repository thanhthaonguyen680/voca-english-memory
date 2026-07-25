// CLI helper to add an encrypted Gemini API key into the gemini_api_key_pool table.
// Usage: node scripts/add-gemini-key.mjs <api-key> [label]
//
// Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ENCRYPTION_KEY from
// .env.local (parsed manually — no dotenv dependency). Encrypts the key the same way
// src/lib/crypto.ts does (AES-256-GCM, key derived via SHA-256 of ENCRYPTION_KEY) so
// the app's decrypt() can read it back at request time.

import { readFileSync } from "node:fs";
import { createHash, randomBytes, createCipheriv } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  let content;
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    console.error(`Could not read ${envPath}`);
    process.exit(1);
  }

  const env = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function encrypt(plainText, encryptionKey) {
  const key = createHash("sha256").update(encryptionKey).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((buf) => buf.toString("base64")).join(":");
}

function maskKey(plainText) {
  return `••••••••${plainText.slice(-4)}`;
}

async function main() {
  const [apiKey, label] = process.argv.slice(2);
  if (!apiKey) {
    console.error("Usage: node scripts/add-gemini-key.mjs <api-key> [label]");
    process.exit(1);
  }

  const env = loadEnvLocal();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const encryptionKey = env.ENCRYPTION_KEY;

  if (!supabaseUrl || !serviceRoleKey || !encryptionKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or ENCRYPTION_KEY in .env.local",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: maxRow, error: maxError } = await supabase
    .from("gemini_api_key_pool")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    console.error("Failed to read current pool:", maxError.message);
    process.exit(1);
  }

  const nextSortOrder = (maxRow?.sort_order ?? -1) + 1;
  const encrypted = encrypt(apiKey, encryptionKey);

  const { data: inserted, error: insertError } = await supabase
    .from("gemini_api_key_pool")
    .insert({
      api_key: encrypted,
      label: label ?? null,
      sort_order: nextSortOrder,
    })
    .select("id, sort_order")
    .single();

  if (insertError) {
    console.error("Failed to insert key:", insertError.message);
    process.exit(1);
  }

  console.log(
    `Added Gemini key ${maskKey(apiKey)} (id=${inserted.id}, sort_order=${inserted.sort_order})`,
  );
}

main();

// SECURITY: Only anonymous metadata is sent. No file content ever leaves
// the browser. If Supabase credentials are missing, all operations are no-ops.

import type { SupabaseLogPayload } from '@/types';

let supabaseClient: ReturnType<
  typeof import('@supabase/supabase-js').createClient
> | null = null;
let initAttempted = false;

/**
 * Get or create the Supabase client singleton.
 * Returns null if environment variables are not configured.
 */
async function getClient() {
  if (initAttempted) return supabaseClient;
  initAttempted = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url === 'your-supabase-project-url') {
    console.info(
      '[SwitchFile] Supabase not configured — analytics logging disabled'
    );
    return null;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabaseClient = createClient(url, key);
    return supabaseClient;
  } catch (error) {
    console.warn('[SwitchFile] Failed to initialize Supabase client:', error);
    return null;
  }
}

/**
 * Log a conversion event to Supabase (anonymous metadata only).
 * Gracefully no-ops if Supabase is not configured.
 *
 * SECURITY NOTE: This function only sends metadata (filename, formats, sizes,
 * duration). No file content, user identifiers, or PII is transmitted.
 */
interface SupabaseSimpleClient {
  from: (table: string) => {
    insert: (values: unknown) => Promise<unknown>;
  };
}

export async function logConversion(
  payload: SupabaseLogPayload
): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;

    // Sanitize the filename — remove path components, limit length
    const sanitizedPayload: SupabaseLogPayload = {
      ...payload,
      file_name: sanitizeFileName(payload.file_name),
    };

    await (client as unknown as SupabaseSimpleClient).from('conversion_history').insert(sanitizedPayload);
  } catch (error) {
    // Never let analytics errors break the user experience
    console.warn('[SwitchFile] Failed to log conversion:', error);
  }
}

/**
 * Sanitize a filename for safe storage.
 * Removes path traversal, limits length, strips dangerous characters.
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\]/g, '_') // Remove path separators
    .replace(/[<>:"|?*]/g, '') // Remove OS-dangerous chars
    .substring(0, 255); // Limit length
}

import { createClient, type Session } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;
let sessionPromise: Promise<Session> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase environment variables are missing.");
  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

export function ensureAnonymousSession() {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    const { data: signInData, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    if (!signInData.session) throw new Error("Anonymous session could not be created.");
    return signInData.session;
  })().catch(error => { sessionPromise = null; throw error; });
  return sessionPromise;
}

export function warmAnonymousSession(){void ensureAnonymousSession()}

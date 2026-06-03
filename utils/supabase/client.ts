import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const missingSupabaseClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => undefined } },
    }),
    signInWithOAuth: async () => ({
      data: null,
      error: new Error("Supabase environment variables are not configured"),
    }),
    signOut: async () => ({ error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: new Error("Supabase environment variables are not configured") }),
      }),
    }),
  }),
};

export const createClient = () =>
  supabaseUrl && supabaseKey
    ? createBrowserClient(supabaseUrl, supabaseKey)
    : (missingSupabaseClient as ReturnType<typeof createBrowserClient>);

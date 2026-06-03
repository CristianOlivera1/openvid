import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const missingSupabaseClient = {
  auth: {
    exchangeCodeForSession: async () => ({ error: null }),
  },
};

export const createClient = async () => {
  if (!supabaseUrl || !supabaseKey) {
    return missingSupabaseClient as Awaited<ReturnType<typeof createServerClient>>;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {

        }
      },
    },
  });
};

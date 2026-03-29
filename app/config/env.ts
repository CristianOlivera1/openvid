export const env = {
    unsplash: {
        accessKey: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ?? "",
        secretKey: process.env.NEXT_PUBLIC_UNSPLASH_SECRET_KEY ?? "",
    },
    pexels: {
        apiKey: process.env.NEXT_PUBLIC_PEXELS_API_KEY ?? "",
    },
    pixabay: {
        apiKey: process.env.NEXT_PUBLIC_PIXABAY_API_KEY ?? "",
    },
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        publishableKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
} as const;
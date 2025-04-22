import { createClient } from "@supabase/supabase-js";

// Ensure these environment variables are set in your .env file or environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLIC_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error(
		"Supabase URL and Public Anon API Key must be provided in environment variables.",
	);
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey);

// Define the structure of the token data for type safety
export interface SpotifyTokenData {
	user_id: string;
	access_token: string;
	refresh_token: string;
	expires_at: string; // ISO 8601 timestamp string
}

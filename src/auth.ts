import { supabase, type SpotifyTokenData } from "./supabaseClient";
import { APP_CONFIG } from "./config";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = APP_CONFIG.redirectUri;

const SPOTIFY_SCOPES =
	"user-read-currently-playing user-modify-playback-state user-read-playback-state"; // Add necessary scopes

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

// Define a 5-minute expiration time for state (in milliseconds)
const STATE_EXPIRY_MS = 5 * 60 * 1000;

interface SpotifyTokenResponse {
	access_token: string;
	token_type: string;
	scope: string;
	expires_in: number;
	refresh_token: string;
}

// Interface for state data stored in Supabase
interface StateData {
	state: string;
	user_id: string;
	expires_at: string;
}

export function isConfigured(): boolean {
	const hasClientId = Boolean(SPOTIFY_CLIENT_ID);
	const hasClientSecret = Boolean(SPOTIFY_CLIENT_SECRET);
	const hasRedirectUri = Boolean(SPOTIFY_REDIRECT_URI);
	console.log(
		`Spotify OAuth Config Check - Client ID: ${hasClientId ? "✓" : "✗"}, Secret: ${hasClientSecret ? "✓" : "✗"}, Redirect URI: ${hasRedirectUri ? "✓" : "✗"}`,
	);
	return hasClientId && hasClientSecret && hasRedirectUri;
}

/**
 * Generates a random string for use as a state parameter
 */
function generateRandomState(): string {
	// Generate a random string using Math.random (available in all JS environments)
	return (
		Math.random().toString(36).substring(2, 15) +
		Math.random().toString(36).substring(2, 15)
	);
}

/**
 * Saves a state parameter to Supabase with the associated userId
 */
async function saveState(
	state: string,
	userId: string,
): Promise<{ error: Error | null }> {
	const expires_at = new Date(Date.now() + STATE_EXPIRY_MS).toISOString();

	const { error } = await supabase.from("spotify_states").insert({
		state,
		user_id: userId,
		expires_at,
	});

	if (error) {
		console.error(`Error saving state for user ${userId}:`, error);
		return { error };
	}

	console.log(`State saved for user ${userId}, expires at ${expires_at}`);
	return { error: null };
}

/**
 * Verifies a state parameter and returns the associated userId if valid
 */
export async function verifyState(
	state: string,
): Promise<{ userId: string | null; error: string | null }> {
	if (!state) {
		return { userId: null, error: "No state parameter provided" };
	}

	// Get the state from Supabase
	const { data, error } = await supabase
		.from("spotify_states")
		.select("user_id, expires_at")
		.eq("state", state)
		.single();

	if (error) {
		console.error("State verification failed:", error);
		return { userId: null, error: "Invalid state parameter" };
	}

	if (!data) {
		return { userId: null, error: "State not found" };
	}

	// Check if the state has expired
	const expiresAt = new Date(data.expires_at).getTime();
	if (Date.now() > expiresAt) {
		return { userId: null, error: "State has expired" };
	}

	// Clean up the used state to prevent replay attacks
	await supabase.from("spotify_states").delete().eq("state", state);

	console.log(`State verified successfully for user ${data.user_id}`);
	return { userId: data.user_id, error: null };
}

/**
 * Saves Spotify tokens to Supabase for a given user.
 */
export async function saveTokens(
	userId: string,
	tokens: SpotifyTokenResponse,
): Promise<{ error: Error | null }> {
	if (!userId || !tokens) {
		console.error("saveTokens: Invalid userId or tokens provided.");
		return { error: new Error("Invalid userId or tokens") };
	}
	const expires_at = new Date(
		Date.now() + tokens.expires_in * 1000,
	).toISOString();
	console.log(`Saving tokens for user ${userId}, expires at ${expires_at}`);

	const { error } = await supabase.from("spotify_tokens").upsert(
		{
			user_id: userId,
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token,
			expires_at: expires_at,
		},
		{ onConflict: "user_id" },
	);

	if (error) {
		console.error(`Error saving tokens for user ${userId}:`, error);
		return { error };
	}
	console.log(`Tokens saved successfully for user ${userId}`);
	return { error: null };
}

/**
 * Retrieves Spotify tokens from Supabase for a given user.
 */
export async function getTokens(
	userId: string,
): Promise<{ data: SpotifyTokenData | null; error: Error | null }> {
	if (!userId) {
		console.error("getTokens: Invalid userId provided.");
		return { data: null, error: new Error("Invalid userId") };
	}
	console.log(`Attempting to get tokens for user ${userId}`);
	const { data, error } = await supabase
		.from("spotify_tokens")
		.select("user_id, access_token, refresh_token, expires_at")
		.eq("user_id", userId)
		.single(); // Expecting only one row per user

	if (error && error.code !== "PGRST116") {
		// PGRST116: Row not found, which is okay
		console.error(`Error fetching tokens for user ${userId}:`, error);
		return { data: null, error };
	}
	if (!data) {
		console.log(`No tokens found for user ${userId}`);
		return { data: null, error: null }; // No tokens found is not an error in this context
	}

	console.log(`Tokens retrieved for user ${userId}`);
	return { data: data as SpotifyTokenData, error: null };
}

/**
 * Generates the Spotify authorization URL with a simple random state parameter.
 */
export async function generateSpotifyAuthUrl(
	userId: string,
): Promise<string | null> {
	if (!isConfigured() || !userId) {
		console.error(
			"generateSpotifyAuthUrl: Configuration incomplete or userId missing.",
		);
		return null;
	}

	if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI) {
		console.error(
			"generateSpotifyAuthUrl: Missing required environment variables.",
		);
		return null;
	}

	// Generate a random state and save it with the userId
	const state = generateRandomState();
	const { error } = await saveState(state, userId);

	if (error) {
		console.error(`Failed to save state for user ${userId}:`, error);
		return null;
	}

	const params = new URLSearchParams({
		client_id: SPOTIFY_CLIENT_ID,
		response_type: "code",
		redirect_uri: SPOTIFY_REDIRECT_URI,
		scope: SPOTIFY_SCOPES,
		state: state,
	});

	const authUrl = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
	console.log(`Generated Spotify Auth URL for user ${userId}`);
	return authUrl;
}

/**
 * Exchanges the authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(
	code: string,
): Promise<{ tokens: SpotifyTokenResponse | null; error: string | null }> {
	if (!isConfigured() || !code) {
		console.error(
			"exchangeCodeForTokens: Configuration incomplete or code missing.",
		);
		return { tokens: null, error: "Configuration incomplete or code missing" };
	}

	if (!SPOTIFY_REDIRECT_URI || !SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
		console.error(
			"exchangeCodeForTokens: Missing required environment variables.",
		);
		return { tokens: null, error: "Server configuration error" };
	}

	const params = new URLSearchParams({
		grant_type: "authorization_code",
		code: code,
		redirect_uri: SPOTIFY_REDIRECT_URI,
	});

	const authHeader = `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`;

	try {
		console.log("Exchanging authorization code for tokens...");
		const response = await fetch(SPOTIFY_TOKEN_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: authHeader,
			},
			body: params.toString(),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error("Error exchanging code:", data);
			return {
				tokens: null,
				error: data.error_description || "Failed to exchange code",
			};
		}

		console.log("Tokens obtained successfully via code exchange.");
		return { tokens: data as SpotifyTokenResponse, error: null };
	} catch (error) {
		console.error("Network error during code exchange:", error);
		return {
			tokens: null,
			error: `Network error: ${(error as Error).message}`,
		};
	}
}

/**
 * Refreshes an expired access token using the refresh token.
 */
export async function refreshAccessToken(
	userId: string,
	refreshToken: string,
): Promise<{ accessToken: string | null; error: string | null }> {
	if (!isConfigured() || !userId || !refreshToken) {
		console.error(
			"refreshAccessToken: Configuration incomplete or missing parameters.",
		);
		return {
			accessToken: null,
			error: "Configuration incomplete or missing parameters",
		};
	}

	const params = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: refreshToken,
	});

	const authHeader = `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`;

	try {
		console.log(`Refreshing access token for user ${userId}...`);
		const response = await fetch(SPOTIFY_TOKEN_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: authHeader,
			},
			body: params.toString(),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error(`Error refreshing token for user ${userId}:`, data);
			// If refresh fails (e.g., refresh token revoked), we might need to clear stored tokens
			// and prompt the user to re-authenticate. Consider adding logic here later.
			return {
				accessToken: null,
				error: data.error_description || "Failed to refresh token",
			};
		}

		// Spotify might return a new refresh token, but often doesn't. Update if provided.
		const newTokens: SpotifyTokenResponse = {
			access_token: data.access_token,
			token_type: data.token_type,
			scope: data.scope,
			expires_in: data.expires_in,
			refresh_token: data.refresh_token || refreshToken, // Use new refresh token if sent, otherwise keep old one
		};

		// Save the updated tokens (new access token, potentially new refresh token, new expiry)
		const { error: saveError } = await saveTokens(userId, newTokens);
		if (saveError) {
			// Log the error but still return the new access token if we got one
			console.error(
				`Failed to save refreshed tokens for user ${userId}, but proceeding with new token:`,
				saveError,
			);
		} else {
			console.log(`Refreshed tokens saved successfully for user ${userId}`);
		}

		return { accessToken: newTokens.access_token, error: null };
	} catch (error) {
		console.error(
			`Network error during token refresh for user ${userId}:`,
			error,
		);
		return {
			accessToken: null,
			error: `Network error: ${(error as Error).message}`,
		};
	}
}

/**
 * Gets a valid access token for the user, refreshing if necessary.
 */
export async function getValidAccessToken(
	userId: string,
): Promise<string | null> {
	if (!userId) {
		console.error("getValidAccessToken: No userId provided.");
		return null;
	}

	const { data: tokens, error: fetchError } = await getTokens(userId);

	if (fetchError) {
		console.error(`Failed to fetch tokens for user ${userId}:`, fetchError);
		return null;
	}

	if (!tokens) {
		console.log(
			`No stored tokens found for user ${userId}. Needs authorization.`,
		);
		return null; // User needs to authorize
	}

	const expiresAt = new Date(tokens.expires_at).getTime();
	const now = Date.now();
	const bufferSeconds = 60 * 1000; // Refresh 60 seconds before actual expiry

	if (expiresAt > now + bufferSeconds) {
		console.log(`Valid access token found for user ${userId}`);
		return tokens.access_token; // Token is valid
	}
	console.log(
		`Access token expired or nearing expiry for user ${userId}. Refreshing...`,
	);
	const { accessToken: newAccessToken, error: refreshError } =
		await refreshAccessToken(userId, tokens.refresh_token);
	if (refreshError) {
		console.error(`Failed to refresh token for user ${userId}:`, refreshError);
		// Consider clearing tokens here if refresh fails permanently
		return null;
	}
	return newAccessToken;
}

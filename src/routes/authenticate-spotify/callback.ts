import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { supabase } from "../../supabaseClient";
import { APP_CONFIG } from "../../config";

export default async function callbackHandler(c: Context) {
	// Get code and state from query parameters
	const code = c.req.query("code");
	const state = c.req.query("state");

	if (!code || !state) {
		console.error("Missing code or state parameter in callback");
		// Return a simple error response instead of redirect
		return c.text("Authentication error: Missing required parameters", 400);
	}

	// Get userId from cookies
	const userId = getCookie(c, "userId");

	// Verify state matches (in this case, state is the userId)
	if (state !== userId) {
		console.error(`State mismatch: ${state} vs ${userId}`);
		return c.text("Authentication error: State verification failed", 400);
	}

	// Exchange the authorization code for tokens
	const client_id = process.env.SPOTIFY_CLIENT_ID;
	const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
	const redirect_uri = APP_CONFIG.redirectUri;

	try {
		console.log("Exchanging authorization code for tokens");
		// Make the token exchange request
		const response = await fetch("https://accounts.spotify.com/api/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Basic ${btoa(`${client_id}:${client_secret}`)}`,
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code: code,
				redirect_uri: redirect_uri,
			}),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error("Token exchange failed:", data);
			return c.text(
				`Authentication error: ${data.error_description || "Token exchange failed"}`,
				400,
			);
		}

		// Calculate token expiration
		const expires_at = new Date(
			Date.now() + data.expires_in * 1000,
		).toISOString();

		console.log(`Saving tokens for user ${userId}`);
		// Save tokens directly to database
		const { error } = await supabase.from("spotify_tokens").upsert(
			{
				user_id: userId,
				access_token: data.access_token,
				refresh_token: data.refresh_token,
				expires_at: expires_at,
			},
			{ onConflict: "user_id" },
		);

		if (error) {
			console.error("Failed to save tokens:", error);
			return c.text("Authentication error: Failed to save tokens", 500);
		}

		console.log("Authentication successful, redirecting to main app");
		// Only redirect on success
		return c.redirect(`${APP_CONFIG.appUrl}/me`);
	} catch (error) {
		console.error("Network error during token exchange:", error);
		return c.text(
			`Authentication error: ${(error as Error).message || "Network error"}`,
			500,
		);
	}
}

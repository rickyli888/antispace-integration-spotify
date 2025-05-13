import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { APP_CONFIG } from "../../config";

export default async function handler(c: Context) {
	// Get userId from query parameters
	const userId = c.req.query("userId");

	if (!userId) {
		console.error("Missing userId in authentication request");
		return c.text("Authentication error: Missing user ID", 400);
	}

	// Save userId to cookies before redirecting
	setCookie(c, "userId", userId);

	// Use userId as the state parameter for security
	const state = userId;

	// Define scopes based on what the app needs
	const scope =
		"user-read-currently-playing user-modify-playback-state user-read-playback-state";

	console.log(`Initiating Spotify authorization for user ${userId}`);

	// Redirect to Spotify's authorization endpoint with more readable formatting
	return c.redirect(
		`https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(APP_CONFIG.redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`,
	);
}

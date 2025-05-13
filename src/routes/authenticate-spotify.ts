import {
	verifyState,
	exchangeCodeForTokens,
	saveTokens,
	generateSpotifyAuthUrl,
} from "../auth";
import type { Context } from "hono";

export default async function callbackHandler(c: Context) {
	const url = new URL(c.req.url, "http://localhost"); // fallback base for parsing
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const userIdFromQuery = url.searchParams.get("userId");

	// Handle initiation request if userId is present but code/state are not
	if (userIdFromQuery && !code && !state) {
		const authUrl = await generateSpotifyAuthUrl(userIdFromQuery);
		if (!authUrl) {
			return c.html(
				"<html><body><h2>Spotify OAuth Error</h2><p>Could not generate Spotify authorization URL. Configuration error?</p></body></html>",
				500,
			);
		}
		return c.redirect(authUrl); // Redirect the user's browser to Spotify
	}

	// Proceed with callback logic if code and state are present
	if (!code || !state) {
		return c.html(
			"<html><body><h2>Spotify OAuth Error</h2><p>Missing code or state.</p></body></html>",
			400,
		);
	}

	const { userId, error: stateError } = await verifyState(state);
	if (!userId) {
		return c.html(
			`<html><body><h2>Spotify OAuth Error</h2><p>Invalid or expired state: ${stateError || "Unknown error"}</p></body></html>`,
			400,
		);
	}

	const { tokens, error: tokenError } = await exchangeCodeForTokens(code);
	if (!tokens) {
		return c.html(
			`<html><body><h2>Spotify OAuth Error</h2><p>Failed to exchange code: ${tokenError || "Unknown error"}</p></body></html>`,
			400,
		);
	}

	const { error: saveError } = await saveTokens(userId, tokens);
	if (saveError) {
		return c.html(
			`<html><body><h2>Spotify OAuth Error</h2><p>Failed to save tokens: ${saveError.message || "Unknown error"}</p></body></html>`,
			500,
		);
	}

	// Success: redirect to main app
	return c.html(
		"<html><body><h2>Spotify Connected!</h2><p>You can now return to Antispace.</p></body></html>",
	);
}

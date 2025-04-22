import { verifyStateJWT, exchangeCodeForTokens, saveTokens } from "../auth";
import type { Context } from "hono";

export default async function callbackHandler(c: Context) {
	const url = new URL(c.req.url, "http://localhost"); // fallback base for parsing
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");

	if (!code || !state) {
		return c.html(
			"<html><body><h2>Spotify OAuth Error</h2><p>Missing code or state.</p></body></html>",
			400,
		);
	}

	const { userId, error: stateError } = verifyStateJWT(state);
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

	// Success: show a minimal confirmation page
	return c.html(
		"<html><body><h2>Spotify Connected!</h2><p>You can now return to Antispace.</p></body></html>",
	);
}

import { SpotifyApi } from "@spotify/web-api-ts-sdk";

// Detect if we're in a production environment
const isProduction = process.env.NODE_ENV === "production";

// Base URLs for different environments
const LOCAL_BASE_URL = "http://localhost:6100";
const PRODUCTION_BASE_URL =
	"https://67785f1649190667cc2a7861-67f7cdb3e50e4c6c0bf66597-app.anti.space";

// Antispace app URLs
const LOCAL_APP_URL = "http://localhost:3000";
const PRODUCTION_APP_URL = "https://anti.space";

export const APP_CONFIG = {
	baseUrl: isProduction ? PRODUCTION_BASE_URL : LOCAL_BASE_URL,
	appUrl: isProduction ? PRODUCTION_APP_URL : LOCAL_APP_URL,
	redirectUri: isProduction
		? `${PRODUCTION_BASE_URL}/authenticate-spotify/callback`
		: `${LOCAL_BASE_URL}/authenticate-spotify/callback`,
};

export const SPOTIFY_CONFIG = {
	clientId: process.env.SPOTIFY_CLIENT_ID || "",
	clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
};

// Create the Spotify API client with client credentials
export const spotifyClient = SpotifyApi.withClientCredentials(
	SPOTIFY_CONFIG.clientId,
	SPOTIFY_CONFIG.clientSecret,
);

export async function getClientCredentialsToken() {
	try {
		console.log("Client credentials grant with new SDK");

		const accessToken = await spotifyClient.getAccessToken();

		return {
			accessToken,
		};
	} catch (error) {
		console.error("Error getting client credentials token:", error);
		if (error instanceof Error) {
			console.error(`Error message: ${error.message}`);
			console.error(`Error stack: ${error.stack}`);
		}
		throw error;
	}
}

export async function ensureAccessToken() {
	try {
		console.log("Ensuring access token is valid...");
		const accessToken = await spotifyClient.getAccessToken();
		console.log;
		return accessToken;
	} catch (error) {
		console.error("Error ensuring access token:", error);
		if (error instanceof Error) {
			console.error(`Error message: ${error.message}`);
		}
		throw error;
	}
}

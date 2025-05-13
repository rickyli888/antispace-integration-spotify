import type { AntispaceMetadata } from "@antispace/sdk";
import type { SpotifyTrack, SpotifyPlaybackState } from "../../spotify-type";
import { spotifyClient } from "../../config";
import { isConfigured, getValidAccessToken } from "../../auth";
import type { Track, RecommendationSeed } from "@spotify/web-api-ts-sdk";

export async function getCurrentPlayback(
	userId: string,
): Promise<SpotifyPlaybackState | null> {
	try {
		console.log(`Getting current playback for user ${userId}`);
		const accessToken = await getValidAccessToken(userId);

		if (!accessToken) {
			console.log(`No valid access token for user ${userId}`);
			return null;
		}

		const response = await fetch("https://api.spotify.com/v1/me/player", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		// If 204 No Content, the user is not playing anything
		if (response.status === 204) {
			console.log("User is not playing anything");
			return null;
		}

		if (!response.ok) {
			console.error(`Error getting playback: ${response.status}`);
			return null;
		}

		const data = await response.json();
		return data as SpotifyPlaybackState;
	} catch (error) {
		console.error("Error getting current playback:", error);
		return null;
	}
}

async function ensureValidToken() {
	console.log("Ensuring valid Spotify token before API call...");
	if (!isConfigured()) {
		console.error("Spotify API not configured. Missing environment variables.");
		throw new Error(
			"Spotify API not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your environment variables.",
		);
	}

	return true;
}

export async function getRecommendationsSearch(
	seedTracks?: string[],
	seedArtists?: string[],
	seedGenres?: string[],
	limit = 10,
): Promise<SpotifyTrack[]> {
	const hasSeeds =
		(seedTracks && seedTracks.length > 0) ||
		(seedArtists && seedArtists.length > 0) ||
		(seedGenres && seedGenres.length > 0);

	if (!hasSeeds) {
		return [];
	}

	try {
		const recommendationParams: {
			seed_tracks?: string[];
			seed_artists?: string[];
			seed_genres?: string[];
			limit: number;
		} = { limit };

		if (seedTracks && seedTracks.length > 0) {
			recommendationParams.seed_tracks = seedTracks;
		}
		if (seedArtists && seedArtists.length > 0) {
			recommendationParams.seed_artists = seedArtists;
		}
		if (seedGenres && seedGenres.length > 0) {
			recommendationParams.seed_genres = seedGenres;
		}

		const recommendations =
			await spotifyClient.recommendations.get(recommendationParams);

		if (!recommendations || !recommendations.tracks) {
			console.log(
				"Spotify API returned no recommendations for the given seeds.",
			);
			return [];
		}

		console.log(
			`Recommendations received: ${recommendations.tracks.length} tracks found. Mapping results...`,
		);

		return recommendations.tracks.map(
			(track: Track): SpotifyTrack => ({
				id: track.id,
				name: track.name,
				artists: track.artists.map((artist) => ({
					id: artist.id,
					name: artist.name,
				})),
				album: {
					name: track.album.name,
					images: track.album.images,
				},
				preview_url: track.preview_url,
				external_urls: track.external_urls,
			}),
		);
	} catch (error) {
		console.error("Detailed error in getRecommendationsSearch:", error);
		if (error instanceof Error) {
			console.error(`Error name: ${error.name}`);
			console.error(`Error message: ${error.message}`);
		}
		return [];
	}
}

export async function getRecommendations(
	trackId: string,
): Promise<SpotifyTrack[]> {
	try {
		console.log(`Starting recommendations for track ID: "${trackId}"`);
		if (!trackId) {
			console.log("Missing track ID for recommendations");
			return [];
		}

		// Get the track details
		console.log(`Fetching track details for ID: "${trackId}"`);
		let track;
		try {
			track = await spotifyClient.tracks.get(trackId);
			if (!track) {
				console.log(`Track not found for ID: "${trackId}"`);
				return [];
			}
			console.log(
				`Track found: ${track.name}, Popularity: ${track.popularity}`,
			);
		} catch (trackError) {
			console.error("Error fetching track:", trackError);
		}

		const recommendationParams: {
			seed_tracks: string[];
			limit: number;
			market: string;
			target_popularity?: number;
		} = {
			seed_tracks: [trackId],
			limit: 8,
			market: "US",
		};

		if (track?.popularity) {
			recommendationParams.target_popularity = track.popularity;
		}

		console.log("Recommendation parameters:", recommendationParams);

		try {
			const recommendations =
				await spotifyClient.recommendations.get(recommendationParams);

			if (!recommendations?.tracks?.length) {
				console.log("No recommendations returned from Spotify API");
				return [];
			}

			return recommendations.tracks.map((track) => ({
				id: track.id,
				name: track.name,
				artists: track.artists.map((artist) => ({ name: artist.name })),
				album: {
					name: track.album.name,
					images: track.album.images,
				},
				preview_url: track.preview_url,
				external_urls: track.external_urls,
			}));
		} catch (recoError) {
			console.error("Error getting recommendations:", recoError);

			try {
				console.log("Retrying with minimal parameters...");
				const minimalParams = { seed_tracks: [trackId] };
				const fallbackRecommendations =
					await spotifyClient.recommendations.get(minimalParams);

				if (!fallbackRecommendations?.tracks?.length) {
					return [];
				}

				return fallbackRecommendations.tracks.map((track) => ({
					id: track.id,
					name: track.name,
					artists: track.artists.map((artist) => ({ name: artist.name })),
					album: {
						name: track.album.name,
						images: track.album.images,
					},
					preview_url: track.preview_url,
					external_urls: track.external_urls,
				}));
			} catch (fallbackError) {
				console.error("Even fallback recommendations failed:", fallbackError);

				// If recommendations still fail, try to get the artist's top tracks as a fallback
				if (track?.artists?.[0]?.id) {
					try {
						const artistId = track.artists[0].id;
						console.log(`Falling back to top tracks for artist: ${artistId}`);

						const artistTracks = await spotifyClient.artists.topTracks(
							artistId,
							"US",
						);

						// Filter out the original track
						const recommendations = artistTracks.tracks.filter(
							(t) => t.id !== trackId,
						);

						console.log(
							`Found ${recommendations.length} artist tracks as recommendations`,
						);

						return recommendations.map((track) => ({
							id: track.id,
							name: track.name,
							artists: track.artists.map((artist) => ({ name: artist.name })),
							album: {
								name: track.album.name,
								images: track.album.images,
							},
							preview_url: track.preview_url,
							external_urls: track.external_urls,
						}));
					} catch (artistError) {
						console.error("Artist top tracks fallback failed:", artistError);
					}
				}

				return [];
			}
		}
	} catch (error) {
		console.error("Error in getRecommendations:", error);
		if (error instanceof Error) {
			console.error(`Error name: ${error.name}`);
			console.error(`Error message: ${error.message}`);
		}
		return [];
	}
}

export async function playbackPrevious(userId: string): Promise<boolean> {
	try {
		console.log(`Skipping to previous track for user ${userId}`);
		const accessToken = await getValidAccessToken(userId);

		if (!accessToken) {
			console.log(`No valid access token for user ${userId}`);
			return false;
		}

		const response = await fetch(
			"https://api.spotify.com/v1/me/player/previous",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (response.status === 204 || response.status === 200) {
			console.log(
				`Successfully skipped to previous track (status: ${response.status})`,
			);
			return true;
		}

		console.error(`Error skipping to previous track: ${response.status}`);
		return false;
	} catch (error) {
		console.error("Error skipping to previous track:", error);
		return false;
	}
}

export async function playbackNext(userId: string): Promise<boolean> {
	try {
		console.log(`Skipping to next track for user ${userId}`);
		const accessToken = await getValidAccessToken(userId);

		if (!accessToken) {
			console.log(`No valid access token for user ${userId}`);
			return false;
		}

		const response = await fetch("https://api.spotify.com/v1/me/player/next", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (response.status === 204 || response.status === 200) {
			console.log(
				`Successfully skipped to next track (status: ${response.status})`,
			);
			return true;
		}

		console.error(`Error skipping to next track: ${response.status}`);
		return false;
	} catch (error) {
		console.error("Error skipping to next track:", error);
		return false;
	}
}

export async function playbackPause(userId: string): Promise<boolean> {
	try {
		console.log(`Pausing playback for user ${userId}`);
		const accessToken = await getValidAccessToken(userId);

		if (!accessToken) {
			console.log(`No valid access token for user ${userId}`);
			return false;
		}

		const response = await fetch("https://api.spotify.com/v1/me/player/pause", {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (response.status === 204 || response.status === 200) {
			console.log(`Successfully paused playback (status: ${response.status})`);
			return true;
		}

		console.error(`Error pausing playback: ${response.status}`);
		return false;
	} catch (error) {
		console.error("Error pausing playback:", error);
		return false;
	}
}

export async function playbackResume(userId: string): Promise<boolean> {
	try {
		console.log(`Resuming playback for user ${userId}`);
		const accessToken = await getValidAccessToken(userId);

		if (!accessToken) {
			console.log(`No valid access token for user ${userId}`);
			return false;
		}

		const response = await fetch("https://api.spotify.com/v1/me/player/play", {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (response.status === 204 || response.status === 200) {
			console.log(`Successfully resumed playback (status: ${response.status})`);
			return true;
		}

		console.error(`Error resuming playback: ${response.status}`);
		return false;
	} catch (error) {
		console.error("Error resuming playback:", error);
		return false;
	}
}

export async function toggleShuffle(userId: string): Promise<boolean> {
	try {
		console.log(`Toggling shuffle for user ${userId}`);
		const accessToken = await getValidAccessToken(userId);

		if (!accessToken) {
			console.log(`No valid access token for user ${userId}`);
			return false;
		}

		// First get current playback state to determine current shuffle state
		const playbackState = await getCurrentPlayback(userId);
		if (!playbackState) {
			console.log("Could not get current playback state");
			return false;
		}

		// Toggle the shuffle state
		const newShuffleState = !playbackState.shuffle_state;

		const response = await fetch(
			`https://api.spotify.com/v1/me/player/shuffle?state=${newShuffleState}`,
			{
				method: "PUT",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (response.status === 204 || response.status === 200) {
			console.log(
				`Successfully set shuffle to ${newShuffleState} (status: ${response.status})`,
			);
			return true;
		}

		console.error(`Error toggling shuffle: ${response.status}`);
		return false;
	} catch (error) {
		console.error("Error toggling shuffle:", error);
		return false;
	}
}

export async function toggleRepeat(userId: string): Promise<boolean> {
	try {
		console.log(`Toggling repeat for user ${userId}`);
		const accessToken = await getValidAccessToken(userId);

		if (!accessToken) {
			console.log(`No valid access token for user ${userId}`);
			return false;
		}

		// First get current playback state to determine current repeat state
		const playbackState = await getCurrentPlayback(userId);
		if (!playbackState) {
			console.log("Could not get current playback state");
			return false;
		}

		// Cycle through repeat states: off -> context -> track -> off
		let newRepeatState: string;
		switch (playbackState.repeat_state) {
			case "off":
				newRepeatState = "context";
				break;
			case "context":
				newRepeatState = "track";
				break;
			case "track":
				newRepeatState = "off";
				break;
			default:
				newRepeatState = "off";
		}

		const response = await fetch(
			`https://api.spotify.com/v1/me/player/repeat?state=${newRepeatState}`,
			{
				method: "PUT",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (response.status === 204 || response.status === 200) {
			console.log(
				`Successfully set repeat to ${newRepeatState} (status: ${response.status})`,
			);
			return true;
		}

		console.error(`Error toggling repeat: ${response.status}`);
		return false;
	} catch (error) {
		console.error("Error toggling repeat:", error);
		return false;
	}
}

export async function searchSpotify(
	query: string,
	type: "track" | "album" | "artist" | "playlist" = "track",
): Promise<SpotifyTrack[]> {
	try {
		console.log(`Searching Spotify for: "${query}" (type: ${type})`);
		await ensureValidToken();

		const results = await spotifyClient.search(query, [type], undefined, 8);
		console.log(
			`Search results received: ${results.tracks?.items.length || 0} tracks found`,
		);

		// Only handle tracks for now
		if (type === "track" && results.tracks) {
			return results.tracks.items.map((track) => ({
				id: track.id,
				name: track.name,
				artists: track.artists.map((artist) => ({ name: artist.name })),
				album: {
					name: track.album.name,
					images: track.album.images,
				},
				preview_url: track.preview_url,
				external_urls: track.external_urls,
			}));
		}
		// TODO: handle album, artist, playlist results if needed
		return [];
	} catch (error) {
		console.error("Error searching Spotify:", error);
		if (error instanceof Error) {
			console.error(`Error message: ${error.message}`);
			console.error(`Error stack: ${error.stack}`);
		}
		return [];
	}
}

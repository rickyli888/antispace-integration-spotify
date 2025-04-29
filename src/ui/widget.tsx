import { components as Anti, type AntispaceContext } from "@antispace/sdk";
import type { MyAppUIActions } from "../../types";
import type { SpotifyTrack, SpotifyPlaybackState } from "../spotify-type";
import {
	searchSpotify,
	getRecommendations,
	getRecommendationsSearch,
	getCurrentPlayback,
	playbackPrevious,
	playbackNext,
	playbackPause,
	playbackResume,
	toggleShuffle,
	toggleRepeat,
} from "../ai/actions/spotify";
import { PlaybackStateDisplay } from "./components/PlaybackComponent";

import {
	getValidAccessToken,
	generateSpotifyAuthUrl,
	isConfigured,
} from "../auth";

function TrackItem({ track }: { track: SpotifyTrack }) {
	return (
		<Anti.Row type="border" padding="small" align="center">
			{track?.album?.images?.[0] ? (
				<Anti.Image
					src={track.album.images[0].url}
					width={80}
					height={80}
					rounded={true}
				/>
			) : (
				<Anti.Column width="auto" type="border" align="center" justify="center">
					<Anti.Text type="dim">No Image</Anti.Text>
				</Anti.Column>
			)}
			<Anti.Column spacing="small" padding="small" width="full">
				<Anti.Text type="largetype" weight="bold">
					{track.name}
				</Anti.Text>
				{track.artists && (
					<Anti.Text>{track.artists.map((a) => a.name).join(", ")}</Anti.Text>
				)}
				{track.album && (
					<Anti.Text type="dim">Album: {track.album.name}</Anti.Text>
				)}
				<Anti.Row spacing="small" justify="space-between" align="center">
					<Anti.Row spacing="medium">
						{track.external_urls?.spotify && (
							<Anti.Link
								href={track.external_urls.spotify}
								text="Open in Spotify"
							/>
						)}
					</Anti.Row>
					<Anti.Button
						action={`get_recommendations_${track.id}`}
						text="Find Similar"
						type="secondary"
						size="small"
					/>
				</Anti.Row>
			</Anti.Column>
		</Anti.Row>
	);
}

function SearchResults({ results }: { results: SpotifyTrack[] }) {
	if (results.length === 0) {
		return (
			<Anti.Column
				padding="medium"
				type="border"
				align="center"
				justify="center"
			>
				<Anti.Text type="subheading" align="center">
					No results found
				</Anti.Text>
				<Anti.Text type="dim" align="center">
					Try a different search term or type
				</Anti.Text>
			</Anti.Column>
		);
	}

	return (
		<Anti.Column spacing="small">
			{results.map((track) => (
				<TrackItem key={track.id} track={track} />
			))}
		</Anti.Column>
	);
}

function RecommendationsSearchForm() {
	return (
		<Anti.Column spacing="medium" padding="medium" type="border">
			<Anti.Row spacing="small" align="center">
				<Anti.Text type="heading2">Get Recommendations</Anti.Text>
			</Anti.Row>
			<Anti.Input
				name="seedTracks"
				placeholder="Seed Tracks (comma separated)"
				width="full"
			/>
			<Anti.Input
				name="seedArtists"
				placeholder="Seed Artists (comma separated)"
				width="full"
			/>
			<Anti.Input
				name="seedGenres"
				placeholder="Seed Genres (comma separated)"
				width="full"
			/>
			<Anti.Button
				action="recommendations_search"
				text="Get Recommendations"
				type="primary"
			/>
		</Anti.Column>
	);
}

function SearchForm() {
	return (
		<Anti.Column spacing="medium" padding="medium" type="border">
			<Anti.Row spacing="small" align="center">
				<Anti.Text type="heading2">Search Spotify</Anti.Text>
			</Anti.Row>
			<Anti.Row spacing="small" width="full" align="center">
				<Anti.Input
					placeholder="Search for songs, artists, albums or playlists"
					name="query"
					width="full"
				/>
				<Anti.Select name="type" width="auto">
					<Anti.SelectOption value="track" label="Tracks" />
					<Anti.SelectOption value="album" label="Albums" />
					<Anti.SelectOption value="artist" label="Artists" />
					<Anti.SelectOption value="playlist" label="Playlists" />
				</Anti.Select>
				<Anti.Button action="search_spotify" text="Search" type="primary" />
			</Anti.Row>
		</Anti.Column>
	);
}

async function AuthSection({
	userId,
	action,
}: { userId: string; action?: string }) {
	const accessToken = await getValidAccessToken(userId);

	if (!accessToken) {
		if (action === "connect_spotify") {
			const authUrl = await generateSpotifyAuthUrl(userId);
			if (authUrl) {
				return (
					<Anti.Column
						padding="medium"
						spacing="small"
						type="border"
						align="center"
					>
						<Anti.Text type="largetype">Connect to Spotify</Anti.Text>
						<Anti.Link
							href={authUrl}
							text="Click here to authorize Spotify Access"
						/>
						<Anti.Text type="small" align="center">
							After authorizing, this widget will update.
						</Anti.Text>
					</Anti.Column>
				);
			}
			return (
				<Anti.Column
					padding="medium"
					spacing="small"
					type="border"
					align="center"
				>
					<Anti.Text type="negative" weight="bold">
						Error
					</Anti.Text>
					<Anti.Text type="dim">
						Could not generate Spotify authorization URL.
					</Anti.Text>
				</Anti.Column>
			);
		}

		return (
			<Anti.Column
				padding="medium"
				spacing="small"
				type="border"
				align="center"
			>
				<Anti.Text align="center">
					Connect your Spotify account for user-specific features.
				</Anti.Text>
				<Anti.Button
					action="connect_spotify"
					text="Connect Spotify"
					type="primary"
				/>
			</Anti.Column>
		);
	}

	return (
		<Anti.Row padding="medium" align="center">
			<Anti.Badge text="Spotify Connected" type="primary" />
			{/* User-specific features can be added here later */}
		</Anti.Row>
	);
}

export default async function widgetUI(anti: AntispaceContext<MyAppUIActions>) {
	const { action, values, meta } = anti;
	const userId = meta?.user?.id;

	if (!isConfigured()) {
		return (
			<Anti.Column
				padding="medium"
				spacing="medium"
				type="border"
				align="center"
			>
				<Anti.Text type="negative" weight="bold">
					Configuration Error
				</Anti.Text>
				<Anti.Text type="dim">
					Spotify Client ID/Secret, Redirect URI, or App Secret missing.
				</Anti.Text>
			</Anti.Column>
		);
	}

	const authSection = userId ? await AuthSection({ userId, action }) : null;

	if (action?.startsWith("get_recommendations_")) {
		let results: SpotifyTrack[] = [];
		let error: unknown | null = null;

		// Get trackId from values
		// const trackId = (values as { trackId?: string }).trackId;
		const trackId = action.replace("get_recommendations_", "");

		console.log("trackId", trackId);

		if ((values as { results?: SpotifyTrack[] }).results) {
			console.log(
				"Spotify recommendations:",
				(values as { results?: SpotifyTrack[] }).results,
			);
			results = (values as { results?: SpotifyTrack[] }).results || [];
		} else if (trackId) {
			try {
				results = await getRecommendations(trackId);
			} catch (err) {
				error = err;
				console.error("Error getting recommendations:", err);
			}
		}

		if (error) {
			return (
				<Anti.Column padding="medium" spacing="medium" type="border">
					<Anti.Row spacing="small" align="center">
						<Anti.Text type="negative" weight="bold">
							Error
						</Anti.Text>
					</Anti.Row>
					<Anti.Text type="negative">
						There was an error getting recommendations. Please try again.
					</Anti.Text>
					<Anti.Row padding="medium" justify="center">
						<Anti.Button
							action="search_spotify"
							text="Back to Search"
							type="secondary"
						/>
					</Anti.Row>
				</Anti.Column>
			);
		}

		return (
			<Anti.Column padding="none" spacing="medium">
				<Anti.Column padding="medium" type="border">
					<Anti.Row spacing="small" align="center">
						<Anti.Text type="heading2">Similar Tracks</Anti.Text>
					</Anti.Row>
					<Anti.Text type="dim">
						Found {results.length} recommendations
					</Anti.Text>
				</Anti.Column>

				<SearchResults results={results} />

				<Anti.Row padding="medium" justify="center">
					<Anti.Button action="" text="Back to Main Menu" type="secondary" />
				</Anti.Row>
			</Anti.Column>
		);
	}

	// Handle search results display
	if (action === "search_spotify") {
		let results: SpotifyTrack[] = [];
		let error: unknown | null = null;
		const searchType = (values as { type?: string }).type || "track";

		if ((values as { results?: SpotifyTrack[] }).results) {
			console.log(
				"Spotify search results:",
				(values as { results?: SpotifyTrack[] }).results,
			);
			results = (values as { results?: SpotifyTrack[] }).results || [];
		} else if ((values as { query?: string }).query) {
			try {
				results = await searchSpotify(
					(values as { query: string }).query,
					searchType as "track" | "album" | "artist" | "playlist",
				);
			} catch (err) {
				error = err;
				console.error("Error searching Spotify:", err);
			}
		}

		if (error) {
			return (
				<Anti.Column padding="medium" spacing="medium" type="border">
					<Anti.Row spacing="small" align="center">
						<Anti.Text type="negative" weight="bold">
							Error
						</Anti.Text>
					</Anti.Row>
					<Anti.Text type="negative">
						There was an error searching Spotify. Please try again.
					</Anti.Text>
					<Anti.Row padding="medium" justify="center">
						<Anti.Button action="" text="Back to Main Menu" type="secondary" />
					</Anti.Row>
				</Anti.Column>
			);
		}

		return (
			<div style={{ maxHeight: "500px", overflowY: "scroll" }}>
				<Anti.Column padding="none" spacing="medium">
					<Anti.Row padding="medium" justify="space-between" align="center">
						<Anti.Column>
							<Anti.Row spacing="small" align="center">
								<Anti.Text type="heading2">Search Results</Anti.Text>
							</Anti.Row>
							<Anti.Row>
								<Anti.Text type="dim">
									Found {results.length} {searchType}s for "
									{(values as { query?: string }).query}"
								</Anti.Text>
							</Anti.Row>
						</Anti.Column>

						<Anti.Row padding="medium" justify="end">
							<Anti.Button
								action=""
								text="Back to Main Menu"
								type="secondary"
							/>
						</Anti.Row>
					</Anti.Row>

					<SearchResults results={results} />
				</Anti.Column>
			</div>
		);
	}

	// Handle recommendations search
	if (action === "recommendations_search") {
		let results: SpotifyTrack[] = [];
		let error: unknown | null = null;

		if ((values as { results?: SpotifyTrack[] }).results) {
			results = (values as { results?: SpotifyTrack[] }).results || [];
		} else {
			try {
				const seedTracks =
					(values as { seedTracks?: string }).seedTracks
						?.split(",")
						.map((s) => s.trim()) || [];
				const seedArtists =
					(values as { seedArtists?: string }).seedArtists
						?.split(",")
						.map((s) => s.trim()) || [];
				const seedGenres =
					(values as { seedGenres?: string }).seedGenres
						?.split(",")
						.map((s) => s.trim()) || [];

				results = await getRecommendationsSearch(
					seedTracks,
					seedArtists,
					seedGenres,
				);
			} catch (err) {
				error = err;
				console.error("Error getting recommendations:", err);
			}
		}

		if (error) {
			return (
				<Anti.Column padding="medium" spacing="medium" type="border">
					<Anti.Row spacing="small" align="center">
						<Anti.Text type="negative" weight="bold">
							Error
						</Anti.Text>
					</Anti.Row>
					<Anti.Text type="negative">
						There was an error getting recommendations. Please try again.
					</Anti.Text>
					<Anti.Row padding="medium" justify="center">
						<Anti.Button action="" text="Back to Main Menu" type="secondary" />
					</Anti.Row>
				</Anti.Column>
			);
		}

		return (
			<Anti.Column padding="none" spacing="medium">
				<Anti.Column padding="medium" type="border">
					<Anti.Row spacing="small" align="center">
						<Anti.Text type="heading2">Recommendations</Anti.Text>
					</Anti.Row>
					<Anti.Text type="dim">
						Found {results.length} recommendations
					</Anti.Text>
				</Anti.Column>

				<SearchResults results={results} />

				<Anti.Row padding="medium" justify="center">
					<Anti.Button action="" text="Back to Main Menu" type="secondary" />
				</Anti.Row>
			</Anti.Column>
		);
	}

	// Handle playback control actions
	if (
		action === "playback_previous" ||
		action === "playback_next" ||
		action === "playback_pause" ||
		action === "playback_resume" ||
		action === "toggle_shuffle" ||
		action === "toggle_repeat"
	) {
		if (!userId) {
			return (
				<Anti.Column padding="medium" spacing="medium" type="border">
					<Anti.Text type="negative" weight="bold">
						Error
					</Anti.Text>
					<Anti.Text type="negative">
						You need to be logged in to control playback.
					</Anti.Text>
					<Anti.Row padding="medium" justify="center">
						<Anti.Button action="" text="Back to Main Menu" type="secondary" />
					</Anti.Row>
				</Anti.Column>
			);
		}

		// Execute the appropriate playback control action
		let success = false;
		let actionName = "";
		try {
			switch (action) {
				case "playback_previous":
					success = await playbackPrevious(userId);
					actionName = "Skip to previous";
					break;
				case "playback_next":
					success = await playbackNext(userId);
					actionName = "Skip to next";
					break;
				case "playback_pause":
					success = await playbackPause(userId);
					actionName = "Pause";
					break;
				case "playback_resume":
					success = await playbackResume(userId);
					actionName = "Resume";
					break;
				case "toggle_shuffle":
					success = await toggleShuffle(userId);
					actionName = "Toggle shuffle";
					break;
				case "toggle_repeat":
					success = await toggleRepeat(userId);
					actionName = "Toggle repeat";
					break;
			}
		} catch (err) {
			console.error(`Error with playback action ${action}:`, err);
		}

		// If the action was successful, immediately fetch the updated playback state
		if (success) {
			try {
				const playbackState = await getCurrentPlayback(userId);
				
				return (
					<Anti.Column padding="none" spacing="medium">
						<Anti.Row padding="medium" justify="space-between" align="center">
							<Anti.Column>
								<Anti.Text type="heading1">Spotify Player</Anti.Text>
								<Anti.Text type="positive">{actionName} successful!</Anti.Text>
							</Anti.Column>
							<Anti.Button action="" text="Back to Main Menu" type="secondary" />
						</Anti.Row>

						<PlaybackStateDisplay playbackState={playbackState} />

						<Anti.Button
							action="get_current_playback"
							text="Refresh Playback State"
							type="primary"
						/>
					</Anti.Column>
				);
			} catch (fetchErr) {
				console.error("Error fetching updated playback state:", fetchErr);
			}
		}

		// If action failed or fetching the updated state failed, show error message
		return (
			<Anti.Column padding="medium" spacing="medium" type="border">
				{success ? (
					<Anti.Text type="positive">{actionName} successful, but couldn't fetch updated state.</Anti.Text>
				) : (
					<Anti.Text type="negative">
						There was an issue updating playback. This might be due to
						restrictions on the current device.
					</Anti.Text>
				)}
				<Anti.Button
					action="get_current_playback"
					text="View Playback State"
					type="primary"
				/>
				<Anti.Button
					action=""
					text="Back to Main Menu"
					type="secondary"
				/>
			</Anti.Column>
		);
	}

	// Handle get_current_playback action
	if (action === "get_current_playback") {
		let playbackState: SpotifyPlaybackState | null = null;
		let error: unknown | null = null;

		if ((values as { playbackState?: SpotifyPlaybackState }).playbackState) {
			playbackState =
				(values as { playbackState?: SpotifyPlaybackState }).playbackState ||
				null;
		} else if (userId) {
			try {
				playbackState = await getCurrentPlayback(userId);
			} catch (err) {
				error = err;
				console.error("Error getting playback state:", err);
			}
		}

		if (error) {
			return (
				<Anti.Column padding="medium" spacing="medium" type="border">
					<Anti.Row spacing="small" align="center">
						<Anti.Text type="negative" weight="bold">
							Error
						</Anti.Text>
					</Anti.Row>
					<Anti.Text type="negative">
						There was an error getting your playback state. Please try again.
					</Anti.Text>
					<Anti.Row padding="medium" justify="center">
						<Anti.Button action="" text="Back to Main Menu" type="secondary" />
					</Anti.Row>
				</Anti.Column>
			);
		}

		return (
			<Anti.Column padding="none" spacing="medium">
				<Anti.Row padding="medium" justify="space-between" align="center">
					<Anti.Text type="heading1">Spotify Player</Anti.Text>
					<Anti.Button action="" text="Back to Main Menu" type="secondary" />
				</Anti.Row>

				<PlaybackStateDisplay playbackState={playbackState} />

				<Anti.Button
					action="get_current_playback"
					text="Refresh Playback State"
					type="primary"
				/>
			</Anti.Column>
		);
	}

	// Default view
	return (
		<Anti.Column padding="none" spacing="medium">
			<Anti.Row padding="medium" align="bottom">
				<Anti.Text type="heading1">Spotify</Anti.Text>
				<Anti.Text type="dim">Search and control your music</Anti.Text>
			</Anti.Row>

			{authSection}

			{/* Add this button if the user is authenticated */}
			{userId && (await getValidAccessToken(userId)) && (
				<Anti.Column padding="medium" type="border">
					<Anti.Row spacing="small" align="center">
						<Anti.Text type="heading2">Player Controls</Anti.Text>
					</Anti.Row>
					<Anti.Text type="dim">
						View and control your Spotify playback
					</Anti.Text>
					<Anti.Button
						action="get_current_playback"
						text="View Current Playback"
						type="primary"
					/>
				</Anti.Column>
			)}

			<SearchForm />
			<RecommendationsSearchForm />
		</Anti.Column>
	);
}

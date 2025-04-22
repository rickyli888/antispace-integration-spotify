import type { SpotifyTrack } from "./src/spotify-type";

export type MyAppUIActions = {
	set_nickname: { nickname: string };
	say_nickname: {};
	search_spotify: {
		query: string;
		type?: "track" | "album" | "artist" | "playlist";
		results?: SpotifyTrack[];
	};
	get_recommendations: {
		trackId: string;
		results?: SpotifyTrack[];
	};
	recommendations_search: {
		seedTracks?: string;
		seedArtists?: string;
		seedGenres?: string;
		results?: SpotifyTrack[];
	};
	get_current_playback: {
		playbackState?: SpotifyPlaybackState;
	};
	playback_previous: {};
	playback_next: {};
	playback_pause: {};
	playback_resume: {};
	toggle_shuffle: {};
	toggle_repeat: {};
};

export interface SpotifyTrack {
	id: string;
	name: string;
	artists: Array<{ name: string }>;
	album: {
		name: string;
		images: Array<{ url: string }>;
	};
	preview_url: string | null;
	external_urls?: { spotify: string };
	duration_ms?: number;
}

export interface SpotifyPlaybackState {
	device: {
		id: string | null;
		is_active: boolean;
		is_private_session: boolean;
		is_restricted: boolean;
		name: string;
		type: string;
		volume_percent: number | null;
		supports_volume: boolean;
	};
	repeat_state: "off" | "track" | "context";
	shuffle_state: boolean;
	context: {
		type: string;
		href: string;
		external_urls: { spotify: string };
		uri: string;
	} | null;
	timestamp: number;
	progress_ms: number | null;
	is_playing: boolean;
	item: SpotifyTrack | null;
	currently_playing_type: "track" | "episode" | "ad" | "unknown";
	actions: {
		interrupting_playback?: boolean;
		pausing?: boolean;
		resuming?: boolean;
		seeking?: boolean;
		skipping_next?: boolean;
		skipping_prev?: boolean;
		toggling_repeat_context?: boolean;
		toggling_shuffle?: boolean;
		toggling_repeat_track?: boolean;
		transferring_playback?: boolean;
	};
}

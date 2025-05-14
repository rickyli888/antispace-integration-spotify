import type { AntispaceAppFunction } from "@antispace/sdk";

export const connect_spotify: AntispaceAppFunction<"connect_spotify"> = {
	type: "function",
	function: {
		name: "connect_spotify",
		description: "Initiates the process to connect the user's Spotify account.",
		parameters: {
			type: "object",
			properties: {},
			required: [],
		},
	},
};

export const search_spotify: AntispaceAppFunction<
	"search_spotify",
	{
		query: string;
		type?: "track" | "album" | "artist" | "playlist";
	}
> = {
	type: "function",
	function: {
		name: "search_spotify",
		description:
			"Search for music on Spotify by track, album, artist, or playlist",
		parameters: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description:
						"What you want to search for on Spotify (e.g., 'Daft Punk', 'Bohemian Rhapsody')",
				},
				type: {
					type: "string",
					description:
						"The type of content to search for: track, album, artist, or playlist (defaults to track if not specified)",
				},
			},
			required: ["query"],
		},
	},
};

export const get_recommendations: AntispaceAppFunction<
	"get_recommendations",
	{
		trackId: string;
	}
> = {
	type: "function",
	function: {
		name: "get_recommendations",
		description: "Find similar songs based on a track you like",
		parameters: {
			type: "object",
			properties: {
				trackId: {
					type: "string",
					description:
						"Spotify track ID to use as a reference for finding similar music",
				},
			},
			required: ["trackId"],
		},
	},
};

export const recommendations_search: AntispaceAppFunction<
	"recommendations_search",
	{
		seedTracks?: string;
		seedArtists?: string;
		seedGenres?: string;
	}
> = {
	type: "function",
	function: {
		name: "recommendations_search",
		description:
			"Get music recommendations based on seed tracks, artists, and genres",
		parameters: {
			type: "object",
			properties: {
				seedTracks: {
					type: "string",
					description: "Comma-separated list of Spotify track IDs",
				},
				seedArtists: {
					type: "string",
					description: "Comma-separated list of Spotify artist IDs",
				},
				seedGenres: {
					type: "string",
					description: "Comma-separated list of genre names",
				},
			},
			required: [],
		},
	},
};

export const get_current_playback: AntispaceAppFunction<"get_current_playback"> =
	{
		type: "function",
		function: {
			name: "get_current_playback",
			description:
				"Get information about the user's current Spotify playback state",
			parameters: {
				type: "object",
				properties: {},
				required: [],
			},
		},
	};

export const playback_previous: AntispaceAppFunction<"playback_previous"> = {
	type: "function",
	function: {
		name: "playback_previous",
		description: "Skip to the previous track in the user's Spotify playback",
		parameters: {
			type: "object",
			properties: {},
			required: [],
		},
	},
};

export const playback_next: AntispaceAppFunction<"playback_next"> = {
	type: "function",
	function: {
		name: "playback_next",
		description: "Skip to the next track in the user's Spotify playback",
		parameters: {
			type: "object",
			properties: {},
			required: [],
		},
	},
};

export const playback_pause: AntispaceAppFunction<"playback_pause"> = {
	type: "function",
	function: {
		name: "playback_pause",
		description: "Pause the user's Spotify playback",
		parameters: {
			type: "object",
			properties: {},
			required: [],
		},
	},
};

export const playback_resume: AntispaceAppFunction<"playback_resume"> = {
	type: "function",
	function: {
		name: "playback_resume",
		description: "Resume the user's Spotify playback",
		parameters: {
			type: "object",
			properties: {},
			required: [],
		},
	},
};

export const toggle_shuffle: AntispaceAppFunction<"toggle_shuffle"> = {
	type: "function",
	function: {
		name: "toggle_shuffle",
		description: "Toggle shuffle mode for the user's Spotify playback",
		parameters: {
			type: "object",
			properties: {},
			required: [],
		},
	},
};

export const toggle_repeat: AntispaceAppFunction<"toggle_repeat"> = {
	type: "function",
	function: {
		name: "toggle_repeat",
		description: "Toggle repeat mode for the user's Spotify playback",
		parameters: {
			type: "object",
			properties: {},
			required: [],
		},
	},
};

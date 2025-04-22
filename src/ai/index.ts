import type { AntispaceAIRequest } from "@antispace/sdk";
import type manifest from "../manifest";
import * as actions from "./actions";

export default async function aiActions({
	name,
	parameters,
	meta,
}: AntispaceAIRequest<typeof manifest>) {
	console.log("AI Action called:", name);
	console.log("Parameters and metadata:", parameters, meta);

	const userId = meta?.user?.id;

	switch (name) {
		case "search_spotify": {
			const { query, type } = parameters;
			try {
				const results = await actions.searchSpotify(query, type);
				return {
					success: true,
					results,
				};
			} catch (e: unknown) {
				return {
					error: e instanceof Error ? e.message : String(e) || "Unknown error",
				};
			}
		}

		case "get_recommendations": {
			const { trackId } = parameters;
			try {
				const results = await actions.getRecommendations(trackId);
				return {
					success: true,
					results,
				};
			} catch (e: unknown) {
				return {
					error: e instanceof Error ? e.message : String(e) || "Unknown error",
				};
			}
		}

		case "get_current_playback": {
			if (!userId) {
				return { error: "User authentication required for playback control" };
			}
			try {
				const playbackState = await actions.getCurrentPlayback(userId);
				return {
					success: true,
					playbackState,
				};
			} catch (e: unknown) {
				return {
					error: e instanceof Error ? e.message : String(e) || "Unknown error",
				};
			}
		}

		case "playback_previous": {
			if (!userId) {
				return { error: "User authentication required for playback control" };
			}
			try {
				const success = await actions.playbackPrevious(userId);
				return {
					success,
					message: success 
						? "Skipped to previous track" 
						: "Failed to skip to previous track",
				};
			} catch (e: unknown) {
				return {
					error: e instanceof Error ? e.message : String(e) || "Unknown error",
				};
			}
		}

		case "playback_next": {
			if (!userId) {
				return { error: "User authentication required for playback control" };
			}
			try {
				const success = await actions.playbackNext(userId);
				return {
					success,
					message: success 
						? "Skipped to next track" 
						: "Failed to skip to next track",
				};
			} catch (e: unknown) {
				return {
					error: e instanceof Error ? e.message : String(e) || "Unknown error",
				};
			}
		}

		case "playback_pause": {
			if (!userId) {
				return { error: "User authentication required for playback control" };
			}
			try {
				const success = await actions.playbackPause(userId);
				return {
					success,
					message: success 
						? "Playback paused" 
						: "Failed to pause playback",
				};
			} catch (e: unknown) {
				return {
					error: e instanceof Error ? e.message : String(e) || "Unknown error",
				};
			}
		}

		case "playback_resume": {
			if (!userId) {
				return { error: "User authentication required for playback control" };
			}
			try {
				const success = await actions.playbackResume(userId);
				return {
					success,
					message: success 
						? "Playback resumed" 
						: "Failed to resume playback",
				};
			} catch (e: unknown) {
				return {
					error: e instanceof Error ? e.message : String(e) || "Unknown error",
				};
			}
		}

		case "toggle_shuffle": {
			if (!userId) {
				return { error: "User authentication required for playback control" };
			}
			try {
				const success = await actions.toggleShuffle(userId);
				return {
					success,
					message: success 
						? "Shuffle mode toggled" 
						: "Failed to toggle shuffle mode",
				};
			} catch (e: unknown) {
				return {
					error: e instanceof Error ? e.message : String(e) || "Unknown error",
				};
			}
		}

		case "toggle_repeat": {
			if (!userId) {
				return { error: "User authentication required for playback control" };
			}
			try {
				const success = await actions.toggleRepeat(userId);
				return {
					success,
					message: success 
						? "Repeat mode toggled" 
						: "Failed to toggle repeat mode",
				};
			} catch (e: unknown) {
				return {
					error: e instanceof Error ? e.message : String(e) || "Unknown error",
				};
			}
		}

		case "set_nickname": {
			const { nickname } = parameters;
			// Minimal implementation: just echo back
			return { success: true, nickname };
		}

		case "say_nickname": {
			// Minimal implementation: just echo a static message
			return { success: true, message: "Nickname feature not implemented." };
		}

		default: {
			return { error: `Unknown action: ${name}` };
		}
	}
}

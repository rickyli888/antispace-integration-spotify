import { components as Anti } from "@antispace/sdk";
import type { SpotifyPlaybackState } from "../../spotify-type";

export function PlaybackControls({
	playbackState,
}: { playbackState: SpotifyPlaybackState }) {
	return (
		<Anti.Row
			width="full"
			justify="space-between"
			align="center"
			padding="small"
		>
			<Anti.Button
				action="playback_previous"
				text="Previous"
				type="secondary"
				size="small"
			/>

			{playbackState.is_playing ? (
				<Anti.Button
					action="playback_pause"
					text="Pause"
					type="primary"
					size="medium"
				/>
			) : (
				<Anti.Button
					action="playback_resume"
					text="Play"
					type="primary"
					size="medium"
				/>
			)}

			<Anti.Button
				action="playback_next"
				text="Next"
				type="secondary"
				size="small"
			/>
		</Anti.Row>
	);
}

export function PlaybackStateDisplay({
	playbackState,
}: { playbackState: SpotifyPlaybackState | null }) {
	if (!playbackState) {
		return (
			<Anti.Column padding="medium" type="border" align="center">
				<Anti.Text type="subheading">Not currently playing</Anti.Text>
				<Anti.Text type="dim">
					Play something on Spotify to see details here
				</Anti.Text>
			</Anti.Column>
		);
	}

	// Calculate progress percentage
	const progressPercent =
		playbackState.item &&
		playbackState.progress_ms &&
		playbackState.item.duration_ms
			? Math.round(
					(playbackState.progress_ms / playbackState.item.duration_ms) * 100,
				)
			: 0;

	// Format time (mm:ss)
	const formatTime = (ms: number) => {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	return (
		<Anti.Column
			spacing="medium"
			padding="medium"
			type="border"
			highlighted={true}
		>
			<Anti.Row justify="space-between" align="center" width="full">
				<Anti.Text type="heading2">Now Playing</Anti.Text>
				{playbackState.device && (
					<Anti.Badge
						text={`On ${playbackState.device.name}`}
						type="secondary"
					/>
				)}
			</Anti.Row>

			{playbackState.item ? (
				<Anti.Row align="center" spacing="medium" width="full">
					{playbackState.item.album?.images?.[0] && (
						<Anti.Image
							src={playbackState.item.album.images[0].url}
							width={120}
							height={120}
							rounded={false}
						/>
					)}

					<Anti.Column spacing="small" width="full">
						<Anti.Text type="largetype" weight="bold">
							{playbackState.item.name}
						</Anti.Text>
						<Anti.Text>
							{playbackState.item.artists.map((a) => a.name).join(", ")}
						</Anti.Text>
						<Anti.Text type="dim">
							Album: {playbackState.item.album.name}
						</Anti.Text>

						<Anti.Row width="full" spacing="small" align="center">
							{playbackState.progress_ms !== null && (
								<Anti.Text type="small">
									{formatTime(playbackState.progress_ms)}
								</Anti.Text>
							)}

							{/* Progress indicator using text */}
							<Anti.Text type="dim">{progressPercent}%</Anti.Text>

							{playbackState.item.duration_ms && (
								<Anti.Text type="small">
									{formatTime(playbackState.item.duration_ms)}
								</Anti.Text>
							)}
						</Anti.Row>
					</Anti.Column>
				</Anti.Row>
			) : (
				<Anti.Text type="dim">No track information available</Anti.Text>
			)}

			<PlaybackControls playbackState={playbackState} />

			<Anti.Row width="full" justify="space-between" align="center">
				<Anti.Row spacing="small" align="center">
					<Anti.Text type="small">Shuffle:</Anti.Text>
					<Anti.Button
						action="toggle_shuffle"
						text={playbackState.shuffle_state ? "On" : "Off"}
						type={playbackState.shuffle_state ? "primary" : "secondary"}
						size="small"
					/>
				</Anti.Row>

				<Anti.Row spacing="small" align="center">
					<Anti.Text type="small">Repeat:</Anti.Text>
					<Anti.Button
						action="toggle_repeat"
						text={
							playbackState.repeat_state === "off"
								? "Off"
								: playbackState.repeat_state === "track"
									? "Track"
									: "Context"
						}
						type={
							playbackState.repeat_state === "off" ? "secondary" : "primary"
						}
						size="small"
					/>
				</Anti.Row>
			</Anti.Row>
		</Anti.Column>
	);
}

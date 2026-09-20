
import {
    useAudioPlayer,
    useAudioPlaylist,
    type AudioPlayer,
    type AudioPlaylist,
    type AudioSource,
} from "expo-audio";
import { useCallback, useMemo, useRef } from "react";

interface MusicSource {
    sources: AudioSource[] | AudioSource;
}

interface FXAudio {
    /** Primary player — use for state checks like `.playing` */
    player: AudioPlayer;
    /** Returns true if any player in the pool is currently playing */
    isPlaying: () => boolean;
    play: () => Promise<void>;
    pause: () => void;
    stop: () => Promise<void>;
}

interface MusicAudio {
    playlist: AudioPlaylist;
    play: () => void;
    pause: () => void;
    next: () => void;
    previous: () => void;
}


export function useFX(source: AudioSource, poolSize: 1 | 2 | 3 = 1): FXAudio {
    // Create a fixed pool of players for polyphonic playback
    // All 3 hooks must always be called (rules of hooks), but only `poolSize` are used
    const player0 = useAudioPlayer(source, { keepAudioSessionActive: true });
    const player1 = useAudioPlayer(source, { keepAudioSessionActive: true });
    const player2 = useAudioPlayer(source, { keepAudioSessionActive: true });
    const players = useMemo(
        () => [player0, player1, player2].slice(0, poolSize),
        [player0, player1, player2, poolSize],
    );
    const nextIndex = useRef(0);

    const play = useCallback(async () => {
        const current = players[nextIndex.current];
        nextIndex.current = (nextIndex.current + 1) % players.length;
        await current.seekTo(0);
        current.play();
    }, [players]);

    const stop = useCallback(async () => {
        for (const p of players) {
            p.pause();
            await p.seekTo(0);
        }
    }, [players]);

    const pause = useCallback(() => {
        for (const p of players) {
            p.pause();
        }
    }, [players]);

    const isPlaying = useCallback(
        () => players.some((p) => p.playing),
        [players],
    );

    return useMemo(() => ({
        player: player0,
        isPlaying,
        play,
        pause,
        stop,
    }), [player0, isPlaying, play, pause, stop]);
}

export function useMusic({ sources }: MusicSource): MusicAudio {
    const playlist = useAudioPlaylist({
        sources: Array.isArray(sources) ? sources : [sources],
        loop: "all",
    });

    return useMemo(() => ({
        playlist,
        play: () => playlist.play(),
        pause: () => playlist.pause(),
        next: () => playlist.next(),
        previous: () => playlist.previous(),
    }), [playlist]);
}
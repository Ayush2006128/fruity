
import {
    useAudioPlayer,
    useAudioPlaylist,
    type AudioPlayer,
    type AudioPlaylist,
    type AudioSource,
} from "expo-audio";
import { useCallback, useEffect, useMemo, useRef } from "react";

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
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

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
        if (!isMounted.current || players.length === 0) return;
        const current = players[nextIndex.current];
        if (!current) return;
        nextIndex.current = (nextIndex.current + 1) % players.length;
        try {
            await current.seekTo(0);
        } catch {
            // Seek may fail if not yet ready or at end, but we still attempt playback
        }
        try {
            if (!isMounted.current) return;
            current.play();
        } catch {
            // Player may have been released on unmount or in an invalid state
        }
    }, [players]);

    const stop = useCallback(async () => {
        for (const p of players) {
            try {
                p.pause();
                await p.seekTo(0);
            } catch {
                // Ignore if already released on unmount
            }
        }
    }, [players]);

    const pause = useCallback(() => {
        for (const p of players) {
            try {
                p.pause();
            } catch {
                // Ignore if already released on unmount
            }
        }
    }, [players]);

    const isPlaying = useCallback(() => {
        if (!isMounted.current) return false;
        try {
            return players.some((p) => p.playing);
        } catch {
            return false;
        }
    }, [players]);

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

    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    return useMemo(() => ({
        playlist,
        play: () => {
            if (!isMounted.current) return;
            try {
                playlist.play();
            } catch {
                // Ignore if released
            }
        },
        pause: () => {
            try {
                playlist.pause();
            } catch {
                // Ignore if released
            }
        },
        next: () => {
            if (!isMounted.current) return;
            try {
                playlist.next();
            } catch {
                // Ignore if released
            }
        },
        previous: () => {
            if (!isMounted.current) return;
            try {
                playlist.previous();
            } catch {
                // Ignore if released
            }
        },
    }), [playlist]);
}

import {
    useAudioPlayer,
    useAudioPlaylist,
    type AudioPlayer,
    type AudioPlaylist,
    type AudioSource,
} from "expo-audio";

interface MusicSource {
    sources: AudioSource[] | AudioSource;
}

interface FXAudio {
    player: AudioPlayer;
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

export function useFX(source: AudioSource): FXAudio {
    const player = useAudioPlayer(source, {
        keepAudioSessionActive: true,
    });

    const play = async () => {
        await player.seekTo(0);
        player.play();
    };

    const stop = async () => {
        player.pause();
        await player.seekTo(0);
    };

    return {
        player,
        play,
        pause: () => player.pause(),
        stop,
    };
}

export function useMusic({ sources }: MusicSource): MusicAudio {
    const playlist = useAudioPlaylist({
        sources: Array.isArray(sources) ? sources : [sources],
        loop: "all",
    });

    return {
        playlist,
        play: () => playlist.play(),
        pause: () => playlist.pause(),
        next: () => playlist.next(),
        previous: () => playlist.previous(),
    };
}
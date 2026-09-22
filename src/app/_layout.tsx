import { useMusic } from "@/hooks/audio";
import { setAudioModeAsync } from "expo-audio";
import { Stack } from "expo-router";
import { useEffect } from "react";

export default function RootLayout() {
  const { playlist: musicPlaylist } = useMusic({
    sources: [
      require("@/assets/audio/music/bgm1.mp3"),
      require("@/assets/audio/music/bgm2.mp3"),
    ],
  });

  useEffect(() => {
    let isMounted = true;

    const startMusic = async () => {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "mixWithOthers",
      });

      if (isMounted) {
        musicPlaylist.play();
      }
    };

    void startMusic();

    return () => {
      isMounted = false;
    };
  }, [musicPlaylist]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

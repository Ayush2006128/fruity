import { GameScene } from "@/components/game/GameScene";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";

export default function PlayingScreen() {
  const router = useRouter();

  const handleGameOver = useCallback(
    (score: number) => {
      router.replace(`/game-over?score=${score}`);
    },
    [router],
  );

  return (
    <View style={{ flex: 1 }}>
      <GameScene onGameOver={handleGameOver} />
    </View>
  );
}

import { GameCanvas } from "@/components/game/GameScene";
import { Circle } from "@shopify/react-native-skia";

export default function Index() {
  return (
    <GameCanvas>
      <Circle
        cx={100}
        cy={100}
        r={50}
        color="red"
      />
    </GameCanvas>
  );
}


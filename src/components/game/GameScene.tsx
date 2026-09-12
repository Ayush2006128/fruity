import { theme } from "@/constants/theme";
import type { SwordDirection, TrailPoint } from "@/lib/types";
import {
  Canvas,
  Group,
  Path,
  Skia,
  Image as SkiaImage,
  useImage,
} from "@shopify/react-native-skia";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import Matter from "matter-js";
import { useEffect, useRef } from "react";
import { Dimensions, StyleSheet } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";

const { width, height } = Dimensions.get("window");
const SWORD_SCALE = 0.4;
const SWORD_SIZE = 176 * SWORD_SCALE;
const HALF_SWORD_SIZE = SWORD_SIZE / 2;
const TRAIL_LENGTH = 14;

const swordSprites: Record<SwordDirection, number> = {
  right: require("@/assets/sprites/sward-right.png"),
  "right-down": require("@/assets/sprites/sward-right-down.png"),
  left: require("@/assets/sprites/sward-left.png"),
  "left-down": require("@/assets/sprites/sward-left-down.png"),
};

function directionForDelta(
  dx: number,
  dy: number,
  previous: SwordDirection,
): SwordDirection {
  "worklet";

  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return previous;
  const side = dx >= 0 ? "right" : "left";
  return Math.abs(dy) > Math.abs(dx) && dy > 0
    ? (`${side}-down` as SwordDirection)
    : side;
}

export function GameScene() {
  const swordX = useSharedValue(width / 2);
  const swordY = useSharedValue(height / 2);
  const direction = useSharedValue<SwordDirection>("right");
  const trail = useSharedValue<TrailPoint[]>([]);
  const lastTouchX = useSharedValue(width / 2);
  const lastTouchY = useSharedValue(height / 2);
  const swordRef = useRef<Matter.Body | null>(null);

  const rightSword = useImage(swordSprites.right);
  const rightDownSword = useImage(swordSprites["right-down"]);
  const leftSword = useImage(swordSprites.left);
  const leftDownSword = useImage(swordSprites["left-down"]);

  const trailPath = useDerivedValue(() => {
    const pathBuilder = Skia.PathBuilder.Make();
    const points = trail.value;
    if (points.length > 1) {
      pathBuilder.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        pathBuilder.lineTo(points[index].x, points[index].y);
      }
    }
    return pathBuilder.build();
  });

  const swordImage = useDerivedValue(() => {
    switch (direction.value) {
      case "right-down":
        return rightDownSword;
      case "left":
        return leftSword;
      case "left-down":
        return leftDownSword;
      default:
        return rightSword;
    }
  });

  const swordImageX = useDerivedValue(() => swordX.value - HALF_SWORD_SIZE);
  const swordImageY = useDerivedValue(() => swordY.value - HALF_SWORD_SIZE);

  const swordSound = useAudioPlayer(require("@/assets/audio/fx/sword_swoosh.wav"));

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
    });
  }, []);

  useEffect(() => {
    const engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.scale = 0;
    const sword = Matter.Bodies.rectangle(width / 2, height / 2, SWORD_SIZE, SWORD_SIZE, {
      label: "sword",
      isStatic: true,
      isSensor: true,
      friction: 0,
      frictionAir: 0,
      restitution: 0,
    });
    swordRef.current = sword;

    const rightWall = Matter.Bodies.rectangle(width + (width * 0.05), height / 2, 10, height, { isStatic: true });
    const leftWall = Matter.Bodies.rectangle(-width * 0.05, height / 2, 10, height, { isStatic: true });
    Matter.World.add(engine.world, [sword, rightWall, leftWall]);

    return () => {
      Matter.World.remove(engine.world, [sword, rightWall, leftWall]);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      swordRef.current = null;
    };
  }, []);

  const moveSwordBody = (x: number, y: number) => {
    const sword = swordRef.current;
    if (!sword) return;
    Matter.Body.setPosition(sword, { x, y });
    Matter.Body.setVelocity(sword, { x: 0, y: 0 });
    if (!swordSound.playing) {
      swordSound.seekTo(0);
      swordSound.play();
    }
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      trail.value = [{ x: swordX.value, y: swordY.value, opacity: 1 }];
      lastTouchX.value = swordX.value;
      lastTouchY.value = swordY.value;
    })
    .onUpdate((event) => {
      const { x, y } = event;
      direction.value = directionForDelta(
        x - lastTouchX.value,
        y - lastTouchY.value,
        direction.value,
      );
      lastTouchX.value = x;
      lastTouchY.value = y;
      swordX.value = x;
      swordY.value = y;
      trail.value = [
        ...trail.value.slice(-(TRAIL_LENGTH - 1)),
        { x, y, opacity: 1 },
      ];
      runOnJS(moveSwordBody)(x, y);
    })
    .onEnd(() => {
      trail.value = trail.value.map((point, index, points) => ({
        ...point,
        opacity: (index + 1) / points.length,
      }));
    });

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Canvas style={styles.canvas}>
          <Group opacity={0.2}>
            <Path
              path={trailPath}
              color={theme.colors.primary}
              style="stroke"
              strokeWidth={38}
            />
          </Group>
          <Path
            path={trailPath}
            color="#fff7dd"
            style="stroke"
            strokeWidth={14}
          />
          <SkiaImage
            image={swordImage}
            x={swordImageX}
            y={swordImageY}
            width={SWORD_SIZE}
            height={SWORD_SIZE}
            fit="contain"
          />
        </Canvas>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  canvas: {
    flex: 1,
    height: "100%",
    width: "100%",
  },
});

import { theme } from "@/constants/theme";
import { useFX, useMusic } from "@/hooks/audio";
import type { SwordDirection, TrailPoint } from "@/lib/types";
import {
  Canvas,
  Group,
  Path,
  Skia,
  Image as SkiaImage,
  Text as SkiaText,
  useFont,
  useImage,
} from "@shopify/react-native-skia";
import { setAudioModeAsync } from "expo-audio";
import Matter from "matter-js";
import { memo, useEffect, useRef, useState } from "react";
import { Dimensions, StyleSheet } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import {
  makeMutable,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";

const { width, height } = Dimensions.get("window");
const SWORD_SCALE = 0.4;
const SWORD_SIZE = 176 * SWORD_SCALE;
const HALF_SWORD_SIZE = SWORD_SIZE / 2;
const TRAIL_LENGTH = 14;
const FRUIT_SIZE = 88;
const FRUIT_RADIUS = FRUIT_SIZE / 2;
const ZERO_VELOCITY = { x: 0, y: 0 };
const FRUIT_TYPES = [
  "apple",
  "peach",
  "pear",
  "cherry",
  "lemon",
  "mango",
  "pineapple",
  "strawberry",
  "watermelon",
  "bomb",
  "life",
] as const;
type FruitType = (typeof FRUIT_TYPES)[number];

const swordSprites: Record<SwordDirection, number> = {
  right: require("@/assets/sprites/sward-right.png"),
  "right-down": require("@/assets/sprites/sward-right-down.png"),
  left: require("@/assets/sprites/sward-left.png"),
  "left-down": require("@/assets/sprites/sward-left-down.png"),
};

const fruitSprites: Record<FruitType, number> = {
  apple: require("@/assets/sprites/apple.png"),
  peach: require("@/assets/sprites/peach.png"),
  pear: require("@/assets/sprites/pear.png"),
  cherry: require("@/assets/sprites/cherry.png"),
  lemon: require("@/assets/sprites/lemon.png"),
  mango: require("@/assets/sprites/mango.png"),
  pineapple: require("@/assets/sprites/pineapple.png"),
  strawberry: require("@/assets/sprites/strawberry.png"),
  watermelon: require("@/assets/sprites/watermelon.png"),
  bomb: require("@/assets/sprites/bomb.png"),
  life: require("@/assets/sprites/life.png"),
};

type GameFruit = {
  id: number;
  type: FruitType;
  body: Matter.Body;
  x: SharedValue<number>;
  y: SharedValue<number>;
  rotation: SharedValue<number>;
  sliceProgress: SharedValue<number>;
  isSliced: boolean;
};

type FruitSpriteProps = Pick<
  GameFruit,
  "x" | "y" | "rotation" | "sliceProgress"
> & {
  isSliced: boolean;
  image: ReturnType<typeof useImage>;
};

const FruitSprite = memo(function FruitSprite({
  x,
  y,
  rotation,
  sliceProgress,
  isSliced,
  image,
}: FruitSpriteProps) {
  const opacity = useDerivedValue(() => 1 - sliceProgress.value);
  const transform = useDerivedValue(() => {
    const progress = sliceProgress.value;
    const scaleX = isSliced ? 1 + progress * 0.35 : 1;
    return [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: rotation.value },
      { scaleX },
      { translateX: -FRUIT_RADIUS },
      { translateY: -FRUIT_RADIUS },
    ];
  });

  return (
    <Group
      opacity={opacity}
      transform={transform}
    >
      <SkiaImage
        image={image}
        x={0}
        y={0}
        width={FRUIT_SIZE}
        height={FRUIT_SIZE}
        fit="contain"
      />
    </Group>
  );
});

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

type GameSceneProps = {
  onGameOver: (score: number) => void;
};

export function GameScene({ onGameOver }: GameSceneProps) {
  const swordX = useSharedValue(width / 2);
  const swordY = useSharedValue(height / 2);
  const direction = useSharedValue<SwordDirection>("right");
  const trail = useSharedValue<TrailPoint[]>([]);
  const lastTouchX = useSharedValue(width / 2);
  const lastTouchY = useSharedValue(height / 2);
  const swordRef = useRef<Matter.Body | null>(null);
  const fruitsRef = useRef<GameFruit[]>([]);
  const [fruits, setFruits] = useState<GameFruit[]>([]);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;
  const gameOverRef = useRef(false);
  const scoreFont = useFont(
    require("@/assets/fonts/CarterOne-Regular.ttf"),
    32,
  );
  const scoreText = `SCORE: ${score}`;

  const rightSword = useImage(swordSprites.right);
  const rightDownSword = useImage(swordSprites["right-down"]);
  const leftSword = useImage(swordSprites.left);
  const leftDownSword = useImage(swordSprites["left-down"]);

  // Preload all fruit images once at the parent level
  const fruitImages = {
    apple: useImage(fruitSprites.apple),
    peach: useImage(fruitSprites.peach),
    pear: useImage(fruitSprites.pear),
    cherry: useImage(fruitSprites.cherry),
    lemon: useImage(fruitSprites.lemon),
    mango: useImage(fruitSprites.mango),
    pineapple: useImage(fruitSprites.pineapple),
    strawberry: useImage(fruitSprites.strawberry),
    watermelon: useImage(fruitSprites.watermelon),
    bomb: useImage(fruitSprites.bomb),
    life: useImage(fruitSprites.life),
  };

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

  const swordSound = useFX(require("@/assets/audio/fx/sword_swoosh.wav"));
  const fruitCutSound = useFX(require("@/assets/audio/fx/fruit_cut.wav"), 3);
  const bombExplosionSound = useFX(
    require("@/assets/audio/fx/bomb_explosion.wav"),
  );
  const lifeGainedSound = useFX(require("@/assets/audio/fx/life_gained.wav"));
  const fruitSoundsRef = useRef({
    cut: fruitCutSound,
    bomb: bombExplosionSound,
    life: lifeGainedSound,
  });
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

  useEffect(() => {
    const engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.y = 1;
    engine.gravity.scale = 0.002;
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

    let nextFruitId = 0;
    let lastFrameTime = performance.now();
    let spawnTimer = 0;
    let fruitsNeedSync = false;
    const removalTimers = new Set<ReturnType<typeof setTimeout>>();

    const removeFruit = (fruit: GameFruit) => {
      Matter.World.remove(engine.world, fruit.body);
      fruitsRef.current = fruitsRef.current.filter(
        (currentFruit) => currentFruit.id !== fruit.id,
      );
      fruitsNeedSync = true;
    };

    const sliceFruit = (body: Matter.Body) => {
      const fruit = fruitsRef.current.find(
        (currentFruit) => currentFruit.body.id === body.id,
      );
      if (!fruit || fruit.isSliced || gameOverRef.current) return;

      fruit.isSliced = true;
      Matter.World.remove(engine.world, fruit.body);
      fruit.sliceProgress.value = withTiming(1, { duration: 320 });

      if (fruit.type === "bomb") {
        gameOverRef.current = true;
        void fruitSoundsRef.current.bomb.play();
        onGameOverRef.current(scoreRef.current);
      } else if (fruit.type === "life") {
        void fruitSoundsRef.current.life.play();
      } else {
        void fruitSoundsRef.current.cut.play();
        setScore((prev) => {
          const next = prev + 1;
          scoreRef.current = next;
          return next;
        });
      }

      const removalTimer = setTimeout(() => {
        removalTimers.delete(removalTimer);
        removeFruit(fruit);
      }, 340);
      removalTimers.add(removalTimer);
    };

    Matter.Events.on(engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        if (pair.bodyA.label === "sword") {
          sliceFruit(pair.bodyB);
        } else if (pair.bodyB.label === "sword") {
          sliceFruit(pair.bodyA);
        }
      }
    });

    const spawnFruit = () => {
      const type =
        FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
      const x = FRUIT_RADIUS + Math.random() * (width - FRUIT_SIZE);
      const body = Matter.Bodies.circle(x, -FRUIT_RADIUS, FRUIT_RADIUS, {
        label: type,
        friction: 0,
        frictionAir: 0.03,
        restitution: 0.3,
      });
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 0.8,
        y: 0,
      });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.04);

      const fruit: GameFruit = {
        id: nextFruitId++,
        type,
        body,
        x: makeMutable(x),
        y: makeMutable(-FRUIT_RADIUS),
        rotation: makeMutable(0),
        sliceProgress: makeMutable(0),
        isSliced: false,
      };
      fruitsRef.current = [...fruitsRef.current, fruit];
      fruitsNeedSync = true;
      Matter.World.add(engine.world, body);
    };

    let animationFrame = 0;
    const update = (timestamp: number) => {
      if (gameOverRef.current) return;

      const delta = Math.min(timestamp - lastFrameTime, 16.667);
      lastFrameTime = timestamp;
      spawnTimer += delta;
      if (spawnTimer >= 850) {
        spawnTimer = 0;
        spawnFruit();
      }

      Matter.Engine.update(engine, delta);
      for (const fruit of fruitsRef.current) {
        if (!fruit.isSliced) {
          fruit.x.value = fruit.body.position.x;
          fruit.y.value = fruit.body.position.y;
          fruit.rotation.value = fruit.body.angle;
          if (fruit.body.position.y > height + FRUIT_SIZE) {
            removeFruit(fruit);
          }
        }
      }
      // Batch React state update: at most one render per frame
      if (fruitsNeedSync) {
        fruitsNeedSync = false;
        setFruits([...fruitsRef.current]);
      }
      animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrame);
      for (const timer of removalTimers) clearTimeout(timer);
      Matter.Events.off(engine, "collisionStart");
      fruitsRef.current = [];
      setFruits([]);
      Matter.World.remove(engine.world, [sword, rightWall, leftWall]);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      swordRef.current = null;
    };
  }, []);

  const moveSwordBodyRef = useRef((x: number, y: number) => {});
  moveSwordBodyRef.current = (x: number, y: number) => {
    const sword = swordRef.current;
    if (!sword) return;
    Matter.Body.setPosition(sword, { x, y });
    Matter.Body.setVelocity(sword, ZERO_VELOCITY);
    if (!swordSound.player.playing) {
      swordSound.player.seekTo(0);
      swordSound.player.play();
    }
  };

  const moveSwordBody = (x: number, y: number) => {
    moveSwordBodyRef.current(x, y);
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
          {fruits.map((fruit) => (
            <FruitSprite
              key={fruit.id}
              image={fruitImages[fruit.type]}
              x={fruit.x}
              y={fruit.y}
              rotation={fruit.rotation}
              sliceProgress={fruit.sliceProgress}
              isSliced={fruit.isSliced}
            />
          ))}
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
          {scoreFont && (
            <SkiaText
              x={20}
              y={52}
              text={scoreText}
              font={scoreFont}
              color={theme.colors.text}
            />
          )}
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

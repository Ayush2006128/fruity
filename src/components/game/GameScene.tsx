import { theme } from "@/constants/theme";
import { Canvas, Circle, Group, RoundedRect } from "@shopify/react-native-skia";
import Matter from "matter-js";
import { useEffect, useRef } from "react";
import { Dimensions, StyleSheet, View, Text } from "react-native";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import { Button } from "../ui/Button";

const { width, height } = Dimensions.get("window");
const BALL_R = 30;
const BOX = 60;

export function GameScene() {
  const ballX = useSharedValue(width / 2);
  const ballY = useSharedValue(80);
  const boxX = useSharedValue(width / 2 - BOX / 2);
  const boxY = useSharedValue(300 - BOX);
  const boxRotation = useSharedValue(0);

  const ballRef = useRef<Matter.Body>(null);

const boxTransform = useDerivedValue(() => [
  { translateX: boxX.value },
  { translateY: boxY.value },
  { rotate: boxRotation.value },
]);

  useEffect(() => {
    const engine = Matter.Engine.create();
    const world = engine.world;

    const ground = Matter.Bodies.rectangle(width / 2, height - 10, width, 20, {
      isStatic: true,
    });

    const box = Matter.Bodies.rectangle(boxX.value + BOX / 2, boxY.value + BOX / 2, BOX, BOX, {
      restitution: 0.7,
    });

    const ball = Matter.Bodies.circle(ballX.value, ballY.value, BALL_R, {
      restitution: 0.8,
      friction: 0.05,
    });

    ballRef.current = ball;

    Matter.World.add(world, [ground, box, ball]);

    const runner = Matter.Runner.create();

    Matter.Events.on(engine, "afterUpdate", () => {
      ballX.value = ball.position.x;
      ballY.value = ball.position.y;
      boxX.value = box.position.x - BOX / 2;
      boxY.value = box.position.y - BOX / 2;
      boxRotation.value = box.angle;
    });
    
    Matter.Runner.run(runner, engine);

    return () => {
      Matter.Runner.stop(runner);
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, []);

  const dropBall = () => {
    const ball = ballRef.current;
    if (!ball) return;
    Matter.Body.setPosition(ball, { x: width / 2, y: 80 });
    Matter.Body.setVelocity(ball, { x: (Math.random() - 0.5) * 10, y: 0 });
  };

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <RoundedRect x={0} y={height - 40} width={width} height={40} r={0} color="#333" />
        <Circle cx={ballX} cy={ballY} r={BALL_R} color="#ff5c5c" />
        <Group transform={boxTransform}>
          <RoundedRect x={-BOX / 2} y={-BOX / 2} width={BOX} height={BOX} r={8} color="#5c7cff" />
        </Group>
      </Canvas>
      <Button onPress={dropBall} color={theme.colors.primary}><Text>Drop Ball</Text></Button>
    </View>
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

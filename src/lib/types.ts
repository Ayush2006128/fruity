import { SharedValue } from "react-native-reanimated";

type GameState = "playing" | "paused" | "gameOver";

export interface GameContextType {
  score: SharedValue<number>;
  gameState: SharedValue<GameState>;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
};

type FruitType = "apple" | "banana" | "cherry" | "grape" | "orange" | "strawberry" | "watermelon" | "pineapple" | "mango" | "bomb" | "life";

export interface Fruit {
  id: string;
  type: FruitType;
  position: { x: SharedValue<number>; y: SharedValue<number> };
  velocity: { x: SharedValue<number>; y: SharedValue<number> };
  acceleration: { x: number; y: number };
  rotationalVelocity: SharedValue<number>;
  rotation: SharedValue<number>;
  isSliced: boolean;
};

type SwardState = "idle" | "swinging" | "cooldown";

export interface Sward {
  position: { x: SharedValue<number>; y: SharedValue<number> };
  velocity: { x: SharedValue<number>; y: SharedValue<number> };
  state: SharedValue<SwardState>;
  lastSwingTime: SharedValue<number>;
};
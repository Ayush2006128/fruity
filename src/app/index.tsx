import { theme } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { useFX } from "@/hooks/audio";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { View, Text, StyleSheet } from "react-native";

export default function StartScreen() {
  const router = useRouter();
  const gameStartSound = useFX(require("@/assets/audio/fx/game_start.wav"));

  const handleStart = async () => {
    await gameStartSound.play();
    router.replace("/playing");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Welcome!</Text>
      <Button onPress={handleStart} color={theme.colors.primary}>
        <SymbolView name={{ ios: "play", android: "play_arrow", web: "play_arrow" }} style={styles.buttonIcon} />
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    fontSize: 48,
    color: theme.colors.text,
    fontFamily: theme.fonts.heading,
    margin: 4,
    padding: 4,
  },
  buttonIcon: {
    width: 19,
    height: 19,
    color: theme.colors.textSecondary,
  },
});

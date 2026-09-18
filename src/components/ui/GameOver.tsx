import { View, Text, StyleSheet } from "react-native";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";

export function GameOverScreen({ gameReset }: { gameReset: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Game Over!</Text>
      <Button onPress={gameReset} color={theme.colors.primary}>
        <Text style={styles.buttonText}>Replay</Text>
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center"
  },
  heading: {
    fontSize: 48,
    color: theme.errorColors.error,
    fontFamily: theme.fonts.heading,
    margin: 4,
    padding: 4
  },
  buttonText: {
    fontSize: 19,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body
  }
});

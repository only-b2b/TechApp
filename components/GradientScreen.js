import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

export default function GradientScreen({ children }) {
  return (
    <LinearGradient
      colors={["#f3b91aff", "#ee8941ff", "#e67d05ff"]}
      style={styles.container}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

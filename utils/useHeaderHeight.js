import { Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useHeaderPadding() {
  const insets = useSafeAreaInsets();
  
  // Use actual safe area inset, not hardcoded values
  const paddingTop = Platform.OS === "ios" 
    ? insets.top 
    : StatusBar.currentHeight || 0;
  
  return paddingTop;
}
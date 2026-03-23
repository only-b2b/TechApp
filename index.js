import { registerRootComponent } from "expo";
import App from "./App";
import messaging from "@react-native-firebase/messaging";

// ✅ SET BACKGROUND MESSAGE HANDLER (must be outside registerRootComponent)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log("📩 Background message:", remoteMessage);
});

registerRootComponent(App);
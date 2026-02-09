import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync() {
  const { status } = await Notifications.getPermissionsAsync();
  let finalStatus = status;

  if (status !== "granted") {
    const res = await Notifications.requestPermissionsAsync();
    finalStatus = res.status;
  }

  if (finalStatus !== "granted") {
    alert("Permission denied");
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("🔥 EXPO PUSH TOKEN:", token);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("requests", {
      name: "Incoming Requests",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 500, 500],
      sound: "default",
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  return token;
}

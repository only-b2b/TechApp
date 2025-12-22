import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { API_BASE_URL } from "./config";

// Foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  }),
});

export async function registerForPushAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    throw new Error("Notification permission not granted");
  }

  // IMPORTANT: In development builds, this returns a valid Expo push token
  const projectId = (await Notifications.getExpoPushTokenAsync()).data;

  // Save to backend (userType='tech')
  await fetch(`${API_BASE_URL}/push/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userType: "tech", userId: null, expoToken: projectId }),
  });

  return projectId;
}

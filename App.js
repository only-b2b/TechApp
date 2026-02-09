import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect } from "react";
import { Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as Notifications from "expo-notifications";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import { registerForPushNotificationsAsync } from "./notifications";
import { API_BASE_URL } from "./config";

import OnboardingScreen from "./screens/OnboardingScreen";
import BasicDetailsScreen from "./screens/BasicDetailsScreen";
import CategoryDetailsScreen from "./screens/CategoryDetailsScreen";
import DocumentUploadScreen from "./screens/DocumentUploadScreen";
import ThankYouScreen from "./screens/ThankYouScreen";

import LeadsScreen from "./screens/LeadsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import RequestsScreen from "./screens/RequestsScreen";
import RequestDetailScreen from "./screens/RequestDetailScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* 🔔 Notification behavior */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function AppTabs() {
  useEffect(() => {
    // Register & save Expo push tokenz
    registerForPushNotificationsAsync().then(token => {
      if (!token) return;

      fetch(`${API_BASE_URL}/tech/save-expo-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    });

    // Foreground notification (Google-Pay style popup)
    const subscription =
      Notifications.addNotificationReceivedListener(notification => {
        Alert.alert(
          "Incoming Service Request",
          "Open Requests tab to accept or reject",
          [{ text: "OK" }]
        );
      });

    return () => subscription.remove();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#a0a4a8",
        tabBarStyle: {
          backgroundColor: "#f5b134",
          position: "absolute",
          bottom: 20,
          marginHorizontal: 20,
          borderRadius: 18,
          height: 70,
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Leads: "list-outline",
            Requests: "notifications-outline",
            Profile: "person-circle-outline",
          };
          return (
            <Ionicons name={icons[route.name]} size={26} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Leads" component={LeadsScreen} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function Router() {
  const { tech } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {tech ? (
        <>
          <Stack.Screen name="AppTabs" component={AppTabs} />
          <Stack.Screen
            name="RequestDetailScreen"
            component={RequestDetailScreen}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="BasicDetails" component={BasicDetailsScreen} />
          <Stack.Screen name="CategoryDetails" component={CategoryDetailsScreen} />
          <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
          <Stack.Screen name="ThankYou" component={ThankYouScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <Router />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}

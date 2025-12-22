// App.js
import "react-native-gesture-handler";
import "react-native-reanimated";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./auth/AuthContext";

import OnboardingScreen from "./screens/OnboardingScreen";
import BasicDetailsScreen from "./screens/BasicDetailsScreen";
import CategoryDetailsScreen from "./screens/CategoryDetailsScreen";
import DocumentUploadScreen from "./screens/DocumentUploadScreen";
import ThankYouScreen from "./screens/ThankYouScreen";

import LeadsScreen from "./screens/LeadsScreen";
import ProfileScreen from "./screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarShowLabel: true,
        tabBarActiveTintColor: "#22D3EE",
        tabBarInactiveTintColor: "#64748B",

        tabBarStyle: {
          backgroundColor: "#1E293B",
          position: "absolute",
          bottom: 20,
          marginHorizontal: 20,
          borderRadius: 18,
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 5,
        },

        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Leads: "list-outline",
            Profile: "person-circle-outline",
          };
          return (
            <Ionicons
              name={icons[route.name]}
              size={focused ? 30 : 26}
              color={color}
              style={{
                shadowColor: focused ? "#22D3EE" : "transparent",
                shadowOpacity: focused ? 0.8 : 0,
                shadowRadius: 8,
              }}
            />
          );
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: -4,
        },
      })}
    >
      <Tab.Screen
        name="Leads"
        component={LeadsScreen}
        options={{ title: "Leads" }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}


function Router() {
  const { tech } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {tech ? (
        <Stack.Screen name="AppTabs" component={AppTabs} />
      ) : (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="BasicDetails" component={BasicDetailsScreen} />
          <Stack.Screen
            name="CategoryDetails"
            component={CategoryDetailsScreen}
          />
          <Stack.Screen
            name="DocumentUpload"
            component={DocumentUploadScreen}
          />
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

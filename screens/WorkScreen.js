// screens/WorkScreen.js

import React from "react";
import { View, Text, StyleSheet, Platform, StatusBar } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PendingRequestsTab from "./tabs/PendingRequestsTab";
import AcceptedRequestsTab from "./tabs/AcceptedRequestsTab";

const TopTab = createMaterialTopTabNavigator();

export default function WorkScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Work</Text>
      </View>

      <TopTab.Navigator
        screenOptions={{
          tabBarStyle: styles.tabBar,
          tabBarIndicatorStyle: styles.tabIndicator,
          tabBarLabelStyle: styles.tabLabel,
          tabBarActiveTintColor: "#111827",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarPressColor: "rgba(0,0,0,0.05)",
        }}
      >
        <TopTab.Screen
          name="Requests"
          component={PendingRequestsTab}
          options={{ tabBarLabel: "New Requests" }}
        />
        <TopTab.Screen
          name="Accepted"
          component={AcceptedRequestsTab}
          options={{ tabBarLabel: "Active Jobs" }}
        />
      </TopTab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  tabBar: {
    backgroundColor: "#FFFFFF",
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabIndicator: {
    backgroundColor: "#111827",
    height: 3,
    borderRadius: 3,
  },
  tabLabel: {
    fontWeight: "700",
    fontSize: 14,
    textTransform: "none",
  },
});
import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { colors } from "../theme/colors";

import PendingRequestsTab from "./tabs/PendingRequestsTab";
import AcceptedRequestsTab from "./tabs/AcceptedRequestsTab";
import ScreenWrapper from "../components/ScreenWrapper";

const TopTab = createMaterialTopTabNavigator();

export default function WorkScreen() {
  return (
    <ScreenWrapper>
    <TopTab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.bg },
        tabBarIndicatorStyle: { backgroundColor: colors.primary, height: 3 },
        tabBarLabelStyle: { fontWeight: "800", textTransform: "none" },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <TopTab.Screen name="Requests" component={PendingRequestsTab} />
      <TopTab.Screen name="Accepted" component={AcceptedRequestsTab} />
    </TopTab.Navigator>
    </ScreenWrapper>
  );
}


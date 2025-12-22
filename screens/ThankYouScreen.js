// screens/ThankYouScreen.js
import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { useAuth } from "../auth/AuthContext";

export default function ThankYouScreen({ route }) {
  const { tech } = route.params || {};
  const { login } = useAuth();

  useEffect(() => {
    if (tech) {
      // Save technician in context → Router shows AppTabs
      login(tech);
    }
  }, [tech]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 28, marginBottom: 10 }}>🎉 Thank You!</Text>
      <Text>Your profile has been submitted.</Text>
      <Text>Opening home...</Text>
    </View>
  );
}

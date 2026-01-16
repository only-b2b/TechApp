import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { API_BASE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";

export default function RequestDetailScreen({ route, navigation }) {
  const { order } = route.params;
  const { tech } = useAuth(); // logged-in technician

  const acceptOrder = async () => {
    await fetch(`${API_BASE_URL}/orders/${order.id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technician_id: tech.id }),
    });

    navigation.goBack();
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Distance: {order.distance}</Text>
      <Text>Duration: {order.duration}</Text>
      <Text>Fare: ₹{order.price}</Text>

      <TouchableOpacity onPress={acceptOrder}>
        <Text style={{ marginTop: 20, color: "green" }}>
          Accept Ride
        </Text>
      </TouchableOpacity>
    </View>
  );
}

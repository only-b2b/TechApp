import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { API_BASE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";

export default function RequestDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const { tech } = useAuth();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/orders/${orderId}`)
      .then(res => res.json())
      .then(setOrder);
  }, []);

  const accept = async () => {
    await fetch(`${API_BASE_URL}/orders/${orderId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technician_id: tech.id }),
    });

    navigation.goBack();
  };

  useEffect(() => {
  if (!order || order.status !== "accepted") return;

  let subscription;

  (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      loc => {
        fetch(`${API_BASE_URL}/orders/${orderId}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            technician_id: tech.id,
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          }),
        });
      }
    );
  })();

  return () => subscription && subscription.remove();
}, [order]);


  const reject = async () => {
    await fetch(`${API_BASE_URL}/orders/${orderId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technician_id: tech.id }),
    });

    navigation.goBack();
  };

  if (!order) return null;

  
  return (
    <View style={styles.container}>
      <Text style={styles.price}>₹{order.price}</Text>
      <Text style={styles.meta}>{order.distance}</Text>
      <Text style={styles.meta}>{order.duration}</Text>

      <TouchableOpacity style={styles.accept} onPress={accept}>
        <Text style={styles.btnText}>Accept Request</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.reject} onPress={reject}>
        <Text style={styles.btnText}>Reject</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#0F172A" },
  price: { fontSize: 28, color: "#22D3EE", fontWeight: "800" },
  meta: { color: "#CBD5E1", marginTop: 6 },
  accept: {
    backgroundColor: "#22C55E",
    padding: 14,
    borderRadius: 12,
    marginTop: 30,
    alignItems: "center",
  },
  reject: {
    backgroundColor: "#EF4444",
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    alignItems: "center",
  },
  btnText: { color: "#022C22", fontWeight: "700", fontSize: 16 },
});

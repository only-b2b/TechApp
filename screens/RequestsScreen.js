import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { API_BASE_URL } from "../config";

const ORANGE = "#FF6B00";

// ✅ use SAME value as your backend `service_type`
const CATEGORY = "pickdrop"; // <-- change to "pickdrop" ONLY if DB has pickdrop

export default function RequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/orders/pending/list?category=${CATEGORY}`
      );

      // ✅ avoid JSON parse error if server returns HTML
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.log("Not JSON response:", text.slice(0, 80));
        return;
      }

      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Fetch requests error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ initial load + polling
  useEffect(() => {
    fetchRequests();

    const interval = setInterval(() => {
      fetchRequests();
    }, 4000); // every 4 sec

    return () => clearInterval(interval);
  }, []);

  // ✅ refresh whenever screen is opened/focused
  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  // ✅ pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text>Loading requests…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => item.id?.toString?.() ?? String(Math.random())}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("RequestDetailScreen", { order: item })
          }
        >
          <Text style={styles.price}>₹{item.price}</Text>
          <Text style={styles.meta}>
            {item.distance || "-"} • {item.duration || "-"}
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text>No new requests</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
  },
  price: {
    fontSize: 20,
    fontWeight: "900",
    color: ORANGE,
  },
  meta: {
    color: "#666",
    marginTop: 4,
  },
});

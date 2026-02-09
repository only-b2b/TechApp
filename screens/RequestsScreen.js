import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { API_BASE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";


export default function RequestsScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const { tech } = useAuth(); // ✅ ADD

  const fetchOrders = async () => {
    if (!tech) return;

    const res = await fetch(
      `${API_BASE_URL}/orders/pending/list?category=${tech.category}`
    );
    const data = await res.json();
    setOrders(data);
  };


  useEffect(() => {
    fetchOrders();
    const i = setInterval(fetchOrders, 5000);
    return () => clearInterval(i);
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("RequestDetailScreen", {
          orderId: item.id,
        })
      }
    >
      <Text style={styles.price}>₹{item.price}</Text>
      <Text style={styles.meta}>
        {item.distance} • {item.duration}
      </Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>NEW</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>New Requests</Text>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.empty}>No new requests</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", padding: 16 },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    position: "relative",
  },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: "#22D3EE",
  },
  meta: {
    color: "#CBD5E1",
    marginTop: 4,
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "#022C22",
    fontWeight: "700",
    fontSize: 12,
  },
  empty: {
    textAlign: "center",
    color: "#94A3B8",
    marginTop: 40,
  },
});

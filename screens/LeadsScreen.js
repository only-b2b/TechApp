import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { API_BASE_URL } from "../config";
import { useAuth } from "../auth/AuthContext";

export default function LeadsScreen() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const { tech } = useAuth();

  const fetchLeads = async () => {
    if (!tech?.id) return; // ✅ Add safety check

    try {
      const res = await fetch(
        `${API_BASE_URL}/orders/accepted/list?technician_id=${tech.id}`
      );
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.log("FETCH LEADS ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tech?.id) return; // ✅ Guard clause

    fetchLeads();
    const interval = setInterval(fetchLeads, 5000);
    return () => clearInterval(interval);
  }, [tech?.id]); // ✅ Add dependency

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#22D3EE" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Leads</Text>

      <FlatList
        data={leads}
        keyExtractor={(o) => o.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.price}>₹{item.price}</Text>
            <Text style={styles.meta}>
              {item.distance} • {item.duration}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No active leads</Text>
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
  empty: {
    textAlign: "center",
    color: "#94A3B8",
    marginTop: 40,
  },
});
// screens/LeadsScreen.js
import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function LeadsScreen() {
  const leads = []; // later fill from API

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Leads</Text>
        <Ionicons name="notifications-outline" size={26} color="#cbd5e1" />
      </View>

      {/* EMPTY STATE */}
      {leads.length === 0 && (
        <View style={styles.emptyContainer}>
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/4076/4076500.png",
            }}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyTitle}>No Leads Yet</Text>
          <Text style={styles.emptySubtitle}>
            Leads assigned to you will appear here. Keep checking!
          </Text>
        </View>
      )}

      {/* EXAMPLE CARD (you can remove once API added) */}
      {/* <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="person-circle-outline" size={40} color="#22D3EE" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>John Doe</Text>
            <Text style={styles.cardSubtitle}>Needs Car Wash</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.cardBtn}>
          <Text style={styles.cardBtnText}>View Lead</Text>
        </TouchableOpacity>
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 20,
  },

  // HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  headerTitle: {
    fontSize: 26,
    color: "#F1F5F9",
    fontWeight: "700",
  },

  // EMPTY STATE
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
    opacity: 0.9,
  },
  emptyTitle: {
    fontSize: 22,
    color: "#E2E8F0",
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },

  // LEAD CARD
  card: {
    backgroundColor: "#1E293B",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardTitle: {
    color: "#F1F5F9",
    fontSize: 18,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 2,
  },
  cardBtn: {
    marginTop: 12,
    backgroundColor: "#22D3EE",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  cardBtnText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 16,
  },
});

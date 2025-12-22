// screens/ProfileScreen.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const { tech, logout } = useAuth();

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <Text style={styles.header}>My Profile</Text>

      {/* TOP PROFILE CARD */}
      <View style={styles.profileCard}>
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{tech?.name || "Technician"}</Text>
        <Text style={styles.phone}>{tech?.phone}</Text>
      </View>

      {/* DETAILS SECTION */}
      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={22} color="#22D3EE" />
          <Text style={styles.infoText}>{tech?.email || "Not added"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="briefcase-outline" size={22} color="#22D3EE" />
          <Text style={styles.infoText}>{tech?.category}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={22} color="#22D3EE" />
          <Text style={styles.infoText}>{tech?.area}</Text>
        </View>

        {tech?.vehicle && (
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={22} color="#22D3EE" />
            <Text style={styles.infoText}>{tech.vehicle}</Text>
          </View>
        )}

        {tech?.expertise && (
          <View style={styles.infoRow}>
            <Ionicons name="sparkles-outline" size={22} color="#22D3EE" />
            <Text style={styles.infoText}>{tech.expertise}</Text>
          </View>
        )}

        {tech?.experience && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={22} color="#22D3EE" />
            <Text style={styles.infoText}>{tech.experience} years</Text>
          </View>
        )}
      </View>

      {/* LOGOUT BUTTON */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={22} color="#0F172A" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 20,
  },

  header: {
    fontSize: 26,
    fontWeight: "700",
    color: "#F1F5F9",
    textAlign: "center",
    marginBottom: 25,
  },

  profileCard: {
    alignItems: "center",
    marginBottom: 24,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#22D3EE",
  },

  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F1F5F9",
  },

  phone: {
    fontSize: 16,
    color: "#94A3B8",
    marginTop: 2,
  },

  infoBox: {
    backgroundColor: "#1E293B",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 30,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  infoText: {
    color: "#E2E8F0",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },

  logoutBtn: {
    flexDirection: "row",
    backgroundColor: "#22D3EE",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  logoutText: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 16,
    marginLeft: 6,
  },
});

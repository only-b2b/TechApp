// components/StatusBadge.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

const STATUS_CONFIG = {
  pending: { color: colors.warning, icon: "time", label: "NEW" },
  accepted: { color: colors.primary, icon: "checkmark", label: "ACCEPTED" },
  arrived: { color: colors.info, icon: "location", label: "ARRIVED" },
  in_progress: { color: colors.orange, icon: "water", label: "IN PROGRESS" },
  completed: { color: colors.success, icon: "checkmark-done", label: "COMPLETED" },
  cancelled: { color: colors.error, icon: "close", label: "CANCELLED" },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  return (
    <View style={[styles.badge, { backgroundColor: config.color }]}>
      <Ionicons name={config.icon} size={12} color="#fff" style={{ marginRight: 4 }} />
      <Text style={styles.text}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
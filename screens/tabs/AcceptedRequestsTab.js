// screens/tabs/AcceptedRequestsTab.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { API_BASE_URL } from "../../config";
import { useAuth } from "../../auth/AuthContext";

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  primary: "#00A86B",
  orange: "#FF6B00",
  cyan: "#22D3EE",
  text: "#F8FAFC",
  subtext: "#94A3B8",
  success: "#22C55E",
  warning: "#F59E0B",
  border: "#334155",
};

const STATUS_CONFIG = {
  accepted: { label: "NAVIGATE", color: COLORS.primary, icon: "navigate" },
  arrived: { label: "OTP PENDING", color: COLORS.warning, icon: "key" },
  in_progress: { label: "IN PROGRESS", color: COLORS.orange, icon: "water" },
};

export default function AcceptedRequestsTab({ navigation }) {
  const [leads, setLeads] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { tech } = useAuth();

  const fetchLeads = async () => {
    if (!tech) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/orders/accepted/list?technician_id=${tech.id}`
      );
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.log("Fetch error:", err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLeads();
    const i = setInterval(fetchLeads, 5000);
    return () => clearInterval(i);
  }, [tech]);

  const isCarWash = tech?.category === "carwash" || tech?.category === "car_wash";

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.accepted;
  };

  const handlePress = (item) => {
    if (isCarWash) {
      navigation.navigate("ActiveWashScreen", { orderId: item.id });
    } else {
      navigation.navigate("ActiveRideScreen", { orderId: item.id });
    }
  };

  const renderItem = ({ item }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handlePress(item)}
        activeOpacity={0.8}
      >
        {/* Status Badge */}
        <View style={[styles.badge, { backgroundColor: statusConfig.color }]}>
          <Icon name={statusConfig.icon} size={12} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.badgeText}>{statusConfig.label}</Text>
        </View>

        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: isCarWash ? COLORS.primary : COLORS.orange }]}>
            <Icon 
              name={isCarWash ? "water" : "car-sport"} 
              size={22} 
              color="#fff" 
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.clientName}>
              Client: {item.client_name || "Client"}
              </Text>

              <Text style={styles.techName}>
              Tech: {item.technician_name || "You"}
            </Text>
            <Text style={styles.price}>₹{item.price}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="navigate-outline" size={16} color={COLORS.subtext} />
            <Text style={styles.statText}>{item.distance || "—"}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="time-outline" size={16} color={COLORS.subtext} />
            <Text style={styles.statText}>{item.duration || "—"}</Text>
          </View>
          {item.vehicle && (
            <View style={styles.statItem}>
              <Icon name="car-outline" size={16} color={COLORS.subtext} />
              <Text style={styles.statText}>{item.vehicle}</Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: statusConfig.color }]}
          onPress={() => handlePress(item)}
        >
          <Text style={styles.actionText}>
            {item.status === "accepted" && "Start Navigation"}
            {item.status === "arrived" && "Enter OTP"}
            {item.status === "in_progress" && "Continue Wash"}
          </Text>
          <Icon name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Active Jobs</Text>
        {leads.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: COLORS.success }]}>
            <Text style={styles.countText}>{leads.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={leads}
        keyExtractor={(o) => o.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="checkmark-done-circle-outline" size={48} color={COLORS.subtext} />
            <Text style={styles.emptyText}>No active jobs</Text>
            <Text style={styles.emptySubtext}>Accept requests to get started</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },
  countBadge: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  techName: {
    fontSize: 13,
    color: COLORS.subtext,
    marginTop: 2,
  },
  countText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.cyan,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  statText: {
    color: COLORS.text,
    marginLeft: 6,
    fontSize: 13,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
    marginRight: 8,
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
  },
  emptySubtext: {
    color: COLORS.subtext,
    marginTop: 4,
  },
});

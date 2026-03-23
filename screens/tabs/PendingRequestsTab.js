// screens/tabs/PendingRequestsTab.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";import { API_BASE_URL } from "../../config";
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
  border: "#334155",
};

export default function PendingRequestsTab({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { tech } = useAuth();

  const fetchOrders = async () => {
    if (!tech) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/orders/pending/list?category=${tech.category}&technician_id=${tech.id}`
      );
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.log("Fetch error:", err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchOrders();
    const i = setInterval(fetchOrders, 5000);
    return () => clearInterval(i);
  }, [tech]);

  const isCarWash = tech?.category === "carwash" || tech?.category === "car_wash";

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("RequestDetailScreen", { orderId: item.id })}
      activeOpacity={0.8}
    >
      {/* Badge */}
      <View style={[styles.badge, { backgroundColor: isCarWash ? COLORS.primary : COLORS.orange }]}>
        <Text style={styles.badgeText}>NEW</Text>
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
          <Text style={styles.price}>₹{item.price}</Text>
          <Text style={styles.meta}>{item.distance} • {item.duration}</Text>
        </View>
      </View>

      {/* Vehicle Info (Car Wash) */}
      {isCarWash && item.vehicle && (
        <View style={styles.infoRow}>
          <Icon name="car-outline" size={16} color={COLORS.subtext} />
          <Text style={styles.infoText}>{item.vehicle}</Text>
        </View>
      )}

      {/* Location */}
      <View style={styles.locationContainer}>
        <View style={styles.locationRow}>
          <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.pickup_address || "Client location"}
          </Text>
        </View>
        
        {!isCarWash && item.drop_address && (
          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: COLORS.orange }]} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.drop_address}
            </Text>
          </View>
        )}
      </View>

      {/* Accept Arrow */}
      <View style={styles.arrowContainer}>
        <Text style={styles.viewText}>View Details</Text>
        <Icon name="chevron-forward" size={18} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New Requests</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{orders.length}</Text>
        </View>
      </View>

      <FlatList
        data={orders}
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
            <Icon name="hourglass-outline" size={48} color={COLORS.subtext} />
            <Text style={styles.emptyText}>No new requests</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
  price: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.cyan,
  },
  meta: {
    color: COLORS.subtext,
    fontSize: 13,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  infoText: {
    color: COLORS.text,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  locationText: {
    color: COLORS.text,
    fontSize: 13,
    flex: 1,
  },
  arrowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewText: {
    color: COLORS.primary,
    fontWeight: "600",
    marginRight: 4,
    fontSize: 13,
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

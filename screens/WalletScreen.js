import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { colors } from "../theme/colors";
import ScreenWrapper from "../components/ScreenWrapper";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../config";
import Icon from "react-native-vector-icons/Ionicons";import { LineChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

export default function WalletScreen() {
  const { tech } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [graphData, setGraphData] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (tech?.id) {
      fetchData();
    }
  }, [tech?.id]);

  useEffect(() => {
    if (tech?.id && selectedPeriod) {
      fetchGraphData();
    }
  }, [selectedPeriod, tech?.id]);

  const fetchData = async () => {
    if (!tech?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch overview
      const overviewRes = await fetch(
        `${API_BASE_URL}/earnings/overview?technician_id=${tech.id}`
      );
      
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        console.log("Overview data:", overviewData);
        setOverview(overviewData);
      }
      
      // Fetch history
      const historyRes = await fetch(
        `${API_BASE_URL}/earnings/history?technician_id=${tech.id}&limit=20`
      );
      
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        console.log("History data:", historyData);
        setHistory(historyData);
      }
      
    } catch (err) {
      console.error("Fetch earnings error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGraphData = async () => {
    if (!tech?.id) return;
    
    try {
      // ✅ Map period names to correct API endpoints
      const periodMap = {
        week: "weekly",
        monthly: "monthly",
        yearly: "yearly",
      };
      
      const endpoint = periodMap[selectedPeriod] || "weekly";
      
      const res = await fetch(
        `${API_BASE_URL}/earnings/${endpoint}?technician_id=${tech.id}`
      );
      
      if (res.ok) {
        const data = await res.json();
        console.log("Graph data:", data);
        setGraphData(Array.isArray(data) ? data : []);
      } else {
        console.error("Graph API error:", res.status);
        setGraphData([]);
      }
    } catch (err) {
      console.error("Fetch graph error:", err.message);
      setGraphData([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    await fetchGraphData();
    setRefreshing(false);
  };

  // ✅ Safe number formatting
  const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num) || value === null || value === undefined) {
      return "0";
    }
    return num.toFixed(0);
  };

  const formatCurrencyDecimal = (value) => {
    const num = parseFloat(value);
    if (isNaN(num) || value === null || value === undefined) {
      return "0.00";
    }
    return num.toFixed(2);
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: colors.primary,
    },
  };

  const prepareChartData = () => {
    if (!graphData || graphData.length === 0) {
      return {
        labels: ["No Data"],
        datasets: [{ data: [0] }],
      };
    }

    let labels = [];
    let data = [];

    if (selectedPeriod === "week") {
      labels = graphData.map((d) => (d.day_name || "").substring(0, 3));
      data = graphData.map((d) => parseFloat(d.earnings) || 0);
    } else if (selectedPeriod === "monthly") {
      labels = graphData.map((d) => String(d.day || ""));
      data = graphData.map((d) => parseFloat(d.earnings) || 0);
    } else if (selectedPeriod === "yearly") {
      labels = graphData.map((d) => (d.month_name || "").substring(0, 3));
      data = graphData.map((d) => parseFloat(d.earnings) || 0);
    }

    // ✅ Ensure at least one data point
    if (data.length === 0 || data.every((d) => d === 0)) {
      return {
        labels: ["No Data"],
        datasets: [{ data: [0] }],
      };
    }

    return {
      labels,
      datasets: [{ data }],
    };
  };

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Wallet</Text>

        {/* Available Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            ₹{formatCurrencyDecimal(overview?.availableBalance)}
          </Text>
          <TouchableOpacity style={styles.withdrawButton}>
            <Icon name="wallet-outline" size={20} color="#fff" />
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="today-outline" size={24} color={colors.primary} />
            <Text style={styles.statValue}>
              ₹{formatCurrency(overview?.today?.earnings)}
            </Text>
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statSubLabel}>
              {overview?.today?.rides || 0} rides
            </Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="calendar-outline" size={24} color="#3B82F6" />
            <Text style={styles.statValue}>
              ₹{formatCurrency(overview?.week?.earnings)}
            </Text>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statSubLabel}>
              {overview?.week?.rides || 0} rides
            </Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="calendar" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>
              ₹{formatCurrency(overview?.month?.earnings)}
            </Text>
            <Text style={styles.statLabel}>This Month</Text>
            <Text style={styles.statSubLabel}>
              {overview?.month?.rides || 0} rides
            </Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="trophy" size={24} color="#EF4444" />
            <Text style={styles.statValue}>
              ₹{formatCurrency(overview?.year?.earnings)}
            </Text>
            <Text style={styles.statLabel}>This Year</Text>
            <Text style={styles.statSubLabel}>
              {overview?.year?.rides || 0} rides
            </Text>
          </View>
        </View>

        {/* Lifetime Stats */}
        <View style={styles.lifetimeCard}>
          <View style={styles.lifetimeRow}>
            <View style={styles.lifetimeItem}>
              <Text style={styles.lifetimeValue}>
                {overview?.lifetime?.rides || 0}
              </Text>
              <Text style={styles.lifetimeLabel}>Total Rides</Text>
            </View>
            <View style={styles.lifetimeDivider} />
            <View style={styles.lifetimeItem}>
              <Text style={styles.lifetimeValue}>
                ₹{formatCurrency(overview?.lifetime?.earnings)}
              </Text>
              <Text style={styles.lifetimeLabel}>Total Earnings</Text>
            </View>
          </View>
        </View>

        {/* Graph Section */}
        <View style={styles.graphCard}>
          <Text style={styles.sectionTitle}>Earnings Overview</Text>

          {/* Period Selector */}
          <View style={styles.periodSelector}>
            {["week", "monthly", "yearly"].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period === "week"
                    ? "Week"
                    : period === "monthly"
                    ? "Month"
                    : "Year"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chart */}
          {graphData && graphData.length > 0 ? (
            <LineChart
              data={prepareChartData()}
              width={width - 60}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              fromZero
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Icon name="analytics-outline" size={40} color={colors.muted} />
              <Text style={styles.noDataText}>No earnings data yet</Text>
              <Text style={styles.noDataSubText}>
                Complete rides to see your earnings
              </Text>
            </View>
          )}
        </View>

        {/* Recent Rides */}
        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>Recent Rides</Text>
          
          {history.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Icon name="receipt-outline" size={40} color={colors.muted} />
              <Text style={styles.noDataText}>No completed rides yet</Text>
            </View>
          ) : (
            history.map((ride) => (
              <View key={ride.id} style={styles.historyItem}>
                <View style={styles.historyIconContainer}>
                  <Icon name="car-sport" size={20} color={colors.primary} />
                </View>
                
                <View style={styles.historyDetails}>
                  <Text style={styles.historyClient}>
                    {ride.client_name || "Unknown"}
                  </Text>
                  <Text style={styles.historyDate}>
                    {ride.completed_at
                      ? new Date(ride.completed_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Pending"}
                  </Text>
                  {ride.pickup_address && (
                    <Text style={styles.historyRoute} numberOfLines={1}>
                      {ride.pickup_address.substring(0, 30)}...
                    </Text>
                  )}
                </View>
                
                <View style={styles.historyEarnings}>
                  <Text style={[
                    styles.historyEarningsAmount,
                    { color: ride.technician_earnings ? colors.primary : colors.muted }
                  ]}>
                    {ride.technician_earnings
                      ? `+₹${formatCurrency(ride.technician_earnings)}`
                      : `₹${formatCurrency(ride.price)}`}
                  </Text>
                  <Text style={styles.historyEarningsLabel}>
                    {ride.technician_earnings ? "earned" : "fare"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  balanceAmount: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    marginTop: 8,
  },
  withdrawButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    alignSelf: "flex-start",
  },
  withdrawButtonText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  statSubLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  lifetimeCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lifetimeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  lifetimeItem: {
    flex: 1,
    alignItems: "center",
  },
  lifetimeDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  lifetimeValue: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.text,
  },
  lifetimeLabel: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: 4,
  },
  graphCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    color: colors.subtext,
    fontWeight: "600",
    fontSize: 13,
  },
  periodButtonTextActive: {
    color: "#fff",
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8,
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noDataText: {
    color: colors.muted,
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  noDataSubText: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 12,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyClient: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  historyDate: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
  },
  historyRoute: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  historyEarnings: {
    alignItems: "flex-end",
  },
  historyEarningsAmount: {
    fontSize: 16,
    fontWeight: "900",
  },
  historyEarningsLabel: {
    fontSize: 10,
    color: colors.muted,
  },
});

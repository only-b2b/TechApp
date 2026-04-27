// screens/WalletScreen.js

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { LineChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../config";

const { width } = Dimensions.get("window");

const COLORS = {
  primary:     "#000000",
  white:       "#FFFFFF",
  dark:        "#111827",
  gray:        "#6B7280",
  lightGray:   "#F3F4F6",
  border:      "#E5E7EB",
  bg:          "#F9FAFB",
  success:     "#10B981",
  successLight:"#D1FAE5",
  error:       "#DC2626",
  errorLight:  "#FEE2E2",
  warning:     "#F59E0B",
  warningLight:"#FEF3C7",
  blue:        "#3B82F6",
  blueLight:   "#DBEAFE",
  orange:      "#F59E0B",
  orangeLight: "rgba(245, 158, 11, 0.1)",
  pink:        "#EC4899",
  pinkLight:   "#FCE7F3",
  indigo:      "#6366F1",
  indigoLight: "#EEF2FF",
};

export default function WalletScreen() {
  const { tech }  = useAuth();
  const insets    = useSafeAreaInsets();

  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [overview,       setOverview]       = useState(null);
  const [walletData,     setWalletData]     = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [graphData,      setGraphData]      = useState([]);
  const [history,        setHistory]        = useState([]);
  const [showBreakdown,  setShowBreakdown]  = useState(false);
  const [selectedRide,   setSelectedRide]   = useState(null);
  const [showDuesDetail, setShowDuesDetail] = useState(false);
  const [showDuesModal,  setShowDuesModal]  = useState(false);

  useEffect(() => { if (tech?.id) fetchData(); }, [tech?.id]);
  useEffect(() => { if (tech?.id && selectedPeriod) fetchGraphData(); }, [selectedPeriod, tech?.id]);

  const fetchData = async () => {
    if (!tech?.id) return;
    try {
      setLoading(true);
      const [overviewRes, historyRes, walletRes] = await Promise.all([
        fetch(`${API_BASE_URL}/earnings/overview?technician_id=${tech.id}`),
        fetch(`${API_BASE_URL}/earnings/history?technician_id=${tech.id}&limit=20`),
        fetch(`${API_BASE_URL}/earnings/wallet?technician_id=${tech.id}`).catch(() => null),
      ]);
      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (historyRes.ok) {
        const d = await historyRes.json();
        setHistory(d.rides || d || []);
      }
      if (walletRes && walletRes.ok) setWalletData(await walletRes.json());
    } catch (err) {
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGraphData = async () => {
    if (!tech?.id) return;
    try {
      const map = { week: "weekly", month: "monthly", year: "yearly" };
      const res = await fetch(`${API_BASE_URL}/earnings/${map[selectedPeriod]}?technician_id=${tech.id}`);
      if (res.ok) {
        const data = await res.json();
        setGraphData(Array.isArray(data) ? data : []);
      }
    } catch { setGraphData([]); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchGraphData()]);
    setRefreshing(false);
  }, [tech?.id, selectedPeriod]);

  const fmt = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? "0" : n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };
  const fmtDec = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? "0.00" : n.toFixed(2);
  };

  const chartConfig = {
    backgroundColor:        COLORS.white,
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo:   COLORS.white,
    decimalPlaces:          0,
    color:      (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
    labelColor: () => COLORS.gray,
    style: { borderRadius: 16 },
    propsForDots: { r: "5", strokeWidth: "2", stroke: COLORS.dark },
    propsForBackgroundLines: { stroke: COLORS.border, strokeDasharray: "" },
  };

  const prepareChartData = () => {
    if (!graphData || graphData.length === 0)
      return { labels: ["No Data"], datasets: [{ data: [0] }] };

    let labels = [], data = [];
    if (selectedPeriod === "week") {
      labels = graphData.map((d) => (d.day_name || "").trim().substring(0, 3));
      data   = graphData.map((d) => parseFloat(d.earnings) || 0);
    } else if (selectedPeriod === "month") {
      labels = graphData.map((d) => String(d.day_label || d.day || ""));
      data   = graphData.map((d) => parseFloat(d.earnings) || 0);
      labels = labels.map((l, i) => (i % 5 === 0 ? l : ""));
    } else if (selectedPeriod === "year") {
      labels = graphData.map((d) => (d.month_name || "").trim().substring(0, 3));
      data   = graphData.map((d) => parseFloat(d.earnings) || 0);
    }

    if (!data.length || data.every((d) => d === 0))
      return { labels: ["No Data"], datasets: [{ data: [0] }] };

    return { labels, datasets: [{ data }] };
  };

  const getPeriodStats = () => {
    if (!overview) return { earnings: 0, rides: 0, totalFare: 0, commission: 0 };
    switch (selectedPeriod) {
      case "week":  return overview.week;
      case "month": return overview.month;
      case "year":  return overview.year || overview.lifetime;
      default:      return overview.week;
    }
  };

  const getWallet = () => {
    const w = walletData?.wallet || overview?.wallet || {};
    return {
      onlineBalance:      parseFloat(w.onlineBalance)                        || 0,
      cashBalance:        parseFloat(w.cashBalance)                          || 0,
      platformDues:       parseFloat(w.platformDues)                         || 0,
      withdrawable:       parseFloat(w.withdrawableBalance || w.withdrawable) || 0,
      totalWithdrawn:     parseFloat(w.totalWithdrawn)                       || 0,
      totalCashCollected: parseFloat(w.totalCashCollected)                   || 0,
      totalOnlineEarned:  parseFloat(w.totalOnlineEarned)                    || 0,
      totalCommissionPaid:parseFloat(w.totalCommissionPaid)                  || 0,
      totalEarned:        parseFloat(w.totalEarned)                          || 0,
    };
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.dark} />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  const periodStats  = getPeriodStats();
  const wallet       = getWallet();
  const pendingDues  = walletData?.pendingDues    || [];
  const pendingTotal = walletData?.pendingDuesTotal || wallet.platformDues;

  // ── How much driver needs to pay to clear all dues ────
  // If online balance >= dues → will auto-clear on next online ride
  // If online balance < dues  → needs more online rides
  const canAutoClear   = wallet.onlineBalance >= wallet.platformDues;
  const shortfallAmount= Math.max(0, wallet.platformDues - wallet.onlineBalance);

  // ====================================================
  // PLATFORM DUES MODAL
  // ====================================================
  const DuesModal = () => (
    <Modal
      visible={showDuesModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDuesModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.duesModalIconBox}>
                <Ionicons name="alert-circle" size={22} color={COLORS.error} />
              </View>
              <Text style={styles.modalTitle}>Platform Dues</Text>
            </View>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowDuesModal(false)}
            >
              <Ionicons name="close" size={22} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {/* BIG TOTAL DUES AMOUNT */}
          <View style={styles.duesModalTotalBox}>
            <Text style={styles.duesModalTotalLabel}>Total Amount You Owe</Text>
            <Text style={styles.duesModalTotalAmount}>₹{fmtDec(wallet.platformDues)}</Text>
            <Text style={styles.duesModalTotalSub}>
              Platform commission from {pendingDues.length} cash ride(s)
            </Text>
          </View>

          {/* Wallet formula */}
          <View style={styles.duesModalFormula}>
            <Text style={styles.duesModalFormulaTitle}>Your Wallet Calculation</Text>
            <View style={styles.duesModalFormulaRow}>
              <View style={styles.duesModalFormulaLeft}>
                <View style={[styles.duesModalFmlDot, { backgroundColor: COLORS.blue }]} />
                <Text style={styles.duesModalFormulaLabel}>Online Balance</Text>
              </View>
              <Text style={styles.duesModalFormulaValue}>₹{fmtDec(wallet.onlineBalance)}</Text>
            </View>
            <View style={styles.duesModalFormulaRow}>
              <View style={styles.duesModalFormulaLeft}>
                <View style={[styles.duesModalFmlDot, { backgroundColor: COLORS.error }]} />
                <Text style={[styles.duesModalFormulaLabel, { color: COLORS.error }]}>
                  − Platform Dues (you owe)
                </Text>
              </View>
              <Text style={[styles.duesModalFormulaValue, { color: COLORS.error }]}>
                −₹{fmtDec(wallet.platformDues)}
              </Text>
            </View>
            <View style={styles.duesModalFormulaDivider} />
            <View style={styles.duesModalFormulaRow}>
              <View style={styles.duesModalFormulaLeft}>
                <View style={[styles.duesModalFmlDot, { backgroundColor: COLORS.success }]} />
                <Text style={[styles.duesModalFormulaLabel, { fontWeight: "700", color: COLORS.dark }]}>
                  = Withdrawable
                </Text>
              </View>
              <Text style={[styles.duesModalFormulaValue, { color: COLORS.success, fontSize: 18, fontWeight: "800" }]}>
                ₹{fmtDec(wallet.withdrawable)}
              </Text>
            </View>
          </View>

          {/* Auto-clear status */}
          <View style={[
            styles.duesModalClearBox,
            { backgroundColor: canAutoClear ? COLORS.successLight : COLORS.warningLight,
              borderColor: canAutoClear ? "#A7F3D0" : "#FDE68A" }
          ]}>
            <Ionicons
              name={canAutoClear ? "checkmark-circle" : "time-outline"}
              size={20}
              color={canAutoClear ? COLORS.success : COLORS.warning}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              {canAutoClear ? (
                <>
                  <Text style={[styles.duesModalClearTitle, { color: COLORS.success }]}>
                    Will auto-clear on next online ride ✓
                  </Text>
                  <Text style={[styles.duesModalClearSub, { color: "#065F46" }]}>
                    Your online balance (₹{fmtDec(wallet.onlineBalance)}) covers the full dues
                    (₹{fmtDec(wallet.platformDues)}). It will be deducted automatically.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.duesModalClearTitle, { color: COLORS.warning }]}>
                    Need ₹{fmtDec(shortfallAmount)} more from online rides
                  </Text>
                  <Text style={[styles.duesModalClearSub, { color: "#92400E" }]}>
                    Your online balance (₹{fmtDec(wallet.onlineBalance)}) is less than dues
                    (₹{fmtDec(wallet.platformDues)}). Complete more online rides to clear dues.
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Individual pending rides */}
          {pendingDues.length > 0 && (
            <View style={styles.duesModalRidesList}>
              <Text style={styles.duesModalRidesTitle}>
                Breakdown by ride ({pendingDues.length} rides):
              </Text>
              {pendingDues.map((d, i) => (
                <View key={i} style={styles.duesModalRideItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.duesModalRideOrder}>Order #{d.order_id}</Text>
                    <Text style={styles.duesModalRideDate}>
                      {new Date(d.ride_date).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.duesModalRideAmount}>
                      ₹{fmtDec(d.dues_amount)}
                    </Text>
                    <Text style={styles.duesModalRideStatus}>Pending</Text>
                  </View>
                </View>
              ))}

              {/* Total row */}
              <View style={styles.duesModalRidesTotal}>
                <Text style={styles.duesModalRidesTotalLabel}>Total Dues</Text>
                <Text style={styles.duesModalRidesTotalAmount}>₹{fmtDec(wallet.platformDues)}</Text>
              </View>
            </View>
          )}

          {/* How it clears */}
          <View style={styles.duesModalHowBox}>
            <Text style={styles.duesModalHowTitle}>How dues get auto-cleared:</Text>
            {[
              { n: "1", text: "You complete a cash ride → collect full fare from customer" },
              { n: "2", text: "Platform commission (e.g. 20%) is added to your dues" },
              { n: "3", text: "You complete an online ride → dues auto-deducted first" },
              { n: "4", text: "Remaining online earning credited to your wallet" },
            ].map((s, i) => (
              <View key={i} style={styles.duesModalHowStep}>
                <View style={styles.duesModalHowNum}>
                  <Text style={styles.duesModalHowNumText}>{s.n}</Text>
                </View>
                <Text style={styles.duesModalHowText}>{s.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.modalBtn}
            onPress={() => setShowDuesModal(false)}
          >
            <Text style={styles.modalBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Dues Summary Card (shown in scroll) ────────────────
  const DuesCard = () => {
    if (wallet.platformDues <= 0 && pendingDues.length === 0) return null;

    return (
      <TouchableOpacity
        style={styles.duesCard}
        onPress={() => setShowDuesModal(true)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.duesCardHeader}>
          <View style={styles.duesCardLeft}>
            <View style={styles.duesIconBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.duesCardTitle}>Platform Dues</Text>
              <Text style={styles.duesCardSub}>
                {pendingDues.length} cash ride(s) • Tap to see details
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.duesCardTotal}>₹{fmtDec(wallet.platformDues)}</Text>
            <Text style={styles.duesCardTotalLabel}>you owe</Text>
          </View>
        </View>

        {/* Formula summary */}
        <View style={styles.duesFormula}>
          <View style={styles.duesFormulaRow}>
            <Text style={styles.duesFormulaLabel}>Online Balance</Text>
            <Text style={styles.duesFormulaValue}>₹{fmt(wallet.onlineBalance)}</Text>
          </View>
          <View style={styles.duesFormulaRow}>
            <Text style={[styles.duesFormulaLabel, { color: COLORS.error }]}>
              − Dues (you owe platform)
            </Text>
            <Text style={[styles.duesFormulaValue, { color: COLORS.error }]}>
              −₹{fmt(wallet.platformDues)}
            </Text>
          </View>
          <View style={[styles.duesFormulaRow, styles.duesFormulaTotalRow]}>
            <Text style={styles.duesFormulaTotalLabel}>= Withdrawable</Text>
            <Text style={styles.duesFormulaTotalValue}>₹{fmt(wallet.withdrawable)}</Text>
          </View>
        </View>

        {/* Auto-clear status pill */}
        <View style={[
          styles.duesClearPill,
          { backgroundColor: canAutoClear ? COLORS.successLight : COLORS.warningLight }
        ]}>
          <Ionicons
            name={canAutoClear ? "checkmark-circle" : "time-outline"}
            size={14}
            color={canAutoClear ? COLORS.success : COLORS.warning}
          />
          <Text style={[
            styles.duesClearPillText,
            { color: canAutoClear ? COLORS.success : COLORS.warning }
          ]}>
            {canAutoClear
              ? "Will auto-clear on next online ride"
              : `Need ₹${fmt(shortfallAmount)} more from online rides to clear`}
          </Text>
        </View>

        {/* Pending rides list */}
        {pendingDues.length > 0 && (
          <View style={styles.duesList}>
            <TouchableOpacity
              style={styles.duesListToggle}
              onPress={() => setShowDuesDetail((p) => !p)}
            >
              <Text style={styles.duesListToggleText}>
                {showDuesDetail ? "Hide" : "Show"} {pendingDues.length} unpaid ride(s)
              </Text>
              <Ionicons
                name={showDuesDetail ? "chevron-up" : "chevron-down"}
                size={14}
                color={COLORS.error}
              />
            </TouchableOpacity>

            {showDuesDetail && (
              <>
                {pendingDues.map((d, i) => (
                  <View key={i} style={styles.duesListItem}>
                    <View style={styles.duesListItemLeft}>
                      <Ionicons name="cash-outline" size={14} color={COLORS.orange} />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.duesListOrderId}>Order #{d.order_id}</Text>
                        <Text style={styles.duesListDate}>
                          {new Date(d.ride_date).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.duesListAmount}>₹{fmtDec(d.dues_amount)}</Text>
                  </View>
                ))}
                {/* Total in list */}
                <View style={styles.duesListTotalRow}>
                  <Text style={styles.duesListTotalLabel}>Total Dues</Text>
                  <Text style={styles.duesListTotalAmount}>₹{fmtDec(wallet.platformDues)}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Tap hint */}
        <View style={styles.duesNote}>
          <Ionicons name="information-circle-outline" size={13} color={COLORS.gray} />
          <Text style={styles.duesNoteText}>
            Dues auto-deducted when you complete an online payment ride.
            Tap this card for full details.
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Settlement flow explanation ─────────────────────────
  const SettlementInfoCard = () => {
    if (wallet.platformDues <= 0) return null;
    return (
      <View style={styles.settlementCard}>
        <View style={styles.settlementHeader}>
          <Ionicons name="swap-horizontal" size={18} color={COLORS.blue} />
          <Text style={styles.settlementTitle}>How Auto-Settlement Works</Text>
        </View>
        {[
          { dot: COLORS.orange,  text: "Cash ride → you collect full fare from customer" },
          { dot: COLORS.error,   text: "Platform commission added to your dues" },
          { dot: COLORS.blue,    text: "Next online ride → dues auto-deducted from your earning" },
          { dot: COLORS.success, text: "Remaining credited to wallet = Withdrawable ✓" },
        ].map((step, i) => (
          <View key={i} style={styles.settlementStep}>
            <View style={[styles.settlementDot, { backgroundColor: step.dot }]} />
            <Text style={styles.settlementStepText}>{step.text}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity style={styles.historyBtn}>
          <Ionicons name="time-outline" size={22} color={COLORS.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing} onRefresh={onRefresh}
            colors={[COLORS.dark]} tintColor={COLORS.dark}
          />
        }
      >
        {/* ====== BALANCE CARD ====== */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={["#000000", "#94a3b9"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.balanceGradient}
          >
            <View style={styles.balanceTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceLabel}>Withdrawable Balance</Text>
                <Text style={styles.balanceAmount}>₹{fmtDec(wallet.withdrawable)}</Text>
                {wallet.platformDues > 0 && (
                  <Text style={styles.balanceDuesHint}>
                    ₹{fmt(wallet.onlineBalance)} online − ₹{fmt(wallet.platformDues)} dues
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.withdrawBtn}>
                <Ionicons name="arrow-up" size={16} color={COLORS.dark} />
                <Text style={styles.withdrawText}>Withdraw</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.balanceStats}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Online Balance</Text>
                <Text style={styles.balanceStatValue}>₹{fmt(wallet.onlineBalance)}</Text>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Platform Dues</Text>
                <Text style={[
                  styles.balanceStatValue,
                  wallet.platformDues > 0 && { color: "#FCA5A5" },
                ]}>
                  ₹{fmt(wallet.platformDues)}
                </Text>
                {wallet.platformDues > 0 && (
                  <Text style={styles.balanceDuesOwedLabel}>you owe</Text>
                )}
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Withdrawn</Text>
                <Text style={styles.balanceStatValue}>₹{fmt(wallet.totalWithdrawn)}</Text>
              </View>
            </View>

            {wallet.platformDues > 0 && (
              <TouchableOpacity
                style={styles.duesWarning}
                onPress={() => setShowDuesModal(true)}
              >
                <Ionicons name="alert-circle" size={16} color="#FCD34D" />
                <Text style={styles.duesWarningText}>
                  You owe ₹{fmt(wallet.platformDues)} to platform from {pendingDues.length} cash ride(s).
                  Tap to see details →
                </Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* ====== DUES DETAIL CARD ====== */}
        <DuesCard />

        {/* ====== SETTLEMENT INFO ====== */}
        <SettlementInfoCard />

        {/* ====== CASH vs ONLINE BREAKDOWN ====== */}
        <View style={styles.cashOnlineCard}>
          <Text style={styles.sectionTitle}>Payment Breakdown</Text>
          <View style={styles.cashOnlineRow}>
            <View style={[styles.cashOnlineItem, { backgroundColor: COLORS.orangeLight }]}>
              <View style={styles.cashOnlineHeader}>
                <Ionicons name="cash-outline" size={20} color={COLORS.orange} />
                <Text style={[styles.cashOnlineLabel, { color: COLORS.orange }]}>Cash</Text>
              </View>
              <Text style={styles.cashOnlineValue}>₹{fmt(wallet.totalCashCollected)}</Text>
              <Text style={styles.cashOnlineSub}>{overview?.lifetime?.cashRides || 0} rides</Text>
            </View>

            <View style={[styles.cashOnlineItem, { backgroundColor: COLORS.blueLight }]}>
              <View style={styles.cashOnlineHeader}>
                <Ionicons name="phone-portrait-outline" size={20} color={COLORS.blue} />
                <Text style={[styles.cashOnlineLabel, { color: COLORS.blue }]}>Online</Text>
              </View>
              <Text style={styles.cashOnlineValue}>₹{fmt(wallet.totalOnlineEarned)}</Text>
              <Text style={styles.cashOnlineSub}>{overview?.lifetime?.onlineRides || 0} rides</Text>
            </View>
          </View>
        </View>

        {/* ====== QUICK STATS ====== */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            {[
              { icon: "today-outline",    color: COLORS.success, bg: COLORS.successLight, value: overview?.today?.earnings,    label: "Today",      sub: `${overview?.today?.rides || 0} rides` },
              { icon: "calendar-outline", color: COLORS.blue,    bg: COLORS.blueLight,    value: overview?.week?.earnings,     label: "This Week",  sub: `${overview?.week?.rides || 0} rides` },
              { icon: "calendar",         color: COLORS.warning, bg: COLORS.warningLight, value: overview?.month?.earnings,    label: "This Month", sub: `${overview?.month?.rides || 0} rides` },
              { icon: "trophy-outline",   color: COLORS.pink,    bg: COLORS.pinkLight,    value: overview?.lifetime?.earnings, label: "Lifetime",   sub: `${overview?.lifetime?.rides || 0} rides` },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon} size={20} color={s.color} />
                </View>
                <Text style={styles.statValue}>₹{fmt(s.value)}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statSub}>{s.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ====== LIFETIME STATS ====== */}
        <View style={styles.lifetimeCard}>
          <View style={styles.lifetimeItem}>
            <View style={[styles.lifetimeIcon, { backgroundColor: COLORS.lightGray }]}>
              <Ionicons name="car-sport" size={22} color={COLORS.dark} />
            </View>
            <Text style={styles.lifetimeValue}>{overview?.lifetime?.rides || 0}</Text>
            <Text style={styles.lifetimeLabel}>Total Rides</Text>
          </View>
          <View style={styles.lifetimeDivider} />
          <View style={styles.lifetimeItem}>
            <View style={[styles.lifetimeIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="cash-outline" size={22} color={COLORS.success} />
            </View>
            <Text style={styles.lifetimeValue}>₹{fmt(overview?.lifetime?.earnings)}</Text>
            <Text style={styles.lifetimeLabel}>Total Earnings</Text>
          </View>
          <View style={styles.lifetimeDivider} />
          <View style={styles.lifetimeItem}>
            <View style={[styles.lifetimeIcon, { backgroundColor: COLORS.blueLight }]}>
              <Ionicons name="analytics-outline" size={22} color={COLORS.blue} />
            </View>
            <Text style={styles.lifetimeValue}>₹{fmt(overview?.averages?.perRide)}</Text>
            <Text style={styles.lifetimeLabel}>Avg/Ride</Text>
          </View>
        </View>

        {/* ====== GRAPH ====== */}
        <View style={styles.graphCard}>
          <Text style={styles.sectionTitle}>Earnings Trend</Text>

          <View style={styles.periodSelector}>
            {[{ key: "week", label: "Week" }, { key: "month", label: "Month" }, { key: "year", label: "Year" }].map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodBtn, selectedPeriod === p.key && styles.periodBtnActive]}
                onPress={() => setSelectedPeriod(p.key)}
              >
                <Text style={[styles.periodBtnText, selectedPeriod === p.key && styles.periodBtnTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.periodSummary}>
            <View style={styles.periodSummaryItem}>
              <Text style={styles.periodSummaryLabel}>Earnings</Text>
              <Text style={styles.periodSummaryValue}>₹{fmt(periodStats?.earnings)}</Text>
            </View>
            <View style={styles.periodSummaryItem}>
              <Text style={styles.periodSummaryLabel}>Rides</Text>
              <Text style={styles.periodSummaryValue}>{periodStats?.rides || 0}</Text>
            </View>
            <View style={styles.periodSummaryItem}>
              <Text style={styles.periodSummaryLabel}>Commission</Text>
              <Text style={[styles.periodSummaryValue, { color: COLORS.error }]}>
                ₹{fmt(periodStats?.commission)}
              </Text>
            </View>
          </View>

          {graphData && graphData.length > 0 ? (
            <LineChart
              data={prepareChartData()}
              width={width - 72}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLabels
              withHorizontalLabels
              fromZero
            />
          ) : (
            <View style={styles.noDataBox}>
              <Ionicons name="bar-chart-outline" size={40} color={COLORS.gray} />
              <Text style={styles.noDataText}>No earnings data</Text>
              <Text style={styles.noDataSub}>Complete rides to see trends</Text>
            </View>
          )}
        </View>

        {/* ====== COMMISSION STRUCTURE ====== */}
        <View style={styles.commissionCard}>
          <Text style={styles.sectionTitle}>How Fare is Distributed</Text>
          <View style={styles.commissionBar}>
            <View style={[styles.commissionSegment, { flex: 80, backgroundColor: COLORS.dark, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }]}>
              <Text style={styles.commissionSegmentText}>Driver ~80%</Text>
            </View>
            <View style={[styles.commissionSegment, { flex: 15, backgroundColor: COLORS.blue }]}>
              <Text style={[styles.commissionSegmentText, { fontSize: 10 }]}>Platform</Text>
            </View>
            <View style={[styles.commissionSegment, { flex: 5, backgroundColor: COLORS.orange, borderTopRightRadius: 10, borderBottomRightRadius: 10 }]}>
              <Text style={[styles.commissionSegmentText, { fontSize: 8 }]}>GST</Text>
            </View>
          </View>
          <View style={styles.commissionLegend}>
            {[
              { color: COLORS.dark,   label: "Your Earnings" },
              { color: COLORS.blue,   label: "Platform Fee" },
              { color: COLORS.orange, label: "GST" },
            ].map((l, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.commissionNote}>
            <Ionicons name="information-circle" size={16} color={COLORS.gray} />
            <Text style={styles.commissionNoteText}>
              Commission varies: Ride 20%, Driver 15%, Car Wash 25%.
              Cash ride fees are auto-deducted from your next online earnings.
            </Text>
          </View>
        </View>

        {/* ====== RECENT TRANSACTIONS ====== */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {history.length === 0 ? (
            <View style={styles.noDataBox}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.gray} />
              <Text style={styles.noDataText}>No transactions</Text>
            </View>
          ) : (
            history.slice(0, 8).map((ride, index) => {
              const payMethod     = ride.payment_method || "cash";
              const isCash        = payMethod === "cash";
              const customerTotal = parseFloat(ride.total_fare || ride.customer_total || ride.price || 0);
              const driverEarn    = parseFloat(ride.technician_earnings || ride.driver_earning || 0);
              const platformFee   = parseFloat(ride.platform_commission || ride.total_platform_earning || 0);

              return (
                <TouchableOpacity
                  key={ride.id}
                  style={[
                    styles.historyItem,
                    index === Math.min(history.length, 8) - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => { setSelectedRide(ride); setShowBreakdown(true); }}
                >
                  <View style={styles.historyIcon}>
                    <Ionicons name="car-sport-outline" size={20} color={COLORS.dark} />
                  </View>
                  <View style={styles.historyDetails}>
                    <Text style={styles.historyName}>
                      {ride.customer_name || ride.client_name || "Customer"}
                    </Text>
                    <View style={styles.historyMeta}>
                      <Text style={styles.historyDate}>
                        {ride.completed_at
                          ? new Date(ride.completed_at).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : "Pending"}
                      </Text>
                      <View style={[
                        styles.historyPayBadge,
                        { backgroundColor: isCash ? COLORS.orangeLight : COLORS.blueLight },
                      ]}>
                        <Ionicons
                          name={isCash ? "cash-outline" : "phone-portrait-outline"}
                          size={10}
                          color={isCash ? COLORS.orange : COLORS.blue}
                        />
                        <Text style={[styles.historyPayText, { color: isCash ? COLORS.orange : COLORS.blue }]}>
                          {isCash ? "CASH" : "ONLINE"}
                        </Text>
                      </View>
                      {isCash && platformFee > 0 && (
                        <View style={styles.duesBadge}>
                          <Text style={styles.duesBadgeText}>+₹{fmt(platformFee)} dues</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyEarning}>
                      +₹{fmt(driverEarn || customerTotal * 0.8)}
                    </Text>
                    <Text style={styles.historyFare}>Fare: ₹{fmt(customerTotal)}</Text>
                    {isCash && platformFee > 0 && (
                      <Text style={styles.historyDue}>Due: ₹{fmt(platformFee)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ====== PLATFORM DUES MODAL ====== */}
      <DuesModal />

      {/* ====== RIDE BREAKDOWN MODAL ====== */}
      <Modal
        visible={showBreakdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBreakdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Earnings Breakdown</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowBreakdown(false)}>
                <Ionicons name="close" size={22} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {selectedRide && (() => {
              const payMethod     = selectedRide.payment_method || "cash";
              const isCash        = payMethod === "cash";
              const customerTotal = parseFloat(selectedRide.total_fare || selectedRide.customer_total || selectedRide.price || 0);
              const driverEarn    = parseFloat(selectedRide.technician_earnings || selectedRide.driver_earning || customerTotal * 0.8);
              const platformFee   = parseFloat(selectedRide.platform_commission || selectedRide.total_platform_earning || customerTotal * 0.2);
              const gst           = parseFloat(selectedRide.gst_on_commission || 0);

              return (
                <>
                  <View style={styles.modalInfo}>
                    <View style={styles.modalInfoIcon}>
                      <Ionicons name="person-outline" size={20} color={COLORS.dark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalInfoText}>
                        {selectedRide.customer_name || selectedRide.client_name || "Customer"}
                      </Text>
                      <View style={[
                        styles.modalPayBadge,
                        { backgroundColor: isCash ? COLORS.orangeLight : COLORS.blueLight },
                      ]}>
                        <Ionicons
                          name={isCash ? "cash-outline" : "phone-portrait-outline"}
                          size={12}
                          color={isCash ? COLORS.orange : COLORS.blue}
                        />
                        <Text style={[styles.modalPayText, { color: isCash ? COLORS.orange : COLORS.blue }]}>
                          {isCash ? "Cash Payment" : "Online Payment"}
                        </Text>
                      </View>
                    </View>
                    {selectedRide.completed_at && (
                      <Text style={styles.modalDate}>
                        {new Date(selectedRide.completed_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </Text>
                    )}
                  </View>

                  <View style={styles.breakdownBox}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Customer Paid</Text>
                      <Text style={styles.breakdownValue}>₹{fmtDec(customerTotal)}</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <View>
                        <Text style={styles.breakdownLabel}>Platform Commission</Text>
                        {gst > 0 && (
                          <Text style={styles.breakdownSubLabel}>incl. GST ₹{fmtDec(gst)}</Text>
                        )}
                      </View>
                      <Text style={[styles.breakdownValue, { color: COLORS.error }]}>
                        −₹{fmtDec(platformFee)}
                      </Text>
                    </View>
                    <View style={styles.breakdownDivider} />
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { fontWeight: "700" }]}>Your Earnings</Text>
                      <Text style={styles.breakdownTotal}>₹{fmtDec(driverEarn)}</Text>
                    </View>
                  </View>

                  {isCash ? (
                    <View style={styles.modalCashNote}>
                      <Ionicons name="information-circle" size={18} color={COLORS.orange} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.modalCashNoteTitle}>Cash ride — dues added</Text>
                        <Text style={styles.modalCashNoteText}>
                          You collected ₹{fmtDec(customerTotal)} cash from customer.{"\n"}
                          Platform fee ₹{fmtDec(platformFee)} added to your dues.{"\n"}
                          Auto-deducted from your next online ride earning.
                        </Text>
                        <View style={styles.modalDuesBefore}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={styles.modalDuesRow}>Current total dues:</Text>
                            <Text style={[styles.modalDuesRow, { fontSize: 14, fontWeight: "800" }]}>
                              ₹{fmtDec(wallet.platformDues)}
                            </Text>
                          </View>
                          {canAutoClear ? (
                            <Text style={[styles.modalDuesRow, { color: COLORS.success, marginTop: 4, fontWeight: "500", fontSize: 11 }]}>
                              ✓ Will auto-clear on next online ride
                            </Text>
                          ) : (
                            <Text style={[styles.modalDuesRow, { color: COLORS.warning, marginTop: 4, fontWeight: "500", fontSize: 11 }]}>
                              Need ₹{fmtDec(shortfallAmount)} more from online rides
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.modalOnlineNote}>
                      <Ionicons name="shield-checkmark" size={18} color={COLORS.success} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.modalOnlineNoteTitle}>Online ride — settled</Text>
                        <Text style={styles.modalOnlineNoteText}>
                          ₹{fmtDec(driverEarn)} credited to your wallet.{"\n"}
                          Platform fee ₹{fmtDec(platformFee)} deducted automatically.
                          {wallet.platformDues > 0
                            ? `\n₹${fmtDec(Math.min(driverEarn, wallet.platformDues))} also cleared from your cash-ride dues.`
                            : "\nNo pending dues — full amount added to balance."}
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity style={styles.modalBtn} onPress={() => setShowBreakdown(false)}>
                    <Text style={styles.modalBtnText}>Done</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },
  loadingText:      { color: COLORS.gray, marginTop: 12, fontSize: 15 },

  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  headerTitle: { fontSize: 24, fontWeight: "800", color: COLORS.dark },
  historyBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightGray, justifyContent: "center", alignItems: "center" },

  scrollView:    { flex: 1 },
  scrollContent: { padding: 20 },

  // ── Balance Card ──────────────────────────────────────
  balanceCard:        { borderRadius: 20, overflow: "hidden", marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  balanceGradient:    { padding: 24 },
  balanceTop:         { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  balanceLabel:       { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "500" },
  balanceAmount:      { color: COLORS.white, fontSize: 36, fontWeight: "800", marginTop: 6, letterSpacing: -1 },
  balanceDuesHint:    { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 4 },
  withdrawBtn:        { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  withdrawText:       { color: COLORS.dark, fontWeight: "700", marginLeft: 6, fontSize: 14 },
  balanceStats:       { flexDirection: "row", marginTop: 24, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 16 },
  balanceStat:        { flex: 1, alignItems: "center" },
  balanceStatLabel:   { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "500" },
  balanceStatValue:   { color: COLORS.white, fontSize: 16, fontWeight: "700", marginTop: 6 },
  balanceDuesOwedLabel:{ color: "#FCA5A5", fontSize: 9, fontWeight: "600", marginTop: 2 },
  balanceStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  duesWarning:        { flexDirection: "row", alignItems: "flex-start", backgroundColor: "rgba(251,191,36,0.15)", borderRadius: 10, padding: 12, marginTop: 16, gap: 8 },
  duesWarningText:    { color: "#FCD34D", fontSize: 11, flex: 1, lineHeight: 16 },

  // ── Dues Card ──────────────────────────────────────────
  duesCard:            { backgroundColor: COLORS.white, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1.5, borderColor: "#FCA5A5" },
  duesCardHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  duesCardLeft:        { flexDirection: "row", alignItems: "flex-start", flex: 1 },
  duesIconBox:         { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.errorLight, justifyContent: "center", alignItems: "center" },
  duesCardTitle:       { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  duesCardSub:         { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  duesCardTotal:       { fontSize: 24, fontWeight: "800", color: COLORS.error },
  duesCardTotalLabel:  { fontSize: 10, color: COLORS.error, fontWeight: "600", textAlign: "right", marginTop: 2 },

  duesFormula:          { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, marginBottom: 12 },
  duesFormulaRow:       { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  duesFormulaLabel:     { fontSize: 13, color: COLORS.gray },
  duesFormulaValue:     { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  duesFormulaTotalRow:  { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6, paddingTop: 10 },
  duesFormulaTotalLabel:{ fontSize: 14, fontWeight: "700", color: COLORS.dark },
  duesFormulaTotalValue:{ fontSize: 16, fontWeight: "800", color: COLORS.success },

  duesClearPill:     { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, marginBottom: 12, gap: 8 },
  duesClearPillText: { fontSize: 12, fontWeight: "600", flex: 1, lineHeight: 16 },

  duesList:           { marginBottom: 12 },
  duesListToggle:     { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, gap: 6 },
  duesListToggleText: { fontSize: 13, fontWeight: "600", color: COLORS.error },
  duesListItem:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  duesListItemLeft:   { flexDirection: "row", alignItems: "center" },
  duesListOrderId:    { fontSize: 13, fontWeight: "600", color: COLORS.dark },
  duesListDate:       { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  duesListAmount:     { fontSize: 14, fontWeight: "700", color: COLORS.error },
  duesListTotalRow:   { flexDirection: "row", justifyContent: "space-between", paddingTop: 12, marginTop: 4 },
  duesListTotalLabel: { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  duesListTotalAmount:{ fontSize: 16, fontWeight: "800", color: COLORS.error },

  duesNote:     { flexDirection: "row", alignItems: "flex-start", backgroundColor: COLORS.lightGray, borderRadius: 10, padding: 10, gap: 6 },
  duesNoteText: { fontSize: 11, color: COLORS.gray, flex: 1, lineHeight: 16 },

  // ── Settlement Card ────────────────────────────────────
  settlementCard:     { backgroundColor: COLORS.white, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: COLORS.blueLight },
  settlementHeader:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  settlementTitle:    { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  settlementStep:     { flexDirection: "row", alignItems: "flex-start", marginBottom: 10, gap: 10 },
  settlementDot:      { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  settlementStepText: { fontSize: 13, color: COLORS.gray, flex: 1, lineHeight: 18 },

  // ── Cash vs Online ─────────────────────────────────────
  cashOnlineCard:   { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  cashOnlineRow:    { flexDirection: "row", gap: 12 },
  cashOnlineItem:   { flex: 1, borderRadius: 14, padding: 16 },
  cashOnlineHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  cashOnlineLabel:  { fontSize: 13, fontWeight: "700", marginLeft: 6 },
  cashOnlineValue:  { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  cashOnlineSub:    { fontSize: 12, color: COLORS.gray, marginTop: 4 },

  sectionTitle: { fontSize: 17, fontWeight: "700", color: COLORS.dark, marginBottom: 16 },

  // ── Stats ──────────────────────────────────────────────
  statsSection: { marginBottom: 20 },
  statsGrid:    { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  statCard:     { width: (width - 52) / 2, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, margin: 6, borderWidth: 1, borderColor: COLORS.border },
  statIcon:     { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  statValue:    { fontSize: 20, fontWeight: "800", color: COLORS.dark },
  statLabel:    { fontSize: 13, color: COLORS.gray, marginTop: 4, fontWeight: "500" },
  statSub:      { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  // ── Lifetime ───────────────────────────────────────────
  lifetimeCard:   { flexDirection: "row", backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  lifetimeItem:   { flex: 1, alignItems: "center" },
  lifetimeIcon:   { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  lifetimeValue:  { fontSize: 18, fontWeight: "800", color: COLORS.dark },
  lifetimeLabel:  { fontSize: 11, color: COLORS.gray, marginTop: 4, fontWeight: "500" },
  lifetimeDivider:{ width: 1, backgroundColor: COLORS.border, marginHorizontal: 10 },

  // ── Graph ──────────────────────────────────────────────
  graphCard:           { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  periodSelector:      { flexDirection: "row", backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 4, marginBottom: 20 },
  periodBtn:           { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  periodBtnActive:     { backgroundColor: COLORS.dark },
  periodBtnText:       { fontSize: 14, fontWeight: "600", color: COLORS.gray },
  periodBtnTextActive: { color: COLORS.white },
  periodSummary:       { flexDirection: "row", backgroundColor: COLORS.bg, borderRadius: 12, padding: 16, marginBottom: 20 },
  periodSummaryItem:   { flex: 1, alignItems: "center" },
  periodSummaryLabel:  { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
  periodSummaryValue:  { fontSize: 16, fontWeight: "700", color: COLORS.dark, marginTop: 4 },
  chart:               { borderRadius: 12, marginLeft: -10 },
  noDataBox:           { alignItems: "center", paddingVertical: 40 },
  noDataText:          { fontSize: 15, fontWeight: "600", color: COLORS.gray, marginTop: 12 },
  noDataSub:           { fontSize: 13, color: "#9CA3AF", marginTop: 4 },

  // ── Commission ─────────────────────────────────────────
  commissionCard:        { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  commissionBar:         { flexDirection: "row", height: 44, borderRadius: 10, overflow: "hidden", marginBottom: 16 },
  commissionSegment:     { justifyContent: "center", alignItems: "center" },
  commissionSegmentText: { color: COLORS.white, fontWeight: "700", fontSize: 12 },
  commissionLegend:      { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  legendItem:            { flexDirection: "row", alignItems: "center", marginRight: 20, marginBottom: 4 },
  legendDot:             { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendText:            { fontSize: 13, color: COLORS.gray },
  commissionNote:        { flexDirection: "row", alignItems: "flex-start", backgroundColor: COLORS.lightGray, borderRadius: 10, padding: 12 },
  commissionNoteText:    { fontSize: 12, color: COLORS.gray, marginLeft: 8, flex: 1, lineHeight: 18 },

  // ── History ────────────────────────────────────────────
  historySection: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  historyHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  viewAllText:    { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  historyItem:    { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  historyIcon:    { width: 46, height: 46, borderRadius: 13, backgroundColor: COLORS.lightGray, justifyContent: "center", alignItems: "center", marginRight: 12 },
  historyDetails: { flex: 1 },
  historyName:    { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  historyMeta:    { flexDirection: "row", alignItems: "center", marginTop: 4, flexWrap: "wrap", gap: 4 },
  historyDate:    { fontSize: 11, color: COLORS.gray },
  historyPayBadge:{ flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  historyPayText: { fontSize: 9, fontWeight: "700", marginLeft: 3 },
  duesBadge:      { backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  duesBadgeText:  { fontSize: 9, fontWeight: "700", color: COLORS.error },
  historyRight:   { alignItems: "flex-end" },
  historyEarning: { fontSize: 15, fontWeight: "700", color: COLORS.success },
  historyFare:    { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  historyDue:     { fontSize: 10, color: COLORS.error, marginTop: 2, fontWeight: "600" },

  // ── Modals ─────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  modalHandle:  { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle:   { fontSize: 20, fontWeight: "700", color: COLORS.dark },
  modalClose:   { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.lightGray, justifyContent: "center", alignItems: "center" },

  // Dues Modal specific
  duesModalIconBox:       { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.errorLight, justifyContent: "center", alignItems: "center" },
  duesModalTotalBox:      { alignItems: "center", backgroundColor: COLORS.errorLight, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#FCA5A5" },
  duesModalTotalLabel:    { fontSize: 13, color: COLORS.error, fontWeight: "600" },
  duesModalTotalAmount:   { fontSize: 40, fontWeight: "800", color: COLORS.error, marginTop: 6, letterSpacing: -1 },
  duesModalTotalSub:      { fontSize: 12, color: "#991B1B", marginTop: 6 },
  duesModalFormula:       { backgroundColor: COLORS.bg, borderRadius: 14, padding: 16, marginBottom: 16 },
  duesModalFormulaTitle:  { fontSize: 12, fontWeight: "600", color: COLORS.gray, marginBottom: 10 },
  duesModalFormulaRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  duesModalFormulaLeft:   { flexDirection: "row", alignItems: "center", gap: 8 },
  duesModalFmlDot:        { width: 8, height: 8, borderRadius: 4 },
  duesModalFormulaLabel:  { fontSize: 13, color: COLORS.gray },
  duesModalFormulaValue:  { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  duesModalFormulaDivider:{ height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  duesModalClearBox:      { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  duesModalClearTitle:    { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  duesModalClearSub:      { fontSize: 12, lineHeight: 18 },
  duesModalRidesList:     { marginBottom: 16 },
  duesModalRidesTitle:    { fontSize: 13, fontWeight: "600", color: COLORS.gray, marginBottom: 10 },
  duesModalRideItem:      { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  duesModalRideOrder:     { fontSize: 13, fontWeight: "600", color: COLORS.dark },
  duesModalRideDate:      { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  duesModalRideAmount:    { fontSize: 14, fontWeight: "700", color: COLORS.error },
  duesModalRideStatus:    { fontSize: 10, color: COLORS.gray, marginTop: 2 },
  duesModalRidesTotal:    { flexDirection: "row", justifyContent: "space-between", paddingTop: 12, marginTop: 4 },
  duesModalRidesTotalLabel: { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  duesModalRidesTotalAmount:{ fontSize: 18, fontWeight: "800", color: COLORS.error },
  duesModalHowBox:        { marginBottom: 20 },
  duesModalHowTitle:      { fontSize: 13, fontWeight: "700", color: COLORS.dark, marginBottom: 12 },
  duesModalHowStep:       { flexDirection: "row", alignItems: "flex-start", marginBottom: 10, gap: 10 },
  duesModalHowNum:        { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.dark, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  duesModalHowNumText:    { fontSize: 11, fontWeight: "700", color: COLORS.white },
  duesModalHowText:       { fontSize: 13, color: COLORS.gray, flex: 1, lineHeight: 18 },

  // Ride Breakdown Modal
  modalInfo:          { flexDirection: "row", alignItems: "flex-start", marginBottom: 18 },
  modalInfoIcon:      { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.lightGray, justifyContent: "center", alignItems: "center", marginRight: 12 },
  modalInfoText:      { fontSize: 16, fontWeight: "600", color: COLORS.dark },
  modalDate:          { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  modalPayBadge:      { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  modalPayText:       { fontSize: 11, fontWeight: "700", marginLeft: 4 },
  breakdownBox:       { backgroundColor: COLORS.bg, borderRadius: 14, padding: 18, marginBottom: 14 },
  breakdownRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 10 },
  breakdownLabel:     { fontSize: 14, color: "#374151" },
  breakdownSubLabel:  { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  breakdownValue:     { fontSize: 15, fontWeight: "600", color: COLORS.dark },
  breakdownDivider:   { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  breakdownTotal:     { fontSize: 20, fontWeight: "800", color: COLORS.success },
  modalCashNote:      { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", padding: 14, borderRadius: 12, marginBottom: 18 },
  modalCashNoteTitle: { fontSize: 13, fontWeight: "700", color: COLORS.orange, marginBottom: 4 },
  modalCashNoteText:  { fontSize: 12, color: "#92400E", lineHeight: 18 },
  modalDuesBefore:    { marginTop: 10, backgroundColor: "#FEE2E2", borderRadius: 8, padding: 10 },
  modalDuesRow:       { fontSize: 12, fontWeight: "600", color: COLORS.error },
  modalOnlineNote:    { flexDirection: "row", alignItems: "flex-start", backgroundColor: COLORS.successLight, borderWidth: 1, borderColor: "#A7F3D0", padding: 14, borderRadius: 12, marginBottom: 18 },
  modalOnlineNoteTitle:{ fontSize: 13, fontWeight: "700", color: COLORS.success, marginBottom: 4 },
  modalOnlineNoteText: { fontSize: 12, color: "#065F46", lineHeight: 18 },
  modalBtn:           { backgroundColor: COLORS.dark, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  modalBtnText:       { color: COLORS.white, fontSize: 17, fontWeight: "700" },
});
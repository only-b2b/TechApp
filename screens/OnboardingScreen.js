import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { API_BASE_URL } from "../config";
import { Ionicons } from "@expo/vector-icons";

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  function animate() {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }

  // 🔥 FIX: animate first step on load
  useEffect(() => {
    animate();
  }, []);

  function chooseLang(l) {
    setLanguage(l);
    setStep(2);
    animate();
  }

  async function verifyOtp() {
    if (otp.length < 4) return alert("Invalid OTP");

    const res = await fetch(`${API_BASE_URL}/tech/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();

    if (data.exists) {
      navigation.replace("ThankYou", { tech: data.tech });
    } else {
      navigation.navigate("BasicDetails", { language, phone });
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>Motors Partner</Text>
      <Text style={styles.subtitle}>Welcome to your earning journey</Text>

      {/* STEP 1 — LANGUAGE */}
      {step === 1 && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>Select Language</Text>

          <TouchableOpacity
            style={[
              styles.card,
              language === "en" && styles.cardSelected,
            ]}
            onPress={() => chooseLang("en")}
          >
            <Ionicons name="language-outline" size={23} color="#22D3EE" />
            <Text style={styles.cardText}>English</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.card,
              language === "hi" && styles.cardSelected,
            ]}
            onPress={() => chooseLang("hi")}
          >
            <Ionicons name="language-outline" size={23} color="#22D3EE" />
            <Text style={styles.cardText}>हिन्दी</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* STEP 2 — PHONE */}
      {step === 2 && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>
            {language === "hi" ? "फ़ोन नंबर" : "Phone Number"}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="99XXXXXXXX"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              if (phone.length < 10) return alert("Enter valid phone");
              setStep(3);
              animate();
            }}
          >
            <Text style={styles.buttonText}>
              {language === "hi" ? "OTP भेजें" : "Send OTP"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* STEP 3 — OTP */}
      {step === 3 && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>
            {language === "hi"
              ? "OTP दर्ज करें"
              : "Enter OTP"}
          </Text>

          <TextInput
            style={styles.otpInput}
            placeholder="----"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            maxLength={4}
            value={otp}
            onChangeText={setOtp}
          />

          <TouchableOpacity style={styles.button} onPress={verifyOtp}>
            <Text style={styles.buttonText}>
              {language === "hi" ? "सत्यापित करें" : "Verify"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => alert("OTP Resent!")}>
            <Text style={styles.resend}>
              {language === "hi" ? "OTP पुनः भेजें" : "Resend OTP"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// --------------------- STYLES ----------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 26,
    justifyContent: "center",
  },

  title: {
    fontSize: 30,
    textAlign: "center",
    fontWeight: "800",
    color: "#22D3EE",
  },

  subtitle: {
    textAlign: "center",
    color: "#94a3b8",
    marginBottom: 40,
    fontSize: 16,
  },

  sectionTitle: {
    color: "#E2E8F0",
    fontSize: 18,
    marginBottom: 20,
    fontWeight: "600",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A3648",
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 12,
  },

  cardSelected: {
    borderColor: "#22D3EE",
    backgroundColor: "#243554",
  },

  cardText: {
    marginLeft: 10,
    fontSize: 18,
    color: "#FFFFFF",   // FULL WHITE for clear visibility
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 12,
    borderColor: "#334155",
    borderWidth: 1,
    color: "white",
    fontSize: 18,
    marginBottom: 20,
  },

  otpInput: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    color: "white",
    fontSize: 32,
    letterSpacing: 12,
    textAlign: "center",
    marginBottom: 20,
  },

  button: {
    backgroundColor: "#6366F1",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
  },

  resend: {
    marginTop: 12,
    textAlign: "center",
    color: "#22D3EE",
    fontWeight: "500",
  },
});

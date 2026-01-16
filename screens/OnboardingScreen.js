import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  BackHandler,
  Alert,
} from "react-native";
import GradientScreen from "../components/GradientScreen";
import { generateTestOTP } from "../utils/otp";
import { API_BASE_URL } from "../config";

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  function animate() {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }

  // 🔙 Android back step-wise
  useEffect(() => {
    const backAction = () => {
      if (step > 1) {
        setStep(step - 1);
        animate();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [step]);

  useEffect(() => {
    animate();
  }, []);

  function chooseLang(l) {
    setLanguage(l);
    setStep(2);
    animate();
  }

  function sendOtp() {
    if (phone.length !== 10) {
      return Alert.alert("Invalid phone number");
    }

    const otp = generateTestOTP(); // e.g. 1234
    console.log("TEST OTP:", otp);
    setGeneratedOtp(otp);
    setStep(3);
    animate();
  }

  // ✅ MAIN CHANGE HERE
  async function verifyOtp() {
    if (otp !== generatedOtp) {
      return Alert.alert("Invalid OTP", "Use OTP: 1234");
    }

    try {
      const res = await fetch(`${API_BASE_URL}/tech/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);

      // ✅ IF USER EXISTS → DIRECT LOGIN
      if (data.exists && data.tech) {
        navigation.replace("ThankYou", { tech: data.tech });
      }
      // ❌ IF NEW USER → CONTINUE REGISTRATION
      else {
        navigation.navigate("BasicDetails", {
          language,
          phone,
        });
      }
    } catch (err) {
      console.log("OTP LOGIN ERROR:", err);
      Alert.alert("Error", "Something went wrong. Try again.");
    }
  }

  return (
    <GradientScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Motors Partner</Text>
        <Text style={styles.subtitle}>Welcome to your earning journey</Text>

        {/* STEP 1 — LANGUAGE */}
        {step === 1 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.section}>Select Language</Text>

            <TouchableOpacity style={styles.card} onPress={() => chooseLang("en")}>
              <Text style={styles.cardText}>English</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => chooseLang("hi")}>
              <Text style={styles.cardText}>हिन्दी</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 2 — PHONE */}
        {step === 2 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.section}>Phone Number</Text>

            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              placeholder="99XXXXXXXX"
            />

            <TouchableOpacity style={styles.button} onPress={sendOtp}>
              <Text style={styles.buttonText}>Send OTP</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 3 — OTP */}
        {step === 3 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.section}>Enter OTP</Text>

            <TextInput
              style={styles.otp}
              maxLength={4}
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />

            <TouchableOpacity style={styles.button} onPress={verifyOtp}>
              <Text style={styles.buttonText}>Verify & Continue</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>Test OTP: 1234</Text>
          </Animated.View>
        )}
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "800", color: "white", textAlign: "center" },
  subtitle: { textAlign: "center", color: "#FFE4C7", marginBottom: 40 },
  section: { fontSize: 18, color: "white", marginBottom: 20 },
  card: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardText: { color: "white", fontSize: 18, textAlign: "center" },
  input: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  otp: {
    backgroundColor: "white",
    fontSize: 28,
    textAlign: "center",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#EA580C",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 18 },
  hint: { textAlign: "center", color: "#FFD7AA", marginTop: 10 },
});

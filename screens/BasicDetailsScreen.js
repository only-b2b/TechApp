// screens/BasicDetailsScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function BasicDetailsScreen({ route, navigation }) {
  const { language, phone } = route.params;

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("carwash");
  const [area, setArea] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  function animate() {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }

  useEffect(() => {
    animate();
  }, []);

  // ---------------- VALIDATION LOGIC ---------------- //
  function nextStep() {
    // STEP 1 validation
    if (step === 1) {
      if (fullName.length < 3) return alert("Enter valid full name");
      if (!email.includes("@")) return alert("Enter valid email");
    }

    // STEP 3 validation
    if (step === 3 && !area) {
      return alert("Enter your area / city");
    }

    // If final step → pass payload
    if (step === 3) {
      return navigation.navigate("CategoryDetails", {
        language,
        phone,
        fullName,
        email,
        category,
        area,
      });
    }

    setStep(step + 1);
    animate();
  }

  // ---------------- UI ---------------- //
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>
        Let’s collect the details we need to get you started
      </Text>

      {/* ---------------- STEP 1 : NAME + EMAIL ---------------- */}
      {step === 1 && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.heading}>
            {language === "hi" ? "अपना विवरण दर्ज करें" : "Enter your details"}
          </Text>

          <Text style={styles.info}>
            We use your name & email for verification and communication.
          </Text>

          {/* Full Name */}
          <TextInput
            style={styles.input}
            placeholder={language === "hi" ? "पूरा नाम" : "Full Name"}
            placeholderTextColor="#94a3b8"
            value={fullName}
            onChangeText={setFullName}
          />

          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder="example@gmail.com"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TouchableOpacity style={styles.button} onPress={nextStep}>
            <Text style={styles.buttonText}>
              {language === "hi" ? "आगे बढ़ें" : "Next"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ---------------- STEP 2 : CATEGORY ---------------- */}
      {step === 2 && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.heading}>
            {language === "hi" ? "आपका कार्य क्षेत्र चुनें" : "Choose your category"}
          </Text>

          <Text style={styles.info}>
            Pick the type of service you want to offer to customers.
          </Text>

          {[
            { key: "carwash", label: "Car Wash", icon: "sparkles-outline" },
            { key: "pickdrop", label: "Pick & Drop", icon: "bicycle-outline" },
            { key: "driver", label: "Driver", icon: "car-outline" },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.categoryCard,
                category === item.key && styles.categorySelected,
              ]}
              onPress={() => setCategory(item.key)}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={category === item.key ? "#22D3EE" : "#94A3B8"}
              />
              <Text
                style={[
                  styles.categoryText,
                  category === item.key && { color: "#22D3EE" },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.button} onPress={nextStep}>
            <Text style={styles.buttonText}>
              {language === "hi" ? "आगे बढ़ें" : "Next"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ---------------- STEP 3 : AREA ---------------- */}
      {step === 3 && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.heading}>
            {language === "hi"
              ? "आप किस क्षेत्र में काम करना चाहते हैं?"
              : "Where do you want to earn?"}
          </Text>

          <Text style={styles.info}>
            Choose the area where you want to receive job requests.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Pune, Wakad"
            placeholderTextColor="#94a3b8"
            value={area}
            onChangeText={setArea}
          />

          <TouchableOpacity style={styles.button} onPress={nextStep}>
            <Text style={styles.buttonText}>
              {language === "hi" ? "जारी रखें" : "Continue"}
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
    fontSize: 26,
    color: "#22D3EE",
    fontWeight: "800",
  },

  subtitle: {
    color: "#94a3b8",
    marginBottom: 30,
    fontSize: 15,
  },

  heading: {
    color: "#E2E8F0",
    fontSize: 20,
    marginBottom: 10,
    fontWeight: "700",
  },

  info: {
    color: "#94a3b8",
    marginBottom: 18,
    lineHeight: 20,
    fontSize: 14,
  },

  input: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    padding: 14,
    borderRadius: 12,
    color: "#F1F5F9",
    fontSize: 16,
    marginBottom: 20,
  },

  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#1E293B",
    borderColor: "#334155",
  },

  categorySelected: {
    backgroundColor: "#243554",
    borderColor: "#22D3EE",
  },

  categoryText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#CBD5E1",
    fontWeight: "600",
  },

  button: {
    backgroundColor: "#6366F1",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
  },
});

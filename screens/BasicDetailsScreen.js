import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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
      duration: 300,
      useNativeDriver: true,
    }).start();
  }

  useEffect(() => {
    animate();
  }, []);

  // 🔙 STEP-WISE BACK HANDLING
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

  // ---------------- VALIDATION LOGIC ----------------
  function nextStep() {
    if (step === 1) {
      if (fullName.length < 3) return alert("Enter valid full name");
      if (!email.includes("@")) return alert("Enter valid email");
    }

    if (step === 3 && !area) {
      return alert("Enter your area / city");
    }

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

  return (
    <LinearGradient
       colors={["#f3b91aff", "#ee8941ff", "#e67d05ff"]}
      style={styles.container}
    >
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>
        Let’s collect the details we need to get you started
      </Text>

      {/* STEP 1 */}
      {step === 1 && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.heading}>
            {language === "hi" ? "अपना विवरण दर्ज करें" : "Enter your details"}
          </Text>

          <Text style={styles.info}>
            We use your name & email for verification.
          </Text>

          <TextInput
            style={styles.input}
            placeholder={language === "hi" ? "पूरा नाम" : "Full Name"}
            placeholderTextColor="#CBD5E1"
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            style={styles.input}
            placeholder="example@gmail.com"
            placeholderTextColor="#CBD5E1"
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

      {/* STEP 2 */}
      {step === 2 && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.heading}>
            {language === "hi" ? "आपका कार्य क्षेत्र चुनें" : "Choose your category"}
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
                color={category === item.key ? "#FDBA74" : "#E5E7EB"}
              />
              <Text
                style={[
                  styles.categoryText,
                  category === item.key && { color: "#FDBA74" },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.button} onPress={nextStep}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.heading}>
            {language === "hi"
              ? "आप किस क्षेत्र में काम करना चाहते हैं?"
              : "Where do you want to earn?"}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Pune, Wakad"
            placeholderTextColor="#CBD5E1"
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
    </LinearGradient>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 26,
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "800",
  },

  subtitle: {
    color: "#FFE4C7",
    marginBottom: 30,
    fontSize: 15,
  },

  heading: {
    color: "white",
    fontSize: 20,
    marginBottom: 10,
    fontWeight: "700",
  },

  info: {
    color: "#FED7AA",
    marginBottom: 18,
    fontSize: 14,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 14,
    borderRadius: 12,
    color: "white",
    fontSize: 16,
    marginBottom: 20,
  },

  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  categorySelected: {
    borderWidth: 1,
    borderColor: "#FDBA74",
  },

  categoryText: {
    marginLeft: 10,
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },

  button: {
    backgroundColor: "#EA580C",
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

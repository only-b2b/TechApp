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
import { LinearGradient } from "expo-linear-gradient";

export default function CategoryDetailsScreen({ route, navigation }) {
  const { language, phone, email, fullName, category, area } = route.params;

  const [expertise, setExpertise] = useState("");
  const [vehicle, setVehicle] = useState("bike");
  const [experience, setExperience] = useState("");

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

  function next() {
    const payload = {
      language,
      phone: String(phone),
      email,
      fullName,
      category,
      area,
    };

    if (category === "carwash") {
      if (!expertise) return alert("Please describe your carwash expertise");
      payload.expertise = expertise;
    }

    if (category === "pickdrop") {
      payload.vehicle = vehicle;
    }

    if (category === "driver") {
      if (!experience) return alert("Enter experience (years)");
      payload.experience = experience;
    }

    navigation.navigate("DocumentUpload", payload);
  }

  return (
    <LinearGradient
       colors={["#f3b91aff", "#ee8941ff", "#e67d05ff"]}
      style={styles.container}
    >
      <Text style={styles.title}>
        {language === "hi" ? "श्रेणी विवरण" : "Category Details"}
      </Text>

      <Text style={styles.subtitle}>
        {
          {
            carwash:
              language === "hi"
                ? "अपना कारवॉश अनुभव साझा करें"
                : "Tell us about your carwash experience",
            pickdrop:
              language === "hi"
                ? "अपनी सवारी का चुनाव करें"
                : "Choose the vehicle you will use",
            driver:
              language === "hi"
                ? "ड्राइविंग अनुभव दर्ज करें"
                : "Add your driving experience",
          }[category]
        }
      </Text>

      <Animated.View style={{ opacity: fadeAnim }}>
        {/* ---------- CARWASH ---------- */}
        {category === "carwash" && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>
              {language === "hi"
                ? "अपने अनुभव का विवरण दें"
                : "Describe your experience"}
            </Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              placeholder={
                language === "hi"
                  ? "उदाहरण: 5+ साल का कारवॉश अनुभव"
                  : "Example: 5+ years of experience"
              }
              placeholderTextColor="#FED7AA"
              value={expertise}
              onChangeText={setExpertise}
            />
          </View>
        )}

        {/* ---------- PICK & DROP ---------- */}
        {category === "pickdrop" && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>
              {language === "hi" ? "अपनी गाड़ी चुनें" : "Select your vehicle"}
            </Text>

            {[
              { key: "bike", label: "Bike", icon: "bicycle-outline" },
              { key: "scooter", label: "Scooter", icon: "bicycle-outline" },
              { key: "car", label: "Car", icon: "car-outline" },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.vehicleCard,
                  vehicle === item.key && styles.selectedCard,
                ]}
                onPress={() => setVehicle(item.key)}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={vehicle === item.key ? "#FDBA74" : "#FFE4C7"}
                />
                <Text
                  style={[
                    styles.cardText,
                    vehicle === item.key && { color: "#FDBA74" },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ---------- DRIVER ---------- */}
        {category === "driver" && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>
              {language === "hi"
                ? "ड्राइविंग अनुभव (वर्ष)"
                : "Driving experience (years)"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder={language === "hi" ? "उदाहरण: 3" : "e.g. 3"}
              placeholderTextColor="#FED7AA"
              keyboardType="number-pad"
              value={experience}
              onChangeText={setExperience}
            />
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={next}>
          <Text style={styles.buttonText}>
            {language === "hi" ? "अगला" : "Next"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
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
    marginBottom: 20,
    fontSize: 15,
  },

  label: {
    color: "white",
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 14,
    borderRadius: 12,
    color: "white",
    fontSize: 16,
    marginBottom: 20,
  },

  textArea: {
    height: 130,
    textAlignVertical: "top",
  },

  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginBottom: 12,
  },

  selectedCard: {
    borderWidth: 1,
    borderColor: "#FDBA74",
  },

  cardText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "white",
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

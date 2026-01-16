import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  Animated,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { DOC_RULES } from "../constants/docRules";
import { API_BASE_URL } from "../config";

export default function DocumentUploadScreen({ route, navigation }) {
  const params = route.params;
  const { language, category } = params;

  const rules = DOC_RULES[category] || [];
  const [files, setFiles] = useState({});
  const [inputs, setInputs] = useState({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, []);

  async function pickFile(docKey) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert("Permission required");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setFiles((p) => ({ ...p, [docKey]: result.assets[0] }));
    }
  }

  function removeFile(docKey) {
    const updated = { ...files };
    delete updated[docKey];
    setFiles(updated);
  }

async function submitAll() {
  try {
    // 1️⃣ VALIDATION
    for (let rule of rules) {
      if (rule.required) {
        if (!files[rule.key]) {
          return Alert.alert("Missing document", rule.label);
        }
        if (!inputs[rule.key]) {
          return Alert.alert("Missing number", rule.inputPlaceholder);
        }
      }
    }

    let technician_id = null;
    let techData = null;

    // 2️⃣ TRY REGISTER
    const regRes = await fetch(`${API_BASE_URL}/tech/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, document_url: null }),
    });

    const regData = await regRes.json();
    console.log("REGISTER RESPONSE:", regData);

    if (regData.success && regData.tech) {
      technician_id = regData.tech.id;
      techData = regData.tech;
    }

    // 3️⃣ IF PHONE EXISTS → LOGIN
    if (!technician_id && regData.error === "PHONE_EXISTS") {
      const loginRes = await fetch(`${API_BASE_URL}/tech/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: params.phone }),
      });

      const loginData = await loginRes.json();
      console.log("LOGIN RESPONSE:", loginData);

      // ✅ HANDLE BOTH RESPONSE TYPES
      if (loginData.tech) {
        technician_id = loginData.tech.id;
        techData = loginData.tech;
      } else {
        return Alert.alert(
          "Error",
          "Account exists but technician data missing"
        );
      }
    }

    if (!technician_id) {
      return Alert.alert("Error", "Unable to identify technician");
    }

    // 4️⃣ UPLOAD DOCUMENTS
    let lastUrl = null;

    for (let rule of rules) {
      if (!files[rule.key]) continue;

      const form = new FormData();
      form.append("file", {
        uri: files[rule.key].uri,
        name: `${rule.key}.jpg`,
        type: "image/jpeg",
      });
      form.append("technician_id", String(technician_id));
      form.append("doc_type", rule.key);
      form.append("doc_number", inputs[rule.key]);

      const uploadRes = await fetch(`${API_BASE_URL}/docs/upload`, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: form,
      });

      const uploadData = await uploadRes.json();
      console.log("UPLOAD:", rule.key, uploadData);

      if (!uploadData.success) {
        return Alert.alert("Upload failed", rule.label);
      }

      lastUrl = uploadData.file_url;
    }

    // 5️⃣ UPDATE TECH
    if (lastUrl) {
      await fetch(`${API_BASE_URL}/tech/update-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technician_id,
          document_url: lastUrl,
        }),
      });
    }

    // 6️⃣ SUCCESS
    navigation.replace("ThankYou", { tech: techData });

  } catch (err) {
    console.log("FINAL ERROR:", err);
    Alert.alert("Error", "Something went wrong. Check console logs.");
  }
}


  return (
    <LinearGradient
      colors={["#f3b91aff", "#ee8941ff", "#e67d05ff"]}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.heading}>
            {language === "hi" ? "दस्तावेज़ अपलोड करें" : "Upload Documents"}
          </Text>

          <Text style={styles.info}>
            Upload clear photos to complete verification
          </Text>

          {rules.map((rule) => (
            <View key={rule.key} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.label}>{rule.label}</Text>
                {rule.required && <Text style={styles.badge}>REQUIRED</Text>}
              </View>

              <TextInput
                style={styles.input}
                placeholder={rule.inputPlaceholder}
                placeholderTextColor="#FFF3C4"
                value={inputs[rule.key] || ""}
                onChangeText={(t) =>
                  setInputs((p) => ({ ...p, [rule.key]: t }))
                }
              />

              {!files[rule.key] ? (
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => pickFile(rule.key)}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color="white"
                  />
                  <Text style={styles.uploadText}>Upload Image</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.previewRow}>
                  <Image
                    source={{ uri: files[rule.key].uri }}
                    style={styles.previewImg}
                  />
                  <TouchableOpacity onPress={() => removeFile(rule.key)}>
                    <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.submitBtn} onPress={submitAll}>
            <Text style={styles.submitText}>Finish Registration</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 40,
  },

  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "white",
    marginBottom: 6,
  },

  info: {
    color: "#2f2f2f",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  label: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },

  badge: {
    fontSize: 10,
    color: "#3b2f00",
    borderWidth: 1,
    borderColor: "#3b2f00",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    padding: 12,
    color: "white",
    marginBottom: 10,
  },

  uploadBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e67d05ff",
    padding: 12,
    borderRadius: 10,
  },

  uploadText: {
    color: "white",
    marginLeft: 8,
    fontWeight: "600",
  },

  previewRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  previewImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },

  submitBtn: {
    backgroundColor: "#3b2f00",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },

  submitText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },
});

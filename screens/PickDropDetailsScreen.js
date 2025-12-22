import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function PickDropDetailsScreen({ route, navigation }) {
  const { phone, language, email, category, area } = route.params || {};
  const [vehicle, setVehicle] = useState("bike");

  const handleNext = () => {
    navigation.navigate("DocumentUpload", {
      phone,
      language,
      email,
      category,
      area,
      vehicle,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your vehicle</Text>

      <TouchableOpacity
        style={[styles.option, vehicle === "bike" && styles.optionSelected]}
        onPress={() => setVehicle("bike")}
      >
        <Text>Bike</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, vehicle === "scooter" && styles.optionSelected]}
        onPress={() => setVehicle("scooter")}
      >
        <Text>Scooter</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, vehicle === "car" && styles.optionSelected]}
        onPress={() => setVehicle("car")}
      >
        <Text>Car</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, marginBottom: 16, textAlign: "center" },
  option: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: "#0ea5e9",
    backgroundColor: "#e0f2fe",
  },
  button: {
    marginTop: 24,
    backgroundColor: "#0ea5e9",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold" },
});

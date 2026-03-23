// auth/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";


const AuthContext = createContext();

const TECH_STORAGE_KEY = "TECH_SESSION";

export function AuthProvider({ children }) {
  const [tech, setTech] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 🔹 Load saved session when app starts
  useEffect(() => {
    (async () => {
      try {
        const savedTech = await AsyncStorage.getItem(TECH_STORAGE_KEY);
        if (savedTech) {
          setTech(JSON.parse(savedTech));
        }
      } catch (err) {
        console.log("AUTH LOAD ERROR:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 🔹 Login & persist
  const login = async (techData) => {
    setTech(techData);
    await AsyncStorage.setItem(
      TECH_STORAGE_KEY,
      JSON.stringify(techData)
    );
  };

  // 🔹 Logout & clear
  const logout = async () => {
    setTech(null);
    await AsyncStorage.removeItem(TECH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ tech, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

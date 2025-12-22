// auth/AuthContext.js
import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [tech, setTech] = useState(null);

  const login = (techData) => setTech(techData);
  const logout = () => setTech(null);

  return (
    <AuthContext.Provider value={{ tech, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

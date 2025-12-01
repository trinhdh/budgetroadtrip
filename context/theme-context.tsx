import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useNativeColorScheme } from "react-native";

type ThemePreference = "light" | "dark" | "system";

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (theme: ThemePreference) => void;
  effectiveScheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useNativeColorScheme();
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem("themePreference").then((val) => {
      if (val) setThemePreferenceState(val as ThemePreference);
      setLoaded(true);
    });
  }, []);

  const setThemePreference = async (newTheme: ThemePreference) => {
    setThemePreferenceState(newTheme);
    await AsyncStorage.setItem("themePreference", newTheme);
  };

  // Calculate what the app should actually look like
  const effectiveScheme =
    themePreference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : themePreference;

  if (!loaded) return null; // Or a splash screen/loading indicator

  return (
    <ThemeContext.Provider
      value={{ themePreference, setThemePreference, effectiveScheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeSetting() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeSetting must be used within a ThemeProvider");
  }
  return context;
}

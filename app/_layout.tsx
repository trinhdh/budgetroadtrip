import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

import { useAuth } from "@/hooks/use-auth";
// 1. Import the new Context
import { ThemeProvider, useThemeSetting } from "@/context/theme-context";

import { PortalProvider, TamaguiProvider, Theme } from "tamagui";
import config from "../tamagui.config";

export const unstable_settings = {
  anchor: "(tabs)",
};

// 2. Create a wrapper component to consume the ThemeContext
function AppContent() {
  const { effectiveScheme } = useThemeSetting();

  return (
    <TamaguiProvider config={config}>
      <PortalProvider shouldAddRootHost>
        {/* 3. Use effectiveScheme from context */}
        <Theme name={effectiveScheme}>
          <NavigationThemeProvider
            value={effectiveScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
              <Stack.Screen
                name="trip/[id]"
                options={{ title: "Trip Details" }}
              />
            </Stack>
            <StatusBar style={effectiveScheme === "dark" ? "light" : "dark"} />
          </NavigationThemeProvider>
        </Theme>
      </PortalProvider>
    </TamaguiProvider>
  );
}

export default function RootLayout() {
  const { isLoaded: isAuthLoaded } = useAuth();

  const [loaded] = useFonts({
    Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
    InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
  });

  if (!isAuthLoaded || !loaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // 4. Wrap everything in our custom ThemeProvider
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

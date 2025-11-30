import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font"; // 1. Import useFonts
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

// 2. Import Tamagui Provider and Config
import { PortalProvider, TamaguiProvider, Theme } from "tamagui";
import config from "../tamagui.config";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isLoaded: isAuthLoaded, user } = useAuth();

  // 3. Load Tamagui Fonts (Required for Tamagui to work)
  const [loaded] = useFonts({
    Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
    InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
  });

  // 4. Wait for both Auth and Fonts to load
  if (!isAuthLoaded || !loaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // 5. Wrap everything in TamaguiProvider -> Theme -> ThemeProvider
  return (
    <TamaguiProvider config={config}>
      <PortalProvider>
        <Theme name={colorScheme === "dark" ? "dark" : "light"}>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
              {/* Add the dynamic trip route if you haven't yet */}
              <Stack.Screen
                name="trip/[id]"
                options={{ title: "Trip Details" }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </Theme>
      </PortalProvider>
    </TamaguiProvider>
  );
}

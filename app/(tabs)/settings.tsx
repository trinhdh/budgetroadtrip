import { useThemeSetting } from "@/context/theme-context";
import { Laptop, Moon, Sun } from "@tamagui/lucide-icons";
import React from "react";
import { Card, H4, Text, Theme, ToggleGroup, YStack } from "tamagui";

export default function SettingsScreen() {
  const { themePreference, setThemePreference } = useThemeSetting();

  return (
    <Theme name="light">
      <YStack
        flex={1}
        backgroundColor="$background"
        padding="$4"
        paddingTop="$8"
      >
        <H4 marginBottom="$4" size="$8">
          Settings
        </H4>

        {/* Appearance Settings */}
        <Card bordered padding="$4">
          <H4 fontSize="$5" marginBottom="$3">
            Appearance
          </H4>

          <ToggleGroup
            type="single"
            value={themePreference}
            onValueChange={(val) => {
              if (val) setThemePreference(val as any);
            }}
            disableDeactivation
          >
            <ToggleGroup.Item value="light" flex={1} aria-label="Light Mode">
              <Sun size={18} color="$yellow10" />
              <Text marginLeft="$2">Light</Text>
            </ToggleGroup.Item>

            <ToggleGroup.Item value="dark" flex={1} aria-label="Dark Mode">
              <Moon size={18} color="$purple10" />
              <Text marginLeft="$2">Dark</Text>
            </ToggleGroup.Item>

            <ToggleGroup.Item
              value="system"
              flex={1}
              aria-label="System Default"
            >
              <Laptop size={18} color="$gray10" />
              <Text marginLeft="$2">System</Text>
            </ToggleGroup.Item>
          </ToggleGroup>
        </Card>
      </YStack>
    </Theme>
  );
}

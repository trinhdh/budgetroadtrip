import config from "@/tamagui.config";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { TamaguiProvider, Theme } from "tamagui";
import SettingsScreen from "../settings"; // Assumes file is app/(tabs)/settings.tsx

// --- MOCKS ---

// 1. Mock Icons (Prevent SVG errors)
jest.mock("@tamagui/lucide-icons", () => ({
  Sun: () => null,
  Moon: () => null,
  Laptop: () => null,
}));

// 2. Mock The Custom Hook (Capture the setter function)
const mockSetThemePreference = jest.fn();

jest.mock("@/context/theme-context", () => ({
  useThemeSetting: () => ({
    themePreference: "system", // Default state for test
    setThemePreference: mockSetThemePreference,
  }),
}));

// --- HELPER ---
const renderWithTheme = (component: React.ReactNode) => {
  return render(
    <TamaguiProvider config={config}>
      <Theme name="light">{component}</Theme>
    </TamaguiProvider>
  );
};

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers(); // Handle Tamagui animations
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the settings options correctly", () => {
    const { getByText } = renderWithTheme(<SettingsScreen />);

    // Check Title
    expect(getByText("Settings")).toBeTruthy();

    // Check Section Header
    expect(getByText("Appearance")).toBeTruthy();

    // Check Toggle Options
    expect(getByText("Light")).toBeTruthy();
    expect(getByText("Dark")).toBeTruthy();
    expect(getByText("System")).toBeTruthy();
  });

  it('calls setThemePreference when "Dark" is pressed', () => {
    const { getByLabelText } = renderWithTheme(<SettingsScreen />);

    // Find button by the accessibility label we defined in the component
    const darkButton = getByLabelText("Dark Mode");

    fireEvent.press(darkButton);

    expect(mockSetThemePreference).toHaveBeenCalledWith("dark");
  });

  it('calls setThemePreference when "Light" is pressed', () => {
    const { getByLabelText } = renderWithTheme(<SettingsScreen />);

    const lightButton = getByLabelText("Light Mode");

    fireEvent.press(lightButton);

    expect(mockSetThemePreference).toHaveBeenCalledWith("light");
  });
});

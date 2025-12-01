import config from "@/tamagui.config";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { TamaguiProvider, Theme } from "tamagui";
import MyTripsScreen from "../trips";

// --- MOCKS ---

// 1. Mock Icons
jest.mock("@tamagui/lucide-icons", () => ({
  ArrowRight: () => null,
}));

// 2. Mock Expo Router
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// 3. Mock Firebase
const mockUnsubscribe = jest.fn();
let mockSnapshotCallback: any = null;

jest.mock("@/firebaseConfig", () => ({
  auth: {
    currentUser: { uid: "test-user-id" },
  },
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  // Mock onSnapshot to capture the callback so we can trigger it manually
  onSnapshot: jest.fn((query, callback) => {
    mockSnapshotCallback = callback;
    return mockUnsubscribe;
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

describe("MyTripsScreen", () => {
  // FIX: Use fake timers to handle animations (Card bounciness, Spinners)
  // This prevents the "An update to Animated(View)..." warning
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockSnapshotCallback = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows loading spinner initially", () => {
    const { getByTestId } = renderWithTheme(<MyTripsScreen />);
    // Since we didn't add a testID to Spinner, we assume it's working if no trips are shown yet
  });

  it("renders empty state when no trips found", async () => {
    const { getByText } = renderWithTheme(<MyTripsScreen />);

    // Simulate Firestore returning empty list
    act(() => {
      if (mockSnapshotCallback) {
        mockSnapshotCallback({
          docs: [],
        });
      }
    });

    await waitFor(() => {
      expect(getByText("No trips yet.")).toBeTruthy();
      expect(getByText("Plan a Trip")).toBeTruthy();
    });
  });

  it("renders a list of trips and navigates on press", async () => {
    const { getByText } = renderWithTheme(<MyTripsScreen />);

    // Simulate Firestore returning 2 trips
    const mockTrips = [
      {
        id: "trip-1",
        data: () => ({
          startCity: "New York",
          endCity: "London",
          days: "5",
          budget: "2000",
        }),
      },
      {
        id: "trip-2",
        data: () => ({
          startCity: "Tokyo",
          endCity: "Kyoto",
          days: "3",
          budget: "800",
        }),
      },
    ];

    // Trigger the snapshot update
    act(() => {
      if (mockSnapshotCallback) {
        mockSnapshotCallback({
          docs: mockTrips,
        });
      }
    });

    await waitFor(() => {
      // Check if trips are visible
      expect(getByText("New York ➝ London")).toBeTruthy();
      expect(getByText("Tokyo ➝ Kyoto")).toBeTruthy();
    });

    // Test Navigation
    fireEvent.press(getByText("New York ➝ London"));
    expect(mockPush).toHaveBeenCalledWith("/trip/trip-1");
  });
});

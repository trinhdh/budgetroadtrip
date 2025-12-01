import config from "@/tamagui.config";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";
import { TamaguiProvider, Theme } from "tamagui";
import PlanScreen from "../index";

// --- MOCKS ---

// 1. Mock Icons (Fixes "react-native-svg" error)
jest.mock("@tamagui/lucide-icons", () => ({
  Plus: () => null,
}));

// 2. Mock Expo Router
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// 3. Mock Firebase
jest.mock("@/firebaseConfig", () => ({
  auth: {
    currentUser: { uid: "test-user-id" },
  },
  db: {},
}));

const mockAddDoc = jest.fn();
jest.mock("firebase/firestore", () => ({
  // FIX: Return a dummy value so addDoc gets a valid collection reference
  collection: jest.fn(() => "mock-collection-ref"),
  addDoc: (collectionRef: any, data: any) => mockAddDoc(collectionRef, data),
  serverTimestamp: () => "mock-timestamp",
}));

// 4. Mock Google Gemini AI
const mockGenerateContent = jest.fn();
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// 5. Spy on Alerts
jest.spyOn(Alert, "alert");

// --- HELPER: Render with Tamagui Theme ---
const renderWithTheme = (component: React.ReactNode) => {
  return render(
    <TamaguiProvider config={config}>
      <Theme name="light">{component}</Theme>
    </TamaguiProvider>
  );
};

describe("PlanScreen", () => {
  // Clean up logs to keep test output tidy
  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("generates a trip successfully and navigates", async () => {
    // Setup AI response
    const mockTripData = {
      itinerary: [
        { day: 1, title: "Arrival", activity: "Check in", cost: 100 },
      ],
    };

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(mockTripData),
      },
    });

    // Setup Firestore response
    mockAddDoc.mockResolvedValueOnce({ id: "new-trip-id" });

    const { getByPlaceholderText, getByText } = renderWithTheme(<PlanScreen />);

    // Fill Inputs
    fireEvent.changeText(getByPlaceholderText("NYC"), "New York");
    fireEvent.changeText(getByPlaceholderText("LA"), "London");
    fireEvent.changeText(getByPlaceholderText("1000"), "2000");
    fireEvent.changeText(getByPlaceholderText("5"), "3");
    fireEvent.changeText(getByPlaceholderText("2"), "2");

    // Press Generate
    const generateBtn = getByText("Generate Itinerary");
    fireEvent.press(generateBtn);

    // Verify Loading
    expect(getByText("Planning...")).toBeTruthy();

    // Wait for Async
    await waitFor(() => {
      // 1. Check AI called
      expect(mockGenerateContent).toHaveBeenCalled();

      // 2. Check Firestore called
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(), // The collection ref (mock-collection-ref)
        expect.objectContaining({
          userId: "test-user-id",
          startCity: "New York",
          endCity: "London",
          budget: "2000",
        })
      );

      // 3. Check Navigation
      expect(mockPush).toHaveBeenCalledWith("/trip/new-trip-id");
    });
  });

  it("shows an alert if AI generation fails", async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error("AI Overload"));

    const { getByPlaceholderText, getByText } = renderWithTheme(<PlanScreen />);

    // Fill valid inputs
    fireEvent.changeText(getByPlaceholderText("NYC"), "Boston");
    fireEvent.changeText(getByPlaceholderText("LA"), "Miami");
    fireEvent.changeText(getByPlaceholderText("1000"), "500");
    fireEvent.changeText(getByPlaceholderText("5"), "2");
    fireEvent.changeText(getByPlaceholderText("2"), "1");

    fireEvent.press(getByText("Generate Itinerary"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "AI Error",
        "Failed to generate itinerary. Please try again."
      );
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("validates missing inputs", async () => {
    const { getByText, getByPlaceholderText } = renderWithTheme(<PlanScreen />);

    // Only fill one input
    fireEvent.changeText(getByPlaceholderText("NYC"), "Tokyo");

    fireEvent.press(getByText("Generate Itinerary"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Missing Info",
        "Please fill in all fields"
      );
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });
});

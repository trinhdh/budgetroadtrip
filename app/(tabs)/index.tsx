// app/(tabs)/index.tsx
import { auth, db } from "@/firebaseConfig";
import { GoogleGenerativeAI } from "@google/generative-ai"; // <--- Import Gemini
import { Plus } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router"; // <--- Import Router
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, ScrollView } from "react-native";
import {
  Button,
  Card,
  H2,
  Input,
  Label,
  Spinner,
  Text,
  Theme,
  XStack,
  YStack,
} from "tamagui";

// --- Types ---
type DayPlan = {
  day: number;
  title: string;
  activity: string;
  cost: number;
};

type TripPlan = {
  startCity: string;
  endCity: string;
  budget: string;
  days: string;
  people: string;
  itinerary: DayPlan[];
};

export default function PlanScreen() {
  const router = useRouter(); // <--- Initialize Router
  const [loading, setLoading] = useState(false);
  const [startCity, setStartCity] = useState("");
  const [endCity, setEndCity] = useState("");
  const [budget, setBudget] = useState("");
  const [days, setDays] = useState("");
  const [people, setPeople] = useState("");

  // --- Real AI Generator Logic ---
  const generateItinerary = async () => {
    if (!startCity || !endCity || !budget || !days) {
      Alert.alert("Missing Info", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      // 1. Initialize Gemini
      const genAI = new GoogleGenerativeAI(
        process.env.EXPO_PUBLIC_GEMINI_API_KEY || ""
      );
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // 2. Construct the Prompt
      const prompt = `
        Plan a road trip from ${startCity} to ${endCity} for ${days} days with a total budget of $${budget} for ${people} people.
        
        Return a valid JSON object with a single property "itinerary" which is an array of objects.
        Each object must have:
        - "day": integer
        - "title": string (short summary of the day, e.g., "Drive to Boston")
        - "activity": string (detailed activities and stops)
        - "cost": integer (estimated cost for this day)

        Ensure the sum of "cost" is roughly equal to ${budget}.
        Do not include markdown formatting (like \`\`\`json). Just return the raw JSON string.
      `;

      // 3. Generate Content
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // 4. Clean & Parse JSON
      // Sometimes AI adds markdown backticks even if asked not to, so we clean it.
      const jsonString = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsedData = JSON.parse(jsonString);

      // 5. Construct Trip Object
      const newTrip: TripPlan = {
        startCity,
        endCity,
        budget,
        days,
        people,
        itinerary: parsedData.itinerary,
      };

      // 6. Save to Firestore
      if (auth.currentUser) {
        const docRef = await addDoc(collection(db, "trips"), {
          userId: auth.currentUser.uid,
          ...newTrip,
          createdAt: serverTimestamp(),
        });
        console.log("Trip saved!");

        // 7. Redirect to the Trip Details Page
        router.push(`/trip/${docRef.id}`);
      } else {
        Alert.alert("Error", "You must be logged in to save trips.");
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      Alert.alert(
        "AI Error",
        "Failed to generate itinerary. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Theme name="light">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <YStack padding="$4" space="$4" marginTop="$8">
          <H2>Plan Your Trip 🚗</H2>
          <Text color="$gray10">AI-Powered Budget Itinerary</Text>

          {/* --- Input Form --- */}
          <Card bordered padding="$4" elevate size="$4">
            <YStack space="$3">
              <XStack space="$2">
                <YStack flex={1}>
                  <Label>Start</Label>
                  <Input
                    placeholder="NYC"
                    value={startCity}
                    onChangeText={setStartCity}
                  />
                </YStack>
                <YStack flex={1}>
                  <Label>End</Label>
                  <Input
                    placeholder="LA"
                    value={endCity}
                    onChangeText={setEndCity}
                  />
                </YStack>
              </XStack>

              <XStack space="$2">
                <YStack flex={1}>
                  <Label>Max Budget</Label>
                  <Input
                    placeholder="1000"
                    keyboardType="numeric"
                    value={budget}
                    onChangeText={setBudget}
                  />
                </YStack>
                <YStack flex={1}>
                  <Label>Days</Label>
                  <Input
                    placeholder="5"
                    keyboardType="numeric"
                    value={days}
                    onChangeText={setDays}
                  />
                </YStack>
              </XStack>

              <YStack>
                <Label>Travelers</Label>
                <Input
                  placeholder="2"
                  keyboardType="numeric"
                  value={people}
                  onChangeText={setPeople}
                />
              </YStack>

              <Button
                themeInverse
                onPress={generateItinerary}
                icon={loading ? <Spinner color="$color" /> : <Plus />}
                disabled={loading}
              >
                {loading ? "Planning..." : "Generate Itinerary"}
              </Button>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </Theme>
  );
}

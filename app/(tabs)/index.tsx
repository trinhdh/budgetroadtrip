// app/(tabs)/index.tsx
import { auth, db } from "@/firebaseConfig";
import { Plus } from "@tamagui/lucide-icons";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, ScrollView } from "react-native";
import {
  Button,
  Card,
  H2,
  H4,
  Input,
  Label,
  Separator,
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
  const [loading, setLoading] = useState(false);
  const [startCity, setStartCity] = useState("");
  const [endCity, setEndCity] = useState("");
  const [budget, setBudget] = useState("");
  const [days, setDays] = useState("");
  const [people, setPeople] = useState("");

  // State to hold the currently generated view locally
  const [currentTrip, setCurrentTrip] = useState<TripPlan | null>(null);

  // --- Mock AI Generator Logic ---
  const generateItinerary = async () => {
    if (!startCity || !endCity || !budget || !days) {
      Alert.alert("Missing Info", "Please fill in all fields");
      return;
    }

    setLoading(true);

    // Simulate AI API delay
    setTimeout(async () => {
      const dayCount = parseInt(days);
      const totalBudget = parseInt(budget);
      const dailyBudget = totalBudget / dayCount;

      // Mock Data Generation
      const mockItinerary: DayPlan[] = Array.from({ length: dayCount }).map(
        (_, index) => ({
          day: index + 1,
          title:
            index === 0
              ? `Depart ${startCity}`
              : index === dayCount - 1
              ? `Arrive ${endCity}`
              : `Explore en route`,
          activity: `Day ${
            index + 1
          }: Scenic drive and local food. Estimated gas & food costs.`,
          cost: Math.floor(dailyBudget * 0.8), // Mock cost calculation
        })
      );

      const newTrip: TripPlan = {
        startCity,
        endCity,
        budget,
        days,
        people,
        itinerary: mockItinerary,
      };

      setCurrentTrip(newTrip);

      // Save to Firestore
      try {
        if (auth.currentUser) {
          await addDoc(collection(db, "trips"), {
            userId: auth.currentUser.uid,
            ...newTrip,
            createdAt: serverTimestamp(),
          });
          console.log("Trip saved to Firestore!");
        }
      } catch (e) {
        console.error("Error saving trip: ", e);
        Alert.alert("Error", "Could not save your trip.");
      }

      setLoading(false);
    }, 1500);
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
              {/* Cities */}
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

              {/* Budget & Days */}
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
                {loading ? "Generating Plan..." : "Generate Itinerary"}
              </Button>
            </YStack>
          </Card>

          <Separator />

          {/* --- Results Section --- */}
          {currentTrip && (
            <YStack
              space="$4"
              animation="lazy"
              enterStyle={{ opacity: 0, y: 10 }}
            >
              <H4>Your Itinerary</H4>

              {currentTrip.itinerary.map((item) => (
                <Card
                  key={item.day}
                  bordered
                  padding="$4"
                  size="$4"
                  animation="bouncy"
                >
                  <Card.Header padded>
                    <XStack justifyContent="space-between">
                      <H4>Day {item.day}</H4>
                      <Text color="$green10" fontWeight="bold">
                        ${item.cost}
                      </Text>
                    </XStack>
                  </Card.Header>
                  <Card.Footer padded>
                    <YStack>
                      <Text fontWeight="600" fontSize="$5">
                        {item.title}
                      </Text>
                      <Text color="$gray11" marginTop="$2">
                        {item.activity}
                      </Text>
                    </YStack>
                  </Card.Footer>
                </Card>
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </Theme>
  );
}

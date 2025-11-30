import { db } from "@/firebaseConfig";
import { Stack, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Card,
  H4,
  Paragraph,
  ScrollView,
  Separator,
  Spinner,
  Text,
  Theme,
  XStack,
  YStack,
} from "tamagui";

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const tripRef = doc(db, "trips", id);

    const unsubscribe = onSnapshot(tripRef, (docSnap) => {
      if (docSnap.exists()) {
        setTrip({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" color="$blue10" />
      </YStack>
    );
  }

  if (!trip) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Text>Trip not found.</Text>
      </YStack>
    );
  }

  return (
    <Theme name="light">
      <Stack.Screen
        options={{ title: "Trip Details", headerBackTitle: "Back" }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        backgroundColor="$background"
      >
        <YStack padding="$4" space="$4">
          {/* Trip Header Info */}
          <YStack space="$2">
            <H4 size="$9">
              {trip.startCity} ➝ {trip.endCity}
            </H4>
            <Paragraph color="$gray10" size="$4">
              {trip.days} Days • {trip.people} Travelers • Budget: $
              {trip.budget}
            </Paragraph>
          </YStack>

          <Separator />

          {/* Itinerary Cards */}
          <Text fontWeight="bold" fontSize="$6" marginBottom="$2">
            Itinerary
          </Text>

          {trip.itinerary?.map((item: any, index: number) => (
            <Card key={index} bordered padding="$4" size="$4" marginBottom="$3">
              <Card.Header>
                <XStack justifyContent="space-between">
                  <H4 size="$5">Day {item.day}</H4>
                  <Text color="$green10" fontWeight="bold">
                    ${item.cost}
                  </Text>
                </XStack>
              </Card.Header>
              <YStack marginTop="$2">
                <Text fontWeight="600" fontSize="$5">
                  {item.title}
                </Text>
                <Paragraph color="$gray11" marginTop="$1">
                  {item.activity}
                </Paragraph>
              </YStack>
            </Card>
          ))}
        </YStack>
      </ScrollView>
    </Theme>
  );
}

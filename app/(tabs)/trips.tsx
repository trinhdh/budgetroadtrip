import { auth, db } from "@/firebaseConfig";
import { ArrowRight } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FlatList } from "react-native";
import {
  Button,
  Card,
  H4,
  Paragraph,
  Spinner,
  Text,
  Theme,
  XStack,
  YStack,
} from "tamagui";

export default function MyTripsScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Query: Trips created by this user, ordered by newest first
    // Note: If you get a Firestore error in the console, check the link it provides to create an Index.
    const q = query(
      collection(db, "trips"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userTrips = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTrips(userTrips);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const renderItem = ({ item }: { item: any }) => (
    <Card
      bordered
      animation="bouncy"
      size="$4"
      hoverStyle={{ scale: 0.925 }}
      pressStyle={{ scale: 0.975 }}
      marginBottom="$4"
      onPress={() => router.push(`/trip/${item.id}`)} // Navigate to details
    >
      <Card.Header padded>
        <XStack justifyContent="space-between" alignItems="center">
          <H4 size="$5" fontWeight="bold">
            {item.startCity} ➝ {item.endCity}
          </H4>
        </XStack>
        <Paragraph theme="alt2" marginTop="$2" size="$3" color="$gray10">
          {item.days} Days • Budget: ${item.budget}
        </Paragraph>
      </Card.Header>
      <Card.Footer padded>
        <XStack justifyContent="flex-end">
          <Button size="$3" chromeless iconAfter={ArrowRight} color="$blue10">
            View Itinerary
          </Button>
        </XStack>
      </Card.Footer>
    </Card>
  );

  return (
    <Theme name="light">
      <YStack
        flex={1}
        backgroundColor="$background"
        padding="$4"
        paddingTop="$8"
      >
        <H4 marginBottom="$4" size="$8">
          My Trips
        </H4>

        {loading ? (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <Spinner size="large" color="$blue10" />
          </YStack>
        ) : trips.length === 0 ? (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <Text fontSize="$5" color="$gray10">
              No trips yet.
            </Text>
            <Button marginTop="$4" onPress={() => router.push("/(tabs)")}>
              Plan a Trip
            </Button>
          </YStack>
        ) : (
          <FlatList
            data={trips}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </YStack>
    </Theme>
  );
}

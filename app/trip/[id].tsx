import { auth, db, storage } from "@/firebaseConfig";
import { Camera, Plus, Receipt, Share2 } from "@tamagui/lucide-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import { Alert, Share } from "react-native";
import {
  Avatar,
  Button,
  Card,
  H4,
  Input,
  Label,
  Paragraph,
  Progress,
  ScrollView,
  Separator,
  Sheet,
  Spinner,
  Tabs,
  Text,
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

type Expense = {
  id: string;
  title: string;
  amount: number;
  payer: string;
  receiptUrl?: string;
  createdAt: any;
};

// --- Mock OCR Service ---
const mockScanReceipt = async (imageUri: string) => {
  return new Promise<{ amount: number; merchant: string }>((resolve) => {
    setTimeout(() => {
      resolve({ amount: 45.5, merchant: "Joes Diner & Gas" });
    }, 1000);
  });
};

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("itinerary");
  const user = auth.currentUser;

  // --- Permissions Hook ---
  const [permission, requestPermission] = ImagePicker.useCameraPermissions();

  // Expense State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const tripRef = doc(db, "trips", id);

    // Listen to Trip Details
    const tripUnsub = onSnapshot(tripRef, (docSnap) => {
      if (docSnap.exists()) {
        setTrip({ id: docSnap.id, ...docSnap.data() });
      }
    });

    // Listen to Expenses
    const expQ = query(
      collection(db, "trips", id, "expenses"),
      orderBy("createdAt", "desc")
    );
    const expUnsub = onSnapshot(expQ, (snapshot) => {
      setExpenses(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Expense))
      );
    });

    return () => {
      tripUnsub();
      expUnsub();
    };
  }, [id]);

  const totalPlanned = trip ? parseInt(trip.budget) : 0;
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const budgetProgress =
    totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;
  const remaining = totalPlanned - totalSpent;

  // --- Helper: Upload Image to Firebase Storage ---
  const uploadImageAsync = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `receipts/${id}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      console.error("Upload failed", error);
      Alert.alert("Upload Error", "Could not upload receipt image.");
      return null;
    }
  };

  const handleSnapReceipt = async () => {
    // 1. Check Permissions
    if (!permission?.granted) {
      const permissionResponse = await requestPermission();
      if (!permissionResponse.granted) {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to scan receipts."
        );
        return;
      }
    }

    // 2. Launch Camera (Safe Fix)
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"], // <--- FIX: Use string array
        allowsEditing: true,
        quality: 0.5,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setLocalImageUri(uri);

        // Run Mock OCR (Simulated)
        const data = await mockScanReceipt(uri);
        setExpenseAmount(data.amount.toString());
        setExpenseTitle(data.merchant);
      }
    } catch (error) {
      console.log("Camera Error:", error);
      // Fallback for Simulators (which have no camera)
      Alert.alert(
        "Camera Unavailable",
        "Could not open camera. Would you like to upload from gallery instead?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Gallery",
            onPress: async () => {
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                quality: 0.5,
              });
              if (!res.canceled) {
                const uri = res.assets[0].uri;
                setLocalImageUri(uri);
                const data = await mockScanReceipt(uri);
                setExpenseAmount(data.amount.toString());
                setExpenseTitle(data.merchant);
              }
            },
          },
        ]
      );
    }
  };

  const handleAddExpense = async () => {
    if (!expenseTitle || !expenseAmount) return;

    setIsUploading(true);
    let downloadUrl = null;

    // 1. Upload Image if exists
    if (localImageUri) {
      downloadUrl = await uploadImageAsync(localImageUri);
    }

    // 2. Save Metadata to Firestore
    await addDoc(collection(db, "trips", id!, "expenses"), {
      title: expenseTitle,
      amount: parseFloat(expenseAmount),
      payer: user?.uid,
      receiptUrl: downloadUrl,
      createdAt: serverTimestamp(),
    });

    setIsUploading(false);
    setExpenseTitle("");
    setExpenseAmount("");
    setLocalImageUri(null);
    setSheetOpen(false);
  };

  const handleShare = async () => {
    await Share.share({
      message: `Check our trip: budgetroadtrip://trip/${id}`,
    });
  };

  if (!trip)
    return (
      <YStack flex={1} ai="center" jc="center">
        <Spinner size="large" color="$blue10" />
      </YStack>
    );

  return (
    <>
      <Stack.Screen options={{ title: trip.startCity + " Trip" }} />
      <YStack flex={1} backgroundColor="$background">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          orientation="horizontal"
          flexDirection="column"
          flex={1}
        >
          <Tabs.List separator={<Separator vertical />} padding="$2">
            <Tabs.Tab flex={1} value="itinerary">
              <Text>🗺️ Itinerary</Text>
            </Tabs.Tab>
            <Tabs.Tab flex={1} value="budget">
              <Text>💸 Budget</Text>
            </Tabs.Tab>
          </Tabs.List>
          <Separator />

          <Tabs.Content value="itinerary" flex={1}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <XStack
                justifyContent="space-between"
                alignItems="center"
                marginBottom="$4"
              >
                <YStack>
                  <H4>
                    {trip.startCity} ➝ {trip.endCity}
                  </H4>
                  <Paragraph color="$gray10">{trip.days} Days</Paragraph>
                </YStack>
                <Button
                  icon={Share2}
                  circular
                  size="$3"
                  onPress={handleShare}
                />
              </XStack>

              {trip.itinerary?.map((item: DayPlan, index: number) => (
                <Card key={index} bordered padding="$3" marginBottom="$3">
                  <XStack justifyContent="space-between">
                    <YStack flex={1}>
                      <Text fontWeight="bold">
                        Day {item.day}: {item.title}
                      </Text>
                      <Text color="$gray11">{item.activity}</Text>
                    </YStack>
                    <Text color="$green10" fontWeight="bold">
                      ${item.cost}
                    </Text>
                  </XStack>
                </Card>
              ))}
            </ScrollView>
          </Tabs.Content>

          <Tabs.Content value="budget" flex={1}>
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            >
              {/* Dashboard */}
              <XStack space="$3" marginBottom="$4">
                <Card flex={1} bordered padding="$3" backgroundColor="$blue2">
                  <Text fontSize={12} color="$gray10">
                    Planned
                  </Text>
                  <H4 color="$blue10">${totalPlanned}</H4>
                </Card>
                <Card
                  flex={1}
                  bordered
                  padding="$3"
                  backgroundColor={remaining < 0 ? "$red2" : "$green2"}
                >
                  <Text fontSize={12} color="$gray10">
                    Remaining
                  </Text>
                  <H4 color={remaining < 0 ? "$red10" : "$green10"}>
                    ${remaining.toFixed(2)}
                  </H4>
                </Card>
              </XStack>

              <YStack marginBottom="$4" space="$2">
                <XStack justifyContent="space-between">
                  <Text fontSize={12} color="$gray10">
                    Spending ({Math.min(budgetProgress, 100).toFixed(0)}%)
                  </Text>
                </XStack>

                {/* FIX: Math.round ensures the value is an integer, preventing the crash */}
                <Progress
                  value={Math.round(Math.min(budgetProgress, 100))}
                  size="$2"
                >
                  <Progress.Indicator
                    animation="bouncy"
                    backgroundColor={remaining < 0 ? "$red10" : "$green10"}
                  />
                </Progress>
              </YStack>

              {/* Expense List */}
              <XStack
                justifyContent="space-between"
                alignItems="center"
                marginBottom="$2"
              >
                <H4 size="$5">Transactions</H4>
                <Button
                  size="$3"
                  icon={Plus}
                  themeInverse
                  onPress={() => setSheetOpen(true)}
                >
                  Add
                </Button>
              </XStack>

              {expenses.map((exp) => (
                <Card key={exp.id} bordered padding="$3" marginBottom="$2">
                  <XStack justifyContent="space-between" alignItems="center">
                    <XStack space="$3" alignItems="center">
                      <Avatar circular size="$3" backgroundColor="$gray4">
                        {exp.receiptUrl ? (
                          <Avatar.Image src={exp.receiptUrl} />
                        ) : (
                          <Receipt size={16} color="$gray10" />
                        )}
                      </Avatar>
                      <YStack>
                        <Text fontWeight="bold">{exp.title}</Text>
                        <Text fontSize={11} color="$gray10">
                          Paid by {exp.payer === user?.uid ? "Me" : "Partner"}
                        </Text>
                      </YStack>
                    </XStack>
                    <Text fontWeight="bold" color="$red10">
                      -${exp.amount.toFixed(2)}
                    </Text>
                  </XStack>
                </Card>
              ))}
            </ScrollView>
          </Tabs.Content>
        </Tabs>

        {/* Expense Sheet */}
        <Sheet
          modal
          open={isSheetOpen}
          onOpenChange={setSheetOpen}
          snapPoints={[60]}
          dismissOnSnapToBottom
        >
          <Sheet.Overlay />
          <Sheet.Frame padding="$4" space="$4">
            <Sheet.Handle />
            <H4>Log Expense</H4>

            <Button
              size="$4"
              theme="active"
              icon={Camera}
              onPress={handleSnapReceipt}
            >
              {localImageUri ? "Retake Receipt" : "Scan Receipt (AI)"}
            </Button>

            {localImageUri && (
              <Text textAlign="center" fontSize={11} color="$green10">
                Image Captured Ready for Upload
              </Text>
            )}

            <YStack space="$2">
              <Label>Description</Label>
              <Input
                placeholder="Description"
                value={expenseTitle}
                onChangeText={setExpenseTitle}
              />
            </YStack>
            <YStack space="$2">
              <Label>Amount ($)</Label>
              <Input
                placeholder="0.00"
                keyboardType="numeric"
                value={expenseAmount}
                onChangeText={setExpenseAmount}
              />
            </YStack>

            <Button
              themeInverse
              onPress={handleAddExpense}
              marginTop="$2"
              disabled={isUploading}
            >
              {isUploading ? <Spinner color="white" /> : "Save Expense"}
            </Button>
          </Sheet.Frame>
        </Sheet>
      </YStack>
    </>
  );
}

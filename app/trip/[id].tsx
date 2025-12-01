import { auth, db, storage } from "@/firebaseConfig";
import {
  ArrowUpRight,
  Camera,
  Check,
  CheckCircle2,
  HelpCircle,
  Plus,
  Receipt,
  Share2,
  ThumbsUp,
  Wallet,
  XCircle,
} from "@tamagui/lucide-icons";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
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
  votes?: string[];
};

type Expense = {
  id: string;
  title: string;
  amount: number;
  payer: string;
  receiptUrl?: string;
  createdAt: any;
};

type Poll = {
  id: string;
  question: string;
  options: { label: string; votes: string[] }[];
  createdAt: any;
};

type Settlement = {
  id: string;
  amount: number;
  fromUser: string;
  toUser: string;
  createdAt: any;
};

// --- Mock OCR ---
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

  const [permission, requestPermission] = ImagePicker.useCameraPermissions();

  // Data State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  // UI State
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<
    "expense" | "activity" | "poll" | "settle"
  >("expense");
  const [isUploading, setIsUploading] = useState(false);

  // Forms
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  const [actDay, setActDay] = useState("");
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actCost, setActCost] = useState("");

  const [pollQuestion, setPollQuestion] = useState("");

  // Removed Payment Handle/Method state since we simplified the flow

  useEffect(() => {
    if (!id) return;
    const tripRef = doc(db, "trips", id);

    const tripUnsub = onSnapshot(tripRef, (docSnap) => {
      if (docSnap.exists()) {
        setTrip({ id: docSnap.id, ...docSnap.data() });
      }
    });

    const expQ = query(
      collection(db, "trips", id, "expenses"),
      orderBy("createdAt", "desc")
    );
    const expUnsub = onSnapshot(expQ, (snapshot) => {
      setExpenses(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Expense))
      );
    });

    const pollQ = query(
      collection(db, "trips", id, "polls"),
      orderBy("createdAt", "desc")
    );
    const pollUnsub = onSnapshot(pollQ, (snapshot) => {
      setPolls(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Poll)));
    });

    const settleQ = query(
      collection(db, "trips", id, "settlements"),
      orderBy("createdAt", "desc")
    );
    const settleUnsub = onSnapshot(settleQ, (snapshot) => {
      setSettlements(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Settlement))
      );
    });

    return () => {
      tripUnsub();
      expUnsub();
      pollUnsub();
      settleUnsub();
    };
  }, [id]);

  // --- Calculations ---
  const totalPlanned = trip ? parseInt(trip.budget) : 0;
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const budgetProgress =
    totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;
  const remaining = totalPlanned - totalSpent;

  const headCount = trip ? parseInt(trip.people) || 2 : 2;
  const fairShare = totalSpent / headCount;

  const myExpenses = expenses
    .filter((e) => e.payer === user?.uid)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const myReceived = settlements
    .filter((s) => s.toUser === user?.uid)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const rawBalance = myExpenses - fairShare;
  const balance = rawBalance - myReceived;

  // --- Actions ---

  const handleShare = async () => {
    const redirectUrl = Linking.createURL(`trip/${id}`);
    await Share.share({
      message: `Join my trip plan on Budget Roadtrip! 🚗💨 \n\n${redirectUrl}`,
    });
  };

  const uploadImageAsync = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `receipts/${id}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Upload failed", error);
      return null;
    }
  };

  const handleMarkSettled = async () => {
    if (!user) return;

    await addDoc(collection(db, "trips", id!, "settlements"), {
      amount: Math.abs(balance),
      fromUser: "others",
      toUser: user.uid,
      createdAt: serverTimestamp(),
    });

    setSheetOpen(false);
    Alert.alert("Success", "Payment recorded! Your balance has been updated.");
  };

  // --- Other Logic ---
  const handleVoteItinerary = async (index: number) => {
    if (!trip || !user) return;
    const newItinerary = [...trip.itinerary];
    const item = { ...newItinerary[index] };
    const votes = item.votes ? [...item.votes] : [];
    if (votes.includes(user.uid)) votes.splice(votes.indexOf(user.uid), 1);
    else votes.push(user.uid);
    item.votes = votes;
    newItinerary[index] = item;
    await updateDoc(doc(db, "trips", id!), { itinerary: newItinerary });
  };

  const handleAddActivity = async () => {
    if (!actTitle || !actDay) return;
    const newActivity: DayPlan = {
      day: parseInt(actDay),
      title: actTitle,
      activity: actDesc || "New activity",
      cost: parseInt(actCost) || 0,
      votes: [user?.uid || ""],
    };
    const newItinerary = [...(trip.itinerary || []), newActivity].sort(
      (a, b) => a.day - b.day
    );
    await updateDoc(doc(db, "trips", id!), { itinerary: newItinerary });
    setActDay("");
    setActTitle("");
    setActDesc("");
    setActCost("");
    setSheetOpen(false);
  };

  const handleAddPoll = async () => {
    if (!pollQuestion.trim()) return;
    const options = [
      { label: "Yes", votes: [] },
      { label: "No", votes: [] },
    ];
    await addDoc(collection(db, "trips", id!, "polls"), {
      question: pollQuestion,
      options,
      createdAt: serverTimestamp(),
    });
    setPollQuestion("");
    setSheetOpen(false);
  };

  const handleVotePoll = async (poll: Poll, optionIndex: number) => {
    if (!user) return;
    const newOptions = [...poll.options];
    const option = { ...newOptions[optionIndex] };
    newOptions.forEach((opt) => {
      if (opt.votes.includes(user.uid))
        opt.votes = opt.votes.filter((uid) => uid !== user.uid);
    });
    option.votes.push(user.uid);
    newOptions[optionIndex] = option;
    await updateDoc(doc(db, "trips", id!, "polls", poll.id), {
      options: newOptions,
    });
  };

  const handleSnapReceipt = async () => {
    if (!permission?.granted) {
      const permissionResponse = await requestPermission();
      if (!permissionResponse.granted) return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.5,
      });
      if (!result.canceled) {
        setLocalImageUri(result.assets[0].uri);
        const data = await mockScanReceipt(result.assets[0].uri);
        setExpenseAmount(data.amount.toString());
        setExpenseTitle(data.merchant);
      }
    } catch (error) {
      Alert.alert("Camera Error", "Simulator?", [{ text: "OK" }]);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseTitle || !expenseAmount) return;
    setIsUploading(true);
    let downloadUrl = null;
    if (localImageUri) downloadUrl = await uploadImageAsync(localImageUri);
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

  const openSheet = (mode: "expense" | "activity" | "poll" | "settle") => {
    setSheetMode(mode);
    setSheetOpen(true);
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

          {/* === ITINERARY TAB === */}
          <Tabs.Content value="itinerary" flex={1}>
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            >
              <XStack
                justifyContent="space-between"
                alignItems="center"
                marginBottom="$4"
              >
                <YStack>
                  <H4>
                    {trip.startCity} ➝ {trip.endCity}
                  </H4>
                  <Paragraph color="$gray10">
                    {trip.days} Days • {trip.people} Travelers
                  </Paragraph>
                </YStack>
                <Button
                  icon={Share2}
                  circular
                  size="$3"
                  onPress={handleShare}
                />
              </XStack>

              <XStack space="$2" marginBottom="$4">
                <Button
                  flex={1}
                  themeInverse
                  icon={Plus}
                  onPress={() => openSheet("activity")}
                >
                  Add Stop
                </Button>
                <Button
                  flex={1}
                  icon={HelpCircle}
                  onPress={() => openSheet("poll")}
                >
                  New Poll
                </Button>
              </XStack>

              {polls.length > 0 && (
                <YStack space="$3" marginBottom="$4">
                  <Text fontWeight="bold" fontSize="$5">
                    Active Polls
                  </Text>
                  {polls.map((poll) => (
                    <Card key={poll.id} bordered padding="$3">
                      <Text fontWeight="600" marginBottom="$2">
                        {poll.question}
                      </Text>
                      <XStack space="$2">
                        {poll.options.map((opt, idx) => {
                          const isSelected = opt.votes.includes(
                            user?.uid || ""
                          );
                          return (
                            <Button
                              key={idx}
                              flex={1}
                              size="$2"
                              theme={isSelected ? "active" : undefined}
                              icon={idx === 0 ? CheckCircle2 : XCircle}
                              onPress={() => handleVotePoll(poll, idx)}
                            >
                              {`${opt.label} (${opt.votes.length})`}
                            </Button>
                          );
                        })}
                      </XStack>
                    </Card>
                  ))}
                  <Separator />
                </YStack>
              )}

              {trip.itinerary?.map((item: DayPlan, index: number) => {
                const voteCount = item.votes?.length || 0;
                const iVoted = item.votes?.includes(user?.uid || "");
                return (
                  <Card key={index} bordered padding="$3" marginBottom="$3">
                    <XStack
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <YStack flex={1} marginRight="$2">
                        <XStack
                          alignItems="center"
                          space="$2"
                          marginBottom="$1"
                        >
                          <Card
                            backgroundColor="$blue3"
                            paddingHorizontal="$2"
                            borderRadius="$2"
                          >
                            <Text
                              fontSize={10}
                              color="$blue10"
                              fontWeight="bold"
                            >
                              DAY {item.day}
                            </Text>
                          </Card>
                          <Text fontWeight="bold" fontSize="$4">
                            {item.title}
                          </Text>
                        </XStack>
                        <Text color="$gray11" fontSize="$3">
                          {item.activity}
                        </Text>
                      </YStack>
                      <YStack alignItems="flex-end" space="$2">
                        <Text color="$green10" fontWeight="bold">
                          ${item.cost}
                        </Text>
                        <Button
                          size="$2"
                          circular
                          icon={ThumbsUp}
                          theme={iVoted ? "active" : "alt1"}
                          onPress={() => handleVoteItinerary(index)}
                        >
                          {voteCount > 0 ? `${voteCount}` : ""}
                        </Button>
                      </YStack>
                    </XStack>
                  </Card>
                );
              })}
            </ScrollView>
          </Tabs.Content>

          {/* === BUDGET TAB === */}
          <Tabs.Content value="budget" flex={1}>
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            >
              <Card
                bordered
                padding="$4"
                marginBottom="$4"
                backgroundColor="$background"
              >
                <XStack alignItems="center" space="$3" marginBottom="$3">
                  <Avatar circular size="$4" backgroundColor="$blue5">
                    <Wallet size={20} color="$blue10" />
                  </Avatar>
                  <YStack>
                    <H4>Smart Split</H4>
                    <Text fontSize={12} color="$gray10">
                      {trip.people} Travelers • Fair Share: $
                      {fairShare.toFixed(2)}
                    </Text>
                  </YStack>
                </XStack>
                <Separator marginBottom="$3" />
                <XStack
                  space="$3"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <YStack>
                    <Text fontSize={11} color="$gray10">
                      YOU PAID
                    </Text>
                    <Text fontSize="$6" fontWeight="bold">
                      ${myExpenses.toFixed(2)}
                    </Text>
                  </YStack>
                  <YStack alignItems="flex-end">
                    <Text fontSize={11} color="$gray10">
                      {balance >= 0 ? "YOU ARE OWED" : "YOU OWE"}
                    </Text>
                    <Text
                      fontSize="$6"
                      fontWeight="bold"
                      color={balance >= 0 ? "$green10" : "$red10"}
                    >
                      ${Math.abs(balance).toFixed(2)}
                    </Text>
                  </YStack>
                </XStack>

                {balance > 1 && (
                  <Button
                    marginTop="$3"
                    themeInverse
                    icon={ArrowUpRight}
                    onPress={() => openSheet("settle")}
                  >
                    Settle Up (${Math.abs(balance).toFixed(2)})
                  </Button>
                )}
                {balance <= 1 && balance >= -1 && totalSpent > 0 && (
                  <XStack
                    marginTop="$3"
                    alignItems="center"
                    space="$2"
                    justifyContent="center"
                  >
                    <CheckCircle2 color="$green10" size={16} />
                    <Text color="$green10" fontWeight="bold">
                      All Settled
                    </Text>
                  </XStack>
                )}
              </Card>

              <YStack marginBottom="$4" space="$2">
                <XStack justifyContent="space-between">
                  <Text fontSize={12} color="$gray10">
                    Total Budget
                  </Text>
                  <Text fontSize={12} fontWeight="bold">
                    {Math.min(budgetProgress, 100).toFixed(0)}%
                  </Text>
                </XStack>
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
                  onPress={() => openSheet("expense")}
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
                          {exp.payer === user?.uid
                            ? "Paid by You"
                            : "Paid by Friend"}
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

        {/* === UNIVERSAL SHEET === */}
        <Sheet
          modal
          open={isSheetOpen}
          onOpenChange={setSheetOpen}
          snapPoints={[65]}
          dismissOnSnapToBottom
        >
          <Sheet.Overlay />
          <Sheet.Frame padding="$4" space="$4">
            <Sheet.Handle />

            {sheetMode === "expense" && (
              <>
                <H4>Log Expense</H4>
                <Button
                  size="$4"
                  theme="active"
                  icon={Camera}
                  onPress={handleSnapReceipt}
                >
                  {localImageUri ? "Retake" : "Scan Receipt (AI)"}
                </Button>
                <YStack space="$2">
                  <Label>Description</Label>
                  <Input value={expenseTitle} onChangeText={setExpenseTitle} />
                </YStack>
                <YStack space="$2">
                  <Label>Amount ($)</Label>
                  <Input
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
              </>
            )}

            {sheetMode === "activity" && (
              <>
                <H4>New Stop</H4>
                <XStack space="$2">
                  <YStack flex={1}>
                    <Label>Day</Label>
                    <Input
                      keyboardType="numeric"
                      value={actDay}
                      onChangeText={setActDay}
                    />
                  </YStack>
                  <YStack flex={2}>
                    <Label>Cost ($)</Label>
                    <Input
                      keyboardType="numeric"
                      value={actCost}
                      onChangeText={setActCost}
                    />
                  </YStack>
                </XStack>
                <YStack space="$2">
                  <Label>Title</Label>
                  <Input value={actTitle} onChangeText={setActTitle} />
                </YStack>
                <YStack space="$2">
                  <Label>Details</Label>
                  <Input value={actDesc} onChangeText={setActDesc} />
                </YStack>
                <Button themeInverse onPress={handleAddActivity} marginTop="$2">
                  Add Stop
                </Button>
              </>
            )}

            {sheetMode === "poll" && (
              <>
                <H4>Create Poll</H4>
                <YStack space="$2">
                  <Label>Question</Label>
                  <Input
                    placeholder="Where to eat?"
                    value={pollQuestion}
                    onChangeText={setPollQuestion}
                  />
                </YStack>
                <Button themeInverse onPress={handleAddPoll} marginTop="$2">
                  Start Voting
                </Button>
              </>
            )}

            {/* SIMPLIFIED SETTLE SHEET */}
            {sheetMode === "settle" && (
              <>
                <H4>Settle Up</H4>
                <Paragraph color="$gray10" marginBottom="$4">
                  You are owed ${Math.abs(balance).toFixed(2)}. Confirm that you
                  have received this payment.
                </Paragraph>

                <Button icon={Check} theme="active" onPress={handleMarkSettled}>
                  Mark as Paid
                </Button>
              </>
            )}
          </Sheet.Frame>
        </Sheet>
      </YStack>
    </>
  );
}

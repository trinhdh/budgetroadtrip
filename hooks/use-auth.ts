import { useState, useEffect } from "react";
import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { auth } from "@/firebaseConfig";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsLoaded(true);
      } else {
        // If no user, immediately sign them in anonymously
        signInAnonymously(auth).catch((err) => {
          console.error("Anonymous Auth Failed", err);
          // Optional: handle error state here
        });
      }
    });

    return () => unsub();
  }, []);

  return { user, isLoaded };
}

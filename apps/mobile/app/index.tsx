import { useEffect } from "react";
import { useRouter } from "expo-router";
import { tokenStorage } from "@/lib/storage";

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await tokenStorage.getToken();
    if (token) {
      router.replace("/(tabs)/workouts");
    } else {
      router.replace("/(auth)/login");
    }
  };

  return null;
}

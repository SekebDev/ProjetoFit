import { useEffect } from "react";
import { useRouter } from "expo-router";
import { tokenStorage } from "@/lib/storage";

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const token = await tokenStorage.getToken();
      router.replace(token ? "/(tabs)" : "/(auth)/login");
    }

    checkAuth();
  }, [router]);

  return null;
}

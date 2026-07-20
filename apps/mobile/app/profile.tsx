import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import {
  Card,
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
} from "@/components/ui";
import { useProfile } from "@/lib/hooks";
import { tokenStorage } from "@/lib/storage";
import { colors } from "@/lib/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { data: user, isLoading, error } = useProfile();
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    try {
      await tokenStorage.clear();
    } catch {
      // Sair com token no dispositivo e pior que nao sair: avisa e fica.
      setLogoutError("Nao foi possivel sair. Tente novamente.");
      return;
    }
    router.replace("/(auth)/login");
  };

  return (
    <Screen>
      <View className="flex-row items-center gap-2 border-b border-border-soft px-3 py-4">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          className="p-1 active:opacity-70"
        >
          <ChevronLeft color={colors.chalk} size={24} />
        </Pressable>
        <Text className="font-display text-2xl text-chalk">Perfil</Text>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : error || !user ? (
        <ErrorState message="Nao foi possivel carregar o perfil." />
      ) : (
        <View className="gap-4 p-4">
          <Card>
            <Text className="font-display text-xl text-text">
              {user.name ?? "Sem nome"}
            </Text>
            <Text className="mt-1 font-body text-sm text-muted">
              {user.email}
            </Text>
            <Text className="mt-4 font-mono text-xs text-muted-2">
              Na plataforma desde{" "}
              {new Date(user.createdAt).toLocaleDateString("pt-BR")}
            </Text>
          </Card>

          {logoutError ? (
            <Text
              accessibilityRole="alert"
              className="text-center font-body text-sm text-m-chest"
            >
              {logoutError}
            </Text>
          ) : null}

          <PrimaryButton
            label="Sair da conta"
            onPress={handleLogout}
            accessibilityLabel="Sair da conta"
          />
        </View>
      )}
    </Screen>
  );
}

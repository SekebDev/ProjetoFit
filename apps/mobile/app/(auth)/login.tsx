import { Text, TextInput, View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { z } from "zod";
import { api } from "@/lib/api";
import { tokenStorage } from "@/lib/storage";
import { getAuthErrorMessage } from "@/lib/errors";
import { PrimaryButton, Screen } from "@/components/ui";
import { colors } from "@/lib/theme";

// Espelha LoginSchema da API: senha so precisa nao estar vazia. Exigir mais
// aqui barraria contas antigas com senha curta.
const credentialsSchema = z.object({
  email: z.string().trim().min(1, "Informe seu email").email("Email invalido"),
  password: z.string().min(1, "Informe sua senha"),
});

// A API devolve AuthResponse: { token, user }. Nao existe refreshToken.
const authResponseSchema = z.object({
  token: z.string().min(1),
});

const inputClass =
  "rounded-xl border border-border bg-surface px-4 py-3.5 font-body text-text mb-4";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    const credentials = credentialsSchema.safeParse({ email, password });
    if (!credentials.success) {
      setError(credentials.error.issues[0].message);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/auth/login", credentials.data);
      const parsed = authResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        throw new Error("Resposta de login invalida.");
      }

      await tokenStorage.setToken(parsed.data.token);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View className="flex-1 justify-center px-6">
        <Text className="mb-1 font-display text-3xl text-chalk">
          Hipertrof.AI
        </Text>
        <Text className="mb-8 font-body text-muted">
          Faça login para começar
        </Text>

        {error ? (
          <Text
            accessibilityRole="alert"
            className="mb-4 text-center font-body text-m-chest"
          >
            {error}
          </Text>
        ) : null}

        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.muted2}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          accessibilityLabel="Email"
          className={inputClass}
        />

        <TextInput
          placeholder="Senha"
          placeholderTextColor={colors.muted2}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
          autoCapitalize="none"
          autoComplete="current-password"
          accessibilityLabel="Senha"
          className={`${inputClass} mb-6`}
        />

        <PrimaryButton
          label={loading ? "Carregando..." : "Entrar"}
          onPress={handleLogin}
          disabled={loading}
        />

        <Text className="mt-4 text-center font-body text-sm text-muted">
          Ainda não tem conta?{" "}
          <Text
            accessibilityRole="link"
            className="font-body-semibold text-chalk"
            onPress={() => router.push("/(auth)/signup")}
          >
            Crie uma
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

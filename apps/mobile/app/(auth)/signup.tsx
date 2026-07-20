import { Text, TextInput, View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { z } from "zod";
import { api } from "@/lib/api";
import { tokenStorage } from "@/lib/storage";
import { getAuthErrorMessage } from "@/lib/errors";
import { PrimaryButton, Screen } from "@/components/ui";
import { colors } from "@/lib/theme";

// Espelha RegisterSchema da API: senha entre 8 e 72 (bcrypt trunca em 72),
// nome ate 80. O nome e opcional no servidor, mas pedimos aqui porque e ele
// que aparece no ranking dos grupos.
const signupSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(80, "Nome muito longo"),
  email: z.string().trim().min(1, "Informe seu email").email("Email invalido"),
  password: z
    .string()
    .min(8, "A senha precisa de ao menos 8 caracteres")
    .max(72, "A senha pode ter no maximo 72 caracteres"),
});

// A API devolve AuthResponse: { token, user }. Nao existe refreshToken.
const authResponseSchema = z.object({
  token: z.string().min(1),
});

const inputClass =
  "rounded-xl border border-border bg-surface px-4 py-3.5 font-body text-text mb-4";

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    const input = signupSchema.safeParse({ name, email, password });
    if (!input.success) {
      setError(input.error.issues[0].message);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/auth/register", input.data);
      const parsed = authResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        throw new Error("Resposta de cadastro invalida.");
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
          Criar conta
        </Text>
        <Text className="mb-8 font-body text-muted">
          Comece a treinar com método
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
          placeholder="Nome"
          placeholderTextColor={colors.muted2}
          value={name}
          onChangeText={setName}
          editable={!loading}
          autoComplete="name"
          accessibilityLabel="Nome"
          className={inputClass}
        />

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
          placeholder="Senha (min. 8 caracteres)"
          placeholderTextColor={colors.muted2}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
          autoCapitalize="none"
          autoComplete="new-password"
          accessibilityLabel="Senha"
          className={`${inputClass} mb-6`}
        />

        <PrimaryButton
          label={loading ? "Criando..." : "Criar conta"}
          onPress={handleSignup}
          disabled={loading}
        />

        <Text className="mt-4 text-center font-body text-sm text-muted">
          Já tem conta?{" "}
          <Text
            accessibilityRole="link"
            className="font-body-semibold text-chalk"
            onPress={() => router.replace("/(auth)/login")}
          >
            Entrar
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

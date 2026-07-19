import { View, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { z } from "zod";
import { api } from "@/lib/api";
import { tokenStorage } from "@/lib/storage";
import { getAuthErrorMessage } from "@/lib/errors";

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
      router.replace("/(tabs)/workouts");
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0e1014] px-6 justify-center">
      <Text className="text-white text-3xl font-bold mb-2">Criar conta</Text>
      <Text className="text-gray-400 mb-8">Comece a treinar com método</Text>

      {error ? (
        <Text
          accessibilityRole="alert"
          className="text-red-400 mb-4 text-center"
        >
          {error}
        </Text>
      ) : null}

      <TextInput
        placeholder="Nome"
        placeholderTextColor="#6b7280"
        value={name}
        onChangeText={setName}
        editable={!loading}
        autoComplete="name"
        accessibilityLabel="Nome"
        className="bg-gray-900 text-white px-4 py-3 rounded-lg mb-4 border border-gray-700"
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#6b7280"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        accessibilityLabel="Email"
        className="bg-gray-900 text-white px-4 py-3 rounded-lg mb-4 border border-gray-700"
      />

      <TextInput
        placeholder="Senha (min. 8 caracteres)"
        placeholderTextColor="#6b7280"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
        autoCapitalize="none"
        autoComplete="new-password"
        accessibilityLabel="Senha"
        className="bg-gray-900 text-white px-4 py-3 rounded-lg mb-6 border border-gray-700"
      />

      <Pressable
        onPress={handleSignup}
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: loading }}
        className="bg-purple-600 py-3 rounded-lg mb-4"
      >
        <Text className="text-white text-center font-semibold">
          {loading ? "Criando..." : "Criar conta"}
        </Text>
      </Pressable>

      <Text className="text-gray-400 text-center text-sm">
        Já tem conta?{" "}
        <Text
          accessibilityRole="link"
          className="text-purple-400 font-semibold"
          onPress={() => router.replace("/(auth)/login")}
        >
          Entrar
        </Text>
      </Text>
    </View>
  );
}

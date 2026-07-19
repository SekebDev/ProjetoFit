import { View, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { tokenStorage } from "@/lib/storage";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/api/auth/login", { email, password });

      await tokenStorage.setToken(data.token);
      if (data.refreshToken) {
        await tokenStorage.setRefreshToken(data.refreshToken);
      }

      router.replace("/(tabs)/workouts");
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0e1014] px-6 justify-center">
      <Text className="text-white text-3xl font-bold mb-2">Hipertrof.AI</Text>
      <Text className="text-gray-400 mb-8">Faça login para começar</Text>

      {error ? (
        <Text className="text-red-400 mb-4 text-center">{error}</Text>
      ) : null}

      <TextInput
        placeholder="Email"
        placeholderTextColor="#6b7280"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
        className="bg-gray-900 text-white px-4 py-3 rounded-lg mb-4 border border-gray-700"
      />

      <TextInput
        placeholder="Senha"
        placeholderTextColor="#6b7280"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
        className="bg-gray-900 text-white px-4 py-3 rounded-lg mb-6 border border-gray-700"
      />

      <Pressable
        onPress={handleLogin}
        disabled={loading}
        className="bg-purple-600 py-3 rounded-lg mb-4"
      >
        <Text className="text-white text-center font-semibold">
          {loading ? "Carregando..." : "Entrar"}
        </Text>
      </Pressable>

      <Text className="text-gray-400 text-center text-sm">
        Ainda não tem conta?{" "}
        <Text
          className="text-purple-400 font-semibold"
          onPress={() => router.push("/(auth)/signup")}
        >
          Crie uma
        </Text>
      </Text>
    </View>
  );
}

/**
 * Avatar do header que leva ao perfil — como no web, o perfil vive no canto do
 * cabecalho, nao numa aba. Busca o nome pra inicial e navega pra /profile.
 */
import { useRouter } from "expo-router";
import { useProfile } from "@/lib/hooks";
import { Avatar } from "./ui";

export function ProfileAvatar() {
  const router = useRouter();
  const { data: user } = useProfile();
  return (
    <Avatar name={user?.name ?? null} onPress={() => router.push("/profile")} />
  );
}

/**
 * Primitivos de UI portados de apps/web — a fonte de verdade visual. Cartoes de
 * superficie, botao primario "giz" (chalk sobre preto), pilulas e estados de
 * carregamento/erro/vazio. Todo o resto da UI mobile e composto a partir daqui,
 * pra nao reinventar cor/tipografia em cada tela.
 */
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, muscleColors } from "@/lib/theme";
import type { MuscleGroup } from "@/lib/types";

/** Fundo da app + area segura. Toda tela raiz comeca por aqui. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {children}
    </SafeAreaView>
  );
}

interface HeaderProps {
  title: string;
  /** Slot a direita — no app, o avatar que leva ao perfil. */
  right?: ReactNode;
}

/** Cabecalho de tela: wordmark/titulo em fonte display, com slot a direita. */
export function Header({ title, right }: HeaderProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-border-soft px-5 py-4">
      <Text className="font-display text-2xl text-chalk">{title}</Text>
      {right}
    </View>
  );
}

/** Cartao de superficie — o container padrao de conteudo, igual ao web. */
export function Card({
  children,
  className = "",
  ...rest
}: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-2xl border border-border bg-surface p-4 ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** Botao primario: giz com texto preto — a acao principal, como no web. */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      className={`rounded-xl bg-chalk py-3.5 active:opacity-80 ${disabled ? "opacity-50" : ""}`}
    >
      <Text className="text-center font-body-semibold text-base text-bg">
        {label}
      </Text>
    </Pressable>
  );
}

/** Pilula/etiqueta — estado "ativo", contagem de dias, fonte do plano. */
export function Pill({
  label,
  tint,
}: {
  label: string;
  /** Cor de fundo opcional (ex.: anilha do grupo muscular). */
  tint?: string;
}) {
  return (
    <View
      className="rounded-full px-2.5 py-1"
      style={{ backgroundColor: tint ?? colors.surface2 }}
    >
      <Text
        className="font-mono text-[11px] uppercase tracking-wide"
        style={{ color: tint ? colors.bg : colors.muted }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Ponto colorido da anilha do grupo muscular — o unico uso semantico de cor. */
export function MuscleDot({ group }: { group: MuscleGroup }) {
  return (
    <View
      className="h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: muscleColors[group] }}
    />
  );
}

/** Avatar de inicial — giz com texto preto, como o header do web. */
export function Avatar({
  name,
  onPress,
}: {
  name: string | null;
  onPress?: () => void;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Abrir perfil"
      className="h-9 w-9 items-center justify-center rounded-full bg-chalk active:opacity-80"
    >
      <Text className="font-display text-sm text-bg">{initial}</Text>
    </Pressable>
  );
}

/** Spinner centralizado — estado de carregamento padrao. */
export function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator size="large" color={colors.chalk} />
    </View>
  );
}

/** Mensagem de erro acessivel e centralizada. */
export function ErrorState({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-bg px-6">
      <Text
        accessibilityRole="alert"
        className="text-center font-body text-m-chest"
      >
        {message}
      </Text>
    </View>
  );
}

/** Estado vazio — titulo forte + subtexto discreto, sem parecer erro. */
export function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-16">
      <Text className="text-center font-body-semibold text-base text-text">
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-1 text-center font-body text-sm text-muted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

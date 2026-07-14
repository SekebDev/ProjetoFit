import { z } from "zod";

/** Registro de novo usuário (auth multi-usuário). */
export const RegisterSchema = z.object({
  email: z.email(),
  // bcrypt trunca em 72 bytes; limitamos para evitar surpresas.
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(80).nullable().optional(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

/** Login por e-mail + senha. */
export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

/** Usuário exposto ao cliente (sem hash de senha). */
export const PublicUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().nullable(),
  createdAt: z.string(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

/** Envelope de autenticação: JWT + usuário público. */
export const AuthResponseSchema = z.object({
  token: z.string(),
  user: PublicUserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

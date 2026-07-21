import { describe, expect, it, vi } from "vitest";
import { ProfileService } from "./profile.service";

const baseRow = {
  id: "p1",
  userId: "u1",
  birthYear: 1990,
  heightCm: 180,
  weightKg: 80,
  goal: "HYPERTROPHY",
  experience: "INTERMEDIATE",
  daysPerWeek: 4,
  sessionMin: 60,
  focusAreas: ["UPPER"],
  equipment: ["BARBELL"],
  injuries: null,
  dopamineMode: true,
  dopamineGames: ["FLAPPY"],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ProfileService", () => {
  it("get retorna null quando não há perfil", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const service = new ProfileService({ profile: { findUnique } } as never);
    expect(await service.get("u1")).toBeNull();
  });

  it("upsert persiste pelo userId e serializa updatedAt como ISO", async () => {
    const upsert = vi.fn().mockResolvedValue(baseRow);
    const service = new ProfileService({ profile: { upsert } } as never);
    const res = await service.upsert("u1", {
      birthYear: null,
      heightCm: null,
      weightKg: null,
      goal: "HYPERTROPHY",
      experience: "INTERMEDIATE",
      daysPerWeek: 4,
      sessionMin: null,
      focusAreas: ["UPPER"],
      equipment: ["BARBELL"],
      injuries: null,
      dopamineMode: false,
      dopamineGames: [],
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } }),
    );
    expect(typeof res.updatedAt).toBe("string");
    expect(res.goal).toBe("HYPERTROPHY");
    // Modo Dopamina sobrevive a ida-e-volta pelo mapper.
    expect(res.dopamineMode).toBe(true);
    expect(res.dopamineGames).toEqual(["FLAPPY"]);
  });
});

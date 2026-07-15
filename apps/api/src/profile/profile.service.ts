import { Injectable } from "@nestjs/common";
import type { Profile as PrismaProfile } from "@prisma/client";
import type { Profile, UpdateProfileInput } from "@workout/shared";
import { PrismaService } from "../prisma/prisma.service";

function toProfile(row: PrismaProfile): Profile {
  return {
    id: row.id,
    userId: row.userId,
    birthYear: row.birthYear,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    goal: row.goal as Profile["goal"],
    experience: row.experience as Profile["experience"],
    daysPerWeek: row.daysPerWeek,
    sessionMin: row.sessionMin,
    focusAreas: row.focusAreas as Profile["focusAreas"],
    equipment: row.equipment as Profile["equipment"],
    injuries: row.injuries,
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<Profile | null> {
    const row = await this.prisma.profile.findUnique({ where: { userId } });
    return row ? toProfile(row) : null;
  }

  async upsert(userId: string, input: UpdateProfileInput): Promise<Profile> {
    const row = await this.prisma.profile.upsert({
      where: { userId },
      create: { userId, ...input },
      update: { ...input },
    });
    return toProfile(row);
  }
}

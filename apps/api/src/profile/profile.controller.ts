import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import {
  UpdateProfileSchema,
  type Profile,
  type UpdateProfileInput,
} from "@workout/shared";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ProfileService } from "./profile.service";

@Controller("profile")
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  get(@CurrentUser() user: AuthUser): Promise<Profile | null> {
    return this.profile.get(user.userId);
  }

  @Put()
  update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: UpdateProfileInput,
  ): Promise<Profile> {
    return this.profile.upsert(user.userId, body);
  }
}

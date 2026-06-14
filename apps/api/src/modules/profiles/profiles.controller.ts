import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OAuthProfileDto } from './oauth-profile.dto';
import { ProfilesService } from './profiles.service';
import { SaveMemoryDto } from './save-memory.dto';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':userId/summary')
  getSummary(@Param('userId') userId: string) {
    return this.profilesService.getSummary(userId);
  }

  @Post('oauth/normalize')
  normalizeOAuthProfile(@Body() dto: OAuthProfileDto) {
    return this.profilesService.normalizeOAuthProfile(dto);
  }

  @Post(':userId/memories')
  saveMemory(@Param('userId') userId: string, @Body() dto: SaveMemoryDto) {
    return this.profilesService.saveConfirmedMemory(userId, dto);
  }
}

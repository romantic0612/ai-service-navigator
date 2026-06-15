import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AssistantMessageDto } from './assistant.dto';
import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('message')
  reply(@Body() dto: AssistantMessageDto) {
    return this.assistantService.reply(dto.userId, dto.message);
  }

  @Get('opening/:userId')
  opening(@Param('userId') userId: string) {
    return this.assistantService.opening(userId);
  }
}

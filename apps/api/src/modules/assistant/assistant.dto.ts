import { IsOptional, IsString } from 'class-validator';

export class AssistantMessageDto {
  @IsString()
  userId: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

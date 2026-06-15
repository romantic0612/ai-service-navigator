import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class RecordEventDto {
  @IsString()
  @IsIn(['open_service', 'view_service', 'open_asset'])
  eventType: string;

  @IsOptional()
  @IsString()
  serviceItemId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

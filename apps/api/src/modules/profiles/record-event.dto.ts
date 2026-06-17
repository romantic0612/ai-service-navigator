import { IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class RecordEventDto {
  @IsString()
  @IsIn(['app_open', 'open_service', 'view_service', 'open_asset', 'no_result', 'secondary_auth_issue', 'help_feedback'])
  eventType: string;

  @IsOptional()
  @IsString()
  serviceItemId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  queryText?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;
}

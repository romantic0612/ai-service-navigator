import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SaveMemoryDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  sensitivity?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsBoolean()
  needConfirm?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

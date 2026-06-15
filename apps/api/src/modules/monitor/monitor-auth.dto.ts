import { IsOptional, IsString } from 'class-validator';

export class MonitorLoginDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  accessCode?: string;
}

export class MonitorAuthStatusDto {
  authorized!: boolean;
  userId?: string;
  userName?: string;
  expireAt?: string;
}

export class MonitorAuthLoginDto {
  authorized!: boolean;
  userId?: string;
  expireAt?: string;
  message?: string;
}

export class MonitorAuthSessionDto {
  authorized!: boolean;
  userId?: string;
  expireAt?: string;
}

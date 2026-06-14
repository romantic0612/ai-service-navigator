import { IsArray, IsObject, IsString } from 'class-validator';

export class OAuthProfileDto {
  @IsString()
  id: string;

  @IsArray()
  @IsObject({ each: true })
  attributes: Record<string, string>[];
}

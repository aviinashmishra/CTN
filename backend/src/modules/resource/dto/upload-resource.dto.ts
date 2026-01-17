import { IsNotEmpty, IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ResourceType } from '../../../entities/resource.entity';

export class UploadResourceDto {
  @IsNotEmpty()
  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  department: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  batch: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsNotEmpty()
  @IsString()
  fileUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
import { IsUUID, IsOptional } from 'class-validator';

export class BrowseHierarchyDto {
  @IsUUID()
  collegeId: string;

  @IsOptional()
  resourceType?: string;

  @IsOptional()
  department?: string;

  @IsOptional()
  batch?: string;
}
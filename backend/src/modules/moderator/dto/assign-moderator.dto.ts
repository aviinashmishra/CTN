import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AssignModeratorDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsString()
  @IsUUID()
  collegeId: string;
}
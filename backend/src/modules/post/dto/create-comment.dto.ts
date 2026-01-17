import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsMongoId } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Comment cannot be empty' })
  @MaxLength(1000, { message: 'Comment must not exceed 1000 characters' })
  content: string;

  @IsMongoId()
  @IsOptional()
  parentCommentId?: string;
}

import { IsNumber, IsOptional, Min } from 'class-validator';

export class UnlockResourceDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  paymentAmount?: number = 10.00;
}

import { IsString, IsNumber, IsOptional } from 'class-validator';

export class VoucherItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @IsNumber()
  @IsOptional()
  totalPrice?: number;
}

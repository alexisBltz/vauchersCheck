
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherItemDto } from './vaucher-item.dto';

export class ExtractedVoucherDataDto {
  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  transactionDate?: string;

  @IsString()
  @IsOptional()
  transactionNumber?: string;

  @IsString()
  @IsOptional()
  merchantName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VoucherItemDto)
  @IsOptional()
  items?: VoucherItemDto[];

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  rawText: string;
}
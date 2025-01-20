
import { IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ExtractedVoucherDataDto } from './extracted-voucher-data.dto';

export class SaveVoucherDataDto {
  @IsUrl()
  imageUrl: string;

  @ValidateNested()
  @Type(() => ExtractedVoucherDataDto)
  extractedData: ExtractedVoucherDataDto;
}

// src/vouchers/interfaces/extracted-voucher-data.interface.ts
export interface IVoucherItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface IExtractedVoucherData {
  amount?: number;
  transactionDate?: string;
  transactionNumber?: string;
  merchantName?: string;
  items?: IVoucherItem[];
  totalAmount?: number;
  taxAmount?: number;
  currency?: string;
  rawText: string;
}
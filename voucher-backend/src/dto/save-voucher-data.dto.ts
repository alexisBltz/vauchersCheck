
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
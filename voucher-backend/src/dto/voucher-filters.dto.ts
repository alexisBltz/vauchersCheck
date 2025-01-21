export class VoucherFiltersDto {
  merchantName?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  status?: boolean;
}
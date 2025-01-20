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
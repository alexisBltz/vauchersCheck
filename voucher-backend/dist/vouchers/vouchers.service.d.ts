import { Multer } from 'multer';
import { IExtractedVoucherData } from '../interfaces/extracted-voucher-data.interface';
import { SaveVoucherDataDto } from '../dto/save-voucher-data.dto';
export declare class VouchersService {
    private client;
    private supabase;
    private tokenizer;
    private lngDetector;
    private stemmer;
    uploadImageToBucket(file: Multer.File): Promise<string>;
    extractData(imageUrl: string): Promise<IExtractedVoucherData>;
    private extractAmount;
    private extractDate;
    private convertSpanishMonth;
    private extractTransactionNumber;
    private extractMerchantName;
    private extractItems;
    private processTextWithNLP;
    saveData(data: SaveVoucherDataDto): Promise<{
        status: string;
        data: any[];
        message?: undefined;
    } | {
        status: string;
        message: string;
        data?: undefined;
    }>;
}

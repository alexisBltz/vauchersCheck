import { Multer } from 'multer';
import { IExtractedVoucherData } from '../interfaces/extracted-voucher-data.interface';
import { SaveVoucherDataDto } from '../dto/save-voucher-data.dto';
export declare class VouchersService {
    private client;
    private supabase;
    private tokenizer;
    private lngDetector;
    private stemmer;
    private classifier;
    constructor();
    private initializeClassifier;
    extractData(imageUrl: string): Promise<IExtractedVoucherData>;
    private processTextWithNLP;
    private extractAmount;
    private extractDate;
    private extractMerchantName;
    private convertSpanishMonth;
    private extractTransactionNumber;
    private extractItems;
    private detectTextUsingVision;
    saveData(data: SaveVoucherDataDto): Promise<{
        status: string;
        data: any[];
        message?: undefined;
    } | {
        status: string;
        message: string;
        data?: undefined;
    }>;
    getAllVouchers(): Promise<any[]>;
    uploadImageToBucket(file: Multer.File): Promise<string>;
}

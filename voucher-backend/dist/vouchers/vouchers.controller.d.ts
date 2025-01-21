import { VouchersService } from './vouchers.service';
import { Multer } from 'multer';
import { SaveVoucherDataDto } from '../dto/save-voucher-data.dto';
import { IExtractedVoucherData } from '../interfaces/extracted-voucher-data.interface';
export declare class VouchersController {
    private readonly vouchersService;
    constructor(vouchersService: VouchersService);
    uploadImage(file: Multer.File): Promise<{
        message: string;
        imageUrl: string;
        status: string;
    }>;
    extractText(imageUrl: string): Promise<{
        message: string;
        data: IExtractedVoucherData;
        confidence: number;
        status: string;
    }>;
    saveData(data: SaveVoucherDataDto): Promise<{
        message: string;
        result: {
            status: string;
            data: any[];
            message?: undefined;
        } | {
            status: string;
            message: string;
            data?: undefined;
        };
        status: string;
    }>;
    private calculateConfidenceScore;
}

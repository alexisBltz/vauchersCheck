import { VouchersService } from './vouchers.service';
import { Multer } from 'multer';
export declare class VouchersController {
    private readonly vouchersService;
    constructor(vouchersService: VouchersService);
    uploadImage(file: Multer.File): Promise<{
        message: string;
        imageUrl: string;
    }>;
    extractText(imageUrl: string): Promise<{
        message: string;
        extractedData: string;
    }>;
    saveData(data: {
        imageUrl: string;
        extractedText: string;
    }): Promise<{
        message: string;
        result: any[];
    }>;
}

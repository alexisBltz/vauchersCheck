import { VouchersService } from './vouchers.service';
import { Multer } from 'multer';
export declare class VouchersController {
    private readonly vouchersService;
    constructor(vouchersService: VouchersService);
    uploadVoucher(file: Multer.File): Promise<{
        message: string;
        imageUrl: string;
        extractedData: string;
    }>;
}

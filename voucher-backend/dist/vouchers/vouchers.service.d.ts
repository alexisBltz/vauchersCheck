import { Multer } from 'multer';
export declare class VouchersService {
    private client;
    private supabase;
    uploadImageToBucket(file: Multer.File): Promise<string>;
    extractData(imageUrl: string): Promise<string>;
    saveData(data: {
        imageUrl: string;
        extractedText: string;
    }): Promise<{
        message: string;
        data: any[];
    }>;
}

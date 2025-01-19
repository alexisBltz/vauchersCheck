"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VouchersService = void 0;
const common_1 = require("@nestjs/common");
const vision_1 = require("@google-cloud/vision");
const supabase_js_1 = require("@supabase/supabase-js");
const node_fetch_1 = require("node-fetch");
let VouchersService = class VouchersService {
    constructor() {
        this.client = new vision_1.default.ImageAnnotatorClient({
            keyFilename: './src/token/vision.json',
        });
        this.supabase = (0, supabase_js_1.createClient)('https://jcharnofjlbhnqbrermk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjaGFybm9mamxiaG5xYnJlcm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcxNzA3NDcsImV4cCI6MjA1Mjc0Njc0N30.MvtFS7m0KixDox7ZytegoNuY8r9Id16M04ZjLeH2Jn8');
    }
    async uploadImageToBucket(file) {
        try {
            const fileName = `vouchers/${Date.now()}_${file.originalname}`;
            const { data, error } = await this.supabase.storage
                .from('imgvauchers')
                .upload(fileName, file.buffer, {
                contentType: file.mimetype,
            });
            if (error) {
                throw new common_1.BadRequestException(`Error uploading image: ${error.message}`);
            }
            const { data: urlData } = await this.supabase.storage
                .from('imgvauchers')
                .getPublicUrl(fileName);
            if (!urlData || !urlData.publicUrl) {
                throw new Error('Failed to get public URL');
            }
            return urlData.publicUrl;
        }
        catch (error) {
            console.error('Upload error:', error);
            throw new Error(`Failed to upload image to bucket: ${error.message}`);
        }
    }
    async extractData(imageUrl) {
        try {
            const response = await (0, node_fetch_1.default)(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            const imageBuffer = Buffer.from(await response.arrayBuffer());
            const [result] = await this.client.textDetection({
                image: { content: imageBuffer },
            });
            if (!result.fullTextAnnotation) {
                throw new Error('No se encontró texto en la imagen');
            }
            return result.fullTextAnnotation.text;
        }
        catch (error) {
            console.error('Error al extraer texto:', error);
            throw new Error(`Error al extraer texto de la imagen: ${error.message}`);
        }
    }
    async saveData(data) {
        try {
            const { data: insertedData, error } = await this.supabase
                .from('vouchersData')
                .insert([
                {
                    image_url: data.imageUrl,
                    extracted_text: data.extractedText,
                    created_at: new Date().toISOString(),
                    status: true,
                },
            ])
                .select();
            if (error) {
                throw new Error(`Error saving data to database: ${error.message}`);
            }
            return insertedData;
        }
        catch (error) {
            console.error('Save error:', error);
            throw new Error(`Failed to save extracted data: ${error.message}`);
        }
    }
};
exports.VouchersService = VouchersService;
exports.VouchersService = VouchersService = __decorate([
    (0, common_1.Injectable)()
], VouchersService);
//# sourceMappingURL=vouchers.service.js.map
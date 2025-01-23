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
const natural = require("natural");
const LanguageDetect = require("languagedetect");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let VouchersService = class VouchersService {
    constructor() {
        this.client = new vision_1.default.ImageAnnotatorClient({
            keyFilename: './src/token/vision.json',
        });
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        this.tokenizer = new natural.WordTokenizer();
        this.lngDetector = new LanguageDetect();
        this.stemmer = natural.PorterStemmer;
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
            const rawText = result.fullTextAnnotation.text;
            return this.processTextWithNLP(rawText);
        }
        catch (error) {
            console.error('Error al extraer texto:', error);
            throw new Error(`Error al extraer texto de la imagen: ${error.message}`);
        }
    }
    extractAmount(text) {
        const totalPatterns = [
            /TOTAL\s*S\/\s*(\d+[.,]\d{2})/i,
            /TOTAL\s*PEN\s*(\d+[.,]\d{2})/i,
            /IMPORTE\s*S\/\s*(\d+[.,]\d{2})/i,
            /MONTO\s*S\/\s*(\d+[.,]\d{2})/i
        ];
        for (const pattern of totalPatterns) {
            const match = text.match(pattern);
            if (match) {
                return parseFloat(match[1].replace(',', '.'));
            }
        }
        return undefined;
    }
    extractDate(text) {
        const datePatterns = [
            /FECHA:\s*(\d{2})([A-Za-z]{3})(\d{2})/i,
            /(\d{2})[-/](\d{2})[-/](\d{2,4})/,
            /(\d{2})([A-Za-z]{3})(\d{2,4})/
        ];
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                if (match[2].length === 3) {
                    const month = this.convertSpanishMonth(match[2]);
                    return `${match[1]}/${month}/${match[3]}`;
                }
                return match[0];
            }
        }
        return undefined;
    }
    convertSpanishMonth(month) {
        const months = {
            'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
            'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
            'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
        };
        return months[month.toUpperCase()] || '01';
    }
    extractTransactionNumber(text) {
        const refPatterns = [
            /REF:(\d+)/i,
            /REFERENCIA:(\d+)/i,
            /NRO\.?:(\d+)/i
        ];
        for (const pattern of refPatterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return undefined;
    }
    extractMerchantName(text) {
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('(')) {
                const match = lines[i].match(/(.+?)\s*\(/);
                if (match) {
                    return match[1].trim();
                }
            }
        }
        if (lines.length > 1 && !lines[1].includes('ID:')) {
            return lines[1].trim();
        }
        return undefined;
    }
    extractItems(text, totalAmount) {
        const items = [];
        if (totalAmount) {
            items.push({
                description: 'Total compra',
                quantity: 1,
                unitPrice: totalAmount,
                totalPrice: totalAmount
            });
        }
        return items;
    }
    async processTextWithNLP(text) {
        const amount = this.extractAmount(text);
        const extractedData = {
            amount,
            transactionDate: this.extractDate(text),
            transactionNumber: this.extractTransactionNumber(text),
            merchantName: this.extractMerchantName(text),
            items: this.extractItems(text, amount),
            totalAmount: amount,
            taxAmount: amount ? Math.round((amount * 0.18) * 100) / 100 : undefined,
            currency: 'PEN',
            rawText: text
        };
        return extractedData;
    }
    async saveData(data) {
        if (!data.imageUrl || !data.extractedData) {
            throw new Error("Datos incompletos: faltan imageUrl o extractedData");
        }
        try {
            const { data: insertedData, error } = await this.supabase
                .from('vouchersdata')
                .insert([
                {
                    image_url: data.imageUrl,
                    extracted_data: data.extractedData,
                    created_at: new Date().toISOString(),
                    status: true,
                },
            ])
                .select();
            if (error) {
                throw new Error(`Error saving data to database: ${error.message}`);
            }
            return { status: 'success', data: insertedData };
        }
        catch (error) {
            console.error('Save error:', error);
            return { status: 'error', message: error instanceof Error ? error.message : "Error desconocido" };
        }
    }
    async getAllVouchers() {
        const { data, error } = await this.supabase
            .from('vouchersdata')
            .select('id, image_url, extracted_data, created_at, status');
        if (error) {
            throw new Error(`Error fetching vouchers: ${error.message}`);
        }
        return data.map((voucher) => ({
            id: voucher.id,
            imageUrl: voucher.image_url,
            extractedData: voucher.extracted_data,
            createdAt: voucher.created_at,
            status: voucher.status,
        }));
    }
};
exports.VouchersService = VouchersService;
exports.VouchersService = VouchersService = __decorate([
    (0, common_1.Injectable)()
], VouchersService);
//# sourceMappingURL=vouchers.service.js.map
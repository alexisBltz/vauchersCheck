"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VouchersService = void 0;
const common_1 = require("@nestjs/common");
const vision_1 = require("@google-cloud/vision");
const supabase_js_1 = require("@supabase/supabase-js");
const node_fetch_1 = require("node-fetch");
const natural = require("natural");
const LanguageDetect = require("languagedetect");
const data_1 = require("../nlp/training/data");
let VouchersService = class VouchersService {
    constructor() {
        this.client = new vision_1.default.ImageAnnotatorClient({
            keyFilename: './src/token/vision.json',
        });
        this.supabase = (0, supabase_js_1.createClient)('https://jcharnofjlbhnqbrermk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjaGFybm9mamxiaG5xYnJlcm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcxNzA3NDcsImV4cCI6MjA1Mjc0Njc0N30.MvtFS7m0KixDox7ZytegoNuY8r9Id16M04ZjLeH2Jn8');
        this.tokenizer = new natural.WordTokenizer();
        this.lngDetector = new LanguageDetect();
        this.stemmer = natural.PorterStemmer;
        this.classifier = new natural.BayesClassifier();
        this.initializeClassifier().then(r => console.log('Classifier initialized'));
    }
    async initializeClassifier() {
        Object.entries(data_1.trainingData).forEach(([category, data]) => {
            data.examples.forEach(example => {
                this.classifier.addDocument(example.text, category);
            });
        });
        this.classifier.train();
    }
    async extractData(imageUrl) {
        try {
            const response = await (0, node_fetch_1.default)(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            const imageBuffer = Buffer.from(await response.arrayBuffer());
            const rawText = await this.detectTextUsingVision(imageBuffer);
            const cleanedText = rawText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            return this.processTextWithNLP(cleanedText);
        }
        catch (error) {
            console.error('Error al extraer texto:', error);
            throw new Error(`Error al extraer texto de la imagen: ${error.message}`);
        }
    }
    async processTextWithNLP(text) {
        const classification = this.classifier.classify(text);
        let amount;
        let transactionDate;
        let merchantName;
        if (classification === 'amount') {
            amount = this.extractAmount(text);
        }
        if (classification === 'date') {
            transactionDate = this.extractDate(text);
        }
        if (classification === 'merchant') {
            merchantName = this.extractMerchantName(text);
        }
        const extractedData = {
            amount,
            transactionDate,
            transactionNumber: this.extractTransactionNumber(text),
            merchantName,
            items: this.extractItems(text, amount),
            totalAmount: amount,
            taxAmount: amount ? Math.round((amount * 0.18) * 100) / 100 : undefined,
            currency: 'PEN',
            rawText: text,
        };
        return extractedData;
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
        const tokens = this.tokenizer.tokenize(text.toLowerCase());
        const index = tokens.findIndex(token => token.includes('total') || token.includes('importe'));
        if (index !== -1 && tokens[index + 1]?.match(/^\d+[.,]\d{2}$/)) {
            return parseFloat(tokens[index + 1].replace(',', '.'));
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
        const tokens = this.tokenizer.tokenize(text.toLowerCase());
        const index = tokens.findIndex(token => token.includes('fecha') || token.includes('día'));
        if (index !== -1 && tokens[index + 1]?.match(/^\d{2}[-/]\d{2}[-/]\d{2,4}$/)) {
            return tokens[index + 1];
        }
        return undefined;
    }
    extractMerchantName(text) {
        const merchantPattern = /Destino:?\s*([^\n]+)/i;
        const match = text.match(merchantPattern);
        if (match) {
            return match[1].trim();
        }
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.includes('Destino:')) {
                return line.replace(/Destino:?\s*/, '').trim();
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
            /REF:\s*(\d+)/i,
            /REFERENCIA:\s*(\d+)/i,
            /NRO\.?:\s*(\d+)/i,
            /\bTRANSACCIÓN:\s*(\d+)/i
        ];
        for (const pattern of refPatterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1];
            }
        }
        const tokens = this.tokenizer.tokenize(text.toLowerCase());
        const transactionKeywords = ['ref', 'referencia', 'nro', 'transacción'];
        for (let i = 0; i < tokens.length; i++) {
            if (transactionKeywords.includes(tokens[i])) {
                if (tokens[i + 1]?.match(/^\d+$/)) {
                    return tokens[i + 1];
                }
            }
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
        const lines = text.split('\n');
        lines.forEach(line => {
            const category = this.classifier.classify(line.toLowerCase());
            if (category === 'producto' || category === 'servicio') {
                items.push({
                    description: line.trim(),
                    quantity: 1,
                    unitPrice: totalAmount || 0,
                    totalPrice: totalAmount || 0
                });
            }
        });
        return items;
    }
    async detectTextUsingVision(imageBuffer) {
        try {
            const [result] = await this.client.textDetection({
                image: { content: imageBuffer },
            });
            if (!result.fullTextAnnotation) {
                throw new Error('No se encontró texto en la imagen');
            }
            return result.fullTextAnnotation.text;
        }
        catch (error) {
            console.error('Error al usar Google Vision:', error);
            throw new Error(`Error al detectar texto: ${error.message}`);
        }
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
};
exports.VouchersService = VouchersService;
exports.VouchersService = VouchersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], VouchersService);
//# sourceMappingURL=vouchers.service.js.map
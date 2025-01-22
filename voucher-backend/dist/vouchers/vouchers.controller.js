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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VouchersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const vouchers_service_1 = require("./vouchers.service");
const path = require("path");
const multer_1 = require("multer");
const save_voucher_data_dto_1 = require("../dto/save-voucher-data.dto");
const data_1 = require("../nlp/training/data");
let VouchersController = class VouchersController {
    constructor(vouchersService) {
        this.vouchersService = vouchersService;
    }
    async testPatterns() {
        const text = `
      10:38 AM
      yape
      ¡Yapeaste!
      S/50
      Ely F. Leguia O.
      21 ene. 2025 - 10:38 am
      N° de celular: *** *** 480
      Destino: Yape
      N° de operación: 06144082    `;
        const allPatterns = data_1.TrainingDataService.getAllPatterns();
        const results = {};
        for (const [category, patterns] of Object.entries(allPatterns)) {
            results[category] = [];
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                    results[category].push(match[1].trim());
                }
            }
        }
        return results;
    }
    async uploadImage(file) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        try {
            const imageUrl = await this.vouchersService.uploadImageToBucket(file);
            return {
                message: 'Image uploaded successfully',
                imageUrl,
                status: 'success'
            };
        }
        catch (error) {
            console.error('Error details:', error);
            throw new common_1.BadRequestException(`Error uploading file: ${error.message}`);
        }
    }
    async extractText(imageUrl) {
        if (!imageUrl) {
            throw new common_1.BadRequestException('Image URL is required');
        }
        try {
            const extractedData = await this.vouchersService.extractData(imageUrl);
            return {
                message: 'Text extracted and processed successfully',
                data: extractedData,
                confidence: this.calculateConfidenceScore(extractedData),
                status: 'success'
            };
        }
        catch (error) {
            console.error('Error details:', error);
            throw new common_1.BadRequestException(`Error extracting text: ${error.message}`);
        }
    }
    async saveData(data) {
        try {
            const result = await this.vouchersService.saveData(data);
            return {
                message: 'Data saved successfully',
                result,
                status: 'success'
            };
        }
        catch (error) {
            console.error('Error details:', error);
            throw new common_1.BadRequestException(`Error saving data: ${error.message}`);
        }
    }
    async getAllVouchers() {
        try {
            const vouchers = await this.vouchersService.getAllVouchers();
            return {
                message: 'Vouchers retrieved successfully',
                data: vouchers,
                status: 'success'
            };
        }
        catch (error) {
            console.error('Error details:', error);
            throw new common_1.BadRequestException(`Error retrieving vouchers: ${error.message}`);
        }
    }
    calculateConfidenceScore(data) {
        let score = 0;
        let totalFields = 0;
        if (data.amount) {
            score += 1;
            totalFields += 1;
        }
        if (data.transactionDate) {
            score += 1;
            totalFields += 1;
        }
        if (data.transactionNumber) {
            score += 1;
            totalFields += 1;
        }
        if (data.merchantName) {
            score += 1;
            totalFields += 1;
        }
        if (data.currency) {
            score += 1;
            totalFields += 1;
        }
        if (data.items && data.items.length > 0) {
            score += 2;
            totalFields += 2;
        }
        if (data.totalAmount) {
            score += 1;
            totalFields += 1;
        }
        if (data.taxAmount) {
            score += 1;
            totalFields += 1;
        }
        return totalFields > 0 ? (score / totalFields) * 100 : 0;
    }
};
exports.VouchersController = VouchersController;
__decorate([
    (0, common_1.Get)('patterns'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VouchersController.prototype, "testPatterns", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        fileFilter: (req, file, cb) => {
            const allowedExtensions = ['.png', '.jpg', '.jpeg'];
            const ext = path.extname(file.originalname).toLowerCase();
            if (allowedExtensions.includes(ext)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Invalid file type. Only .png, .jpg, .jpeg are allowed.'), false);
            }
        },
        limits: {
            fileSize: 5 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_a = typeof multer_1.Multer !== "undefined" && multer_1.Multer.File) === "function" ? _a : Object]),
    __metadata("design:returntype", Promise)
], VouchersController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Post)('extract'),
    __param(0, (0, common_1.Body)('imageUrl')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VouchersController.prototype, "extractText", null);
__decorate([
    (0, common_1.Post)('save'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [save_voucher_data_dto_1.SaveVoucherDataDto]),
    __metadata("design:returntype", Promise)
], VouchersController.prototype, "saveData", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VouchersController.prototype, "getAllVouchers", null);
exports.VouchersController = VouchersController = __decorate([
    (0, common_1.Controller)('vouchers'),
    __metadata("design:paramtypes", [vouchers_service_1.VouchersService])
], VouchersController);
//# sourceMappingURL=vouchers.controller.js.map
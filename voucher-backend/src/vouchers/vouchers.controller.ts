import { Controller, Post, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VouchersService } from './vouchers.service';
import * as path from 'path';
import { Multer } from 'multer';
import { SaveVoucherDataDto } from '../dto/save-voucher-data.dto';
import { IExtractedVoucherData } from '../interfaces/extracted-voucher-data.interface';


@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.png', '.jpg', '.jpeg'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Only .png, .jpg, .jpeg are allowed.'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const imageUrl = await this.vouchersService.uploadImageToBucket(file);
      return {
        message: 'Image uploaded successfully',
        imageUrl,
        status: 'success'
      };
    } catch (error) {
      console.error('Error details:', error);
      throw new BadRequestException(`Error uploading file: ${error.message}`);
    }
  }

  @Post('extract')
  async extractText(@Body('imageUrl') imageUrl: string) {
    if (!imageUrl) {
      throw new BadRequestException('Image URL is required');
    }

    try {
      const extractedData = await this.vouchersService.extractData(imageUrl);
      return {
        message: 'Text extracted and processed successfully',
        data: extractedData,
        confidence: this.calculateConfidenceScore(extractedData),
        status: 'success'
      };
    } catch (error) {
      console.error('Error details:', error);
      throw new BadRequestException(`Error extracting text: ${error.message}`);
    }
  }

  @Post('save')
  async saveData(@Body() data: SaveVoucherDataDto) {
    try {
      const result = await this.vouchersService.saveData(data);
      return {
        message: 'Data saved successfully',
        result,
        status: 'success'
      };
    } catch (error) {
      console.error('Error details:', error);
      throw new BadRequestException(`Error saving data: ${error.message}`);
    }
  }

  private calculateConfidenceScore(data: IExtractedVoucherData): number {
    let score = 0;
    let totalFields = 0;

    // Puntaje por cada campo extraído exitosamente
    if (data.amount) { score += 1; totalFields += 1; }
    if (data.transactionDate) { score += 1; totalFields += 1; }
    if (data.transactionNumber) { score += 1; totalFields += 1; }
    if (data.merchantName) { score += 1; totalFields += 1; }
    if (data.currency) { score += 1; totalFields += 1; }
    if (data.items && data.items.length > 0) { score += 2; totalFields += 2; }
    if (data.totalAmount) { score += 1; totalFields += 1; }
    if (data.taxAmount) { score += 1; totalFields += 1; }

    return totalFields > 0 ? (score / totalFields) * 100 : 0;
  }
}
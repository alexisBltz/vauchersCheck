import { Controller, Post, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VouchersService } from './vouchers.service';
import * as path from 'path';
import { Multer } from 'multer';

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
    }),
  )
  async uploadImage(@UploadedFile() file: Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const imageUrl = await this.vouchersService.uploadImageToBucket(file);
      return { message: 'Image uploaded successfully', imageUrl };
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
      return { message: 'Text extracted successfully', extractedData };
    } catch (error) {
      console.error('Error details:', error);
      throw new BadRequestException(`Error extracting text: ${error.message}`);
    }
  }

  @Post('save')
  async saveData(@Body() data: { imageUrl: string; extractedText: string }) {
    const { imageUrl, extractedText } = data;

    if (!imageUrl || !extractedText) {
      throw new BadRequestException('Image URL and extracted text are required');
    }

    try {
      const result = await this.vouchersService.saveData({ imageUrl, extractedText });
      return { message: 'Data saved successfully', result };
    } catch (error) {
      console.error('Error details:', error);
      throw new BadRequestException(`Error saving data: ${error.message}`);
    }
  }
}
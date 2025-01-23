import { Injectable, BadRequestException } from '@nestjs/common';
import vision from '@google-cloud/vision';
import { createClient } from '@supabase/supabase-js';
import { Multer } from 'multer';
import fetch from 'node-fetch';
import * as natural from 'natural';
import LanguageDetect = require('languagedetect');
import { IExtractedVoucherData, IVoucherItem } from '../interfaces/extracted-voucher-data.interface';
import { SaveVoucherDataDto } from '../dto/save-voucher-data.dto';
import { ExtractedVoucherDataDto } from '../dto/extracted-voucher-data.dto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

@Injectable()
export class VouchersService {
  private client = new vision.ImageAnnotatorClient({
    keyFilename: './src/token/vision.json',
  });
  private supabase = createClient(
    supabaseUrl,
    supabaseKey,
  );

  private tokenizer = new natural.WordTokenizer();
  private lngDetector = new LanguageDetect();
  private stemmer = natural.PorterStemmer;
  /**
   * Subir imagen al bucket de Supabase directamente desde el buffer.
   */
  async uploadImageToBucket(file: Multer.File): Promise<string> {
    try {
      const fileName = `vouchers/${Date.now()}_${file.originalname}`;

      const { data, error } = await this.supabase.storage
        .from('imgvauchers')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) {
        throw new BadRequestException(`Error uploading image: ${error.message}`);
      }

      const { data: urlData } = await this.supabase.storage
        .from('imgvauchers')
        .getPublicUrl(fileName);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload image to bucket: ${error.message}`);
    }
  }

  /**
   * Extraer y clasificar datos del voucher usando NLP
   */
  async extractData(imageUrl: string): Promise<IExtractedVoucherData> {
    try {
      const response = await fetch(imageUrl);
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
    } catch (error) {
      console.error('Error al extraer texto:', error);
      throw new Error(`Error al extraer texto de la imagen: ${error.message}`);
    }
  }
  ////////////////////////////////////////////GAA
  /**
   * Extraer monto usando NLP y expresiones regulares mejoradas
   */
  private extractAmount(text: string): number | undefined {
    // Buscar patrones específicos de monto total
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

  /**
   * Extraer fecha usando patrones específicos
   */
  private extractDate(text: string): string | undefined {
    const datePatterns = [
      /FECHA:\s*(\d{2})([A-Za-z]{3})(\d{2})/i,  // Formato: 09ENE25
      /(\d{2})[-/](\d{2})[-/](\d{2,4})/,        // Formato: DD/MM/YY
      /(\d{2})([A-Za-z]{3})(\d{2,4})/           // Formato: DDMMMYY
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2].length === 3) {
          // Convertir formato 09ENE25 a fecha estándar
          const month = this.convertSpanishMonth(match[2]);
          return `${match[1]}/${month}/${match[3]}`;
        }
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Convertir mes en español a número
   */
  private convertSpanishMonth(month: string): string {
    const months: { [key: string]: string } = {
      'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
    };
    return months[month.toUpperCase()] || '01';
  }

  /**
   * Extraer número de transacción
   */
  private extractTransactionNumber(text: string): string | undefined {
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

  /**
   * Extraer nombre del comercio
   */
  private extractMerchantName(text: string): string | undefined {
    const lines = text.split('\n');

    // Buscar línea que contenga el nombre del comercio
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('(')) {
        const match = lines[i].match(/(.+?)\s*\(/);
        if (match) {
          return match[1].trim();
        }
      }
    }

    // Backup: tomar la segunda línea si no se encuentra el patrón anterior
    if (lines.length > 1 && !lines[1].includes('ID:')) {
      return lines[1].trim();
    }

    return undefined;
  }

  /**
   * Extraer items del voucher
   */
  private extractItems(text: string, totalAmount: number | undefined): IVoucherItem[] {
    const items: IVoucherItem[] = [];

    // Si tenemos un monto total, lo agregamos como item
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
  /**
   * Procesar el texto usando técnicas de NLP
   */
  private async processTextWithNLP(text: string): Promise<IExtractedVoucherData> {
    const amount = this.extractAmount(text);

    const extractedData: IExtractedVoucherData = {
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

  /**
   * Guardar datos en Supabase
   */
  async saveData(data: SaveVoucherDataDto) {
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
    } catch (error) {
      console.error('Save error:', error);
      return { status: 'error', message: error instanceof Error ? error.message : "Error desconocido" };
    }
  }

  async getAllVouchers(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('vouchersdata')
      .select('id, image_url, extracted_data, created_at, status');

    if (error) {
      throw new Error(`Error fetching vouchers: ${error.message}`);
    }

    return data.map((voucher) => ({
      id: voucher.id,
      imageUrl: voucher.image_url,
      extractedData: voucher.extracted_data as ExtractedVoucherDataDto,
      createdAt: voucher.created_at,
      status: voucher.status,
    }));
  }


}

import { Injectable, BadRequestException } from '@nestjs/common';
import vision from '@google-cloud/vision';
import { createClient } from '@supabase/supabase-js';
import { Multer } from 'multer';
import fetch from 'node-fetch';
import * as natural from 'natural';
import LanguageDetect = require('languagedetect');
import { IExtractedVoucherData, IVoucherItem } from '../interfaces/extracted-voucher-data.interface';
import { SaveVoucherDataDto } from '../dto/save-voucher-data.dto';

@Injectable()
export class VouchersService {
  private client = new vision.ImageAnnotatorClient({
    keyFilename: './src/token/vision.json',
  });
  private supabase = createClient(
    'https://jcharnofjlbhnqbrermk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjaGFybm9mamxiaG5xYnJlcm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcxNzA3NDcsImV4cCI6MjA1Mjc0Njc0N30.MvtFS7m0KixDox7ZytegoNuY8r9Id16M04ZjLeH2Jn8',
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
  /**
   * Parsear una línea de item
   */
  private parseItemLine(match: RegExpMatchArray): IVoucherItem | null {
    try {
      return {
        description: match[2].trim(),
        quantity: parseFloat(match[1]),
        unitPrice: parseFloat(match[3].replace(',', '.')),
        totalPrice: parseFloat(match[1]) * parseFloat(match[3].replace(',', '.'))
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Guardar datos en Supabase
   */
  /**
   * Guardar datos en Supabase
   */
  async saveData(data: SaveVoucherDataDto) {
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

      return insertedData;
    } catch (error) {
      console.error('Save error:', error);
      throw new Error(`Failed to save extracted data: ${error.message}`);
    }
  }


  /**
   * Detectar el idioma del texto
   */
  private detectLanguage(text: string): string {
    const detection = this.lngDetector.detect(text, 1);
    return detection.length > 0 ? detection[0][0] : 'spanish'; // default to spanish
  }

  /**
   * Calcular nivel de confianza para un monto encontrado
   */
  private calculateAmountConfidence(amount: number, context: string): number {
    let confidence = 0;

    // Verificar si tiene formato típico de monto
    if (amount.toFixed(2).match(/\.\d{2}$/)) confidence += 0.3;

    // Verificar si está cerca de palabras clave
    const keywordsNearby = ['total', 'monto', 'pago', 's/', 'pen', 'soles'].some(
      keyword => context.toLowerCase().includes(keyword)
    );
    if (keywordsNearby) confidence += 0.4;

    // Verificar si el monto parece razonable
    if (amount > 0 && amount < 100000) confidence += 0.3;

    return confidence;
  }

  /**
   * Extraer fecha usando procesamiento contextual
   */

  /**
   * Calcular impuesto basado en el monto total
   */
  private calculateTax(amount: number | undefined): number | undefined {
    if (!amount) return undefined;
    return Math.round((amount * 0.18) * 100) / 100; // IGV 18%
  }


  /**
   * Extraer moneda del texto
   */
  private extractCurrency(text: string): string | undefined {
    const currencyPatterns = {
      PEN: [/soles/i, /pen/i, /s\/\./i],
      USD: [/dólares/i, /dolares/i, /usd/i, /\$/],
      EUR: [/euros/i, /eur/i, /€/]
    };

    for (const [currency, patterns] of Object.entries(currencyPatterns)) {
      if (patterns.some(pattern => text.match(pattern))) {
        return currency;
      }
    }

    return undefined;
  }

  /**
   * Normalizar formato de fecha
   */
  private normalizeDate(dateStr: string, language: string): string {
    // Implementar normalización de fecha según el idioma y formato deseado
    // Por ahora retornamos la fecha sin procesar
    return dateStr;
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
}

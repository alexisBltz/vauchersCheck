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
import { trainingData } from '../nlp/training/data';

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
  private classifier: natural.BayesClassifier;

  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.initializeClassifier().then(r => console.log('Classifier initialized'));
  }
  private async initializeClassifier() {
    // Inicializar con datos de entrenamiento
    Object.entries(trainingData).forEach(([category, data]) => {
      data.examples.forEach(example => {
        this.classifier.addDocument(example.text, category);
      });
    });

    this.classifier.train();
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

      const rawText = await this.detectTextUsingVision(imageBuffer);

      // Limpiar el texto
      const cleanedText = rawText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

      return this.processTextWithNLP(cleanedText);
    } catch (error) {
      console.error('Error al extraer texto:', error);
      throw new Error(`Error al extraer texto de la imagen: ${error.message}`);
    }
  }


  ////////////////////////////////////////////GAA

  /**
   * Procesar el texto usando técnicas de NLP
   */
  private async processTextWithNLP(text: string): Promise<IExtractedVoucherData> {
    // Usar el clasificador para obtener las categorías (monto, fecha, comercio, etc.)
    const classification = this.classifier.classify(text);

    let amount;
    let transactionDate;
    let merchantName;

    // Si el clasificador detecta que es un monto, busca el monto
    if (classification === 'amount') {
      amount = this.extractAmount(text);
    }

    // Si el clasificador detecta que es una fecha, busca la fecha
    if (classification === 'date') {
      transactionDate = this.extractDate(text);
    }

    // Si el clasificador detecta que es un comercio, busca el nombre del comercio
    if (classification === 'merchant') {
      merchantName = this.extractMerchantName(text);
    }

    // Crear el objeto de datos extraídos
    const extractedData: IExtractedVoucherData = {
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
  /**
   * Extraer monto usando NLP y expresiones regulares mejoradas
   */
  private extractAmount(text: string): number | undefined {
    // Buscar patrones específicos de monto total con regex
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

    // Si no se encuentra por regex, usar NLP para buscar términos similares
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const index = tokens.findIndex(token => token.includes('total') || token.includes('importe'));
    if (index !== -1 && tokens[index + 1]?.match(/^\d+[.,]\d{2}$/)) {
      return parseFloat(tokens[index + 1].replace(',', '.'));
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

    // Usar NLP para buscar términos relacionados con fecha
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const index = tokens.findIndex(token => token.includes('fecha') || token.includes('día'));
    if (index !== -1 && tokens[index + 1]?.match(/^\d{2}[-/]\d{2}[-/]\d{2,4}$/)) {
      return tokens[index + 1];
    }

    return undefined;
  }

  /**
   * Extraer nombre del comercio
   */
  private extractMerchantName(text: string): string | undefined {
    // Patrón para capturar el nombre después de "Destino:"
    const merchantPattern = /Destino:?\s*([^\n]+)/i;

    const match = text.match(merchantPattern);
    if (match) {
      // Retorna el nombre limpio
      return match[1].trim();
    }

    // Si no se encuentra, busca en líneas del texto
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('Destino:')) {
        return line.replace(/Destino:?\s*/, '').trim();
      }
    }

    return undefined; // Si no se encuentra ningún nombre
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
    // 1. Buscar con expresiones regulares patrones comunes
    const refPatterns = [
      /REF:\s*(\d+)/i,              // Formato REF:123456
      /REFERENCIA:\s*(\d+)/i,       // Formato REFERENCIA:123456
      /NRO\.?:\s*(\d+)/i,           // Formato NRO:123456
      /\bTRANSACCIÓN:\s*(\d+)/i     // Formato TRANSACCIÓN:123456
    ];

    for (const pattern of refPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // 2. Usar NLP para buscar palabras clave y extraer posibles números
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const transactionKeywords = ['ref', 'referencia', 'nro', 'transacción'];

    for (let i = 0; i < tokens.length; i++) {
      if (transactionKeywords.includes(tokens[i])) {
        // Verificar si el siguiente token es un número válido
        if (tokens[i + 1]?.match(/^\d+$/)) {
          return tokens[i + 1];
        }
      }
    }

    return undefined;
  }


  /**
   * Extraer items del voucher
   */
  private extractItems(text: string, totalAmount: number | undefined): IVoucherItem[] {
    const items: IVoucherItem[] = [];
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

  //////////////////////////////////////GAAAAAAAAAAAAAAAAAAAAAAAAA
  /**
   * Detectar texto en una imagen usando Google Vision
   */
  private async detectTextUsingVision(imageBuffer: Buffer): Promise<string> {
    try {
      const [result] = await this.client.textDetection({
        image: { content: imageBuffer },
      });

      if (!result.fullTextAnnotation) {
        throw new Error('No se encontró texto en la imagen');
      }

      return result.fullTextAnnotation.text;
    } catch (error) {
      console.error('Error al usar Google Vision:', error);
      throw new Error(`Error al detectar texto: ${error.message}`);
    }
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


}

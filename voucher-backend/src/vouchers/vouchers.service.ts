import { Injectable, BadRequestException } from '@nestjs/common';
import vision from '@google-cloud/vision';
import { createClient } from '@supabase/supabase-js';
import { Multer } from 'multer';
import fetch from 'node-fetch';

@Injectable()
export class VouchersService {
  private client = new vision.ImageAnnotatorClient({
    keyFilename: './src/token/vision.json',
  });
  private supabase = createClient(
    'https://jcharnofjlbhnqbrermk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjaGFybm9mamxiaG5xYnJlcm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcxNzA3NDcsImV4cCI6MjA1Mjc0Njc0N30.MvtFS7m0KixDox7ZytegoNuY8r9Id16M04ZjLeH2Jn8',
  );

  /**
   * Subir imagen al bucket de Supabase directamente desde el buffer.
   */
  async uploadImageToBucket(file: Multer.File): Promise<string> {
    try {
      const fileName = `vouchers/${Date.now()}_${file.originalname}`;

      // Subir el archivo
      const { data, error } = await this.supabase.storage
        .from('imgvauchers')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) {
        throw new BadRequestException(`Error uploading image: ${error.message}`);
      }

      // Obtener la URL pública
      const { data: urlData } = await this.supabase.storage
        .from('imgvauchers')
        .getPublicUrl(fileName);

      // Asegurarnos de que tenemos una URL absoluta
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Construir la URL completa
      const publicUrl = urlData.publicUrl;
      console.log('Generated URL:', publicUrl); // Para debugging

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload image to bucket: ${error.message}`);
    }
  }

  /**
   * Extraer texto de la imagen usando Google Vision API.
   */
  async extractData(imageUrl: string): Promise<string> {
    try {
      let imageBuffer: Buffer;

      if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) {
        // Si es una URL o data URL, descargamos la imagen
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        imageBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        // Si no es una URL, asumimos que es un buffer
        imageBuffer = Buffer.from(imageUrl, 'base64');
      }

      // Descargamos la imagen de la URL
      const response = await fetch(imageUrl);

      // Realizamos la detección de texto
      const [result] = await this.client.textDetection({
        image: {
          content: imageBuffer
        }
      });

      // Verificamos si hay resultados
      if (!result.fullTextAnnotation) {
        throw new Error('No se encontró texto en la imagen');
      }

      // Devolvemos el texto completo
      return result.fullTextAnnotation.text;
    } catch (error) {
      console.error('Error al extraer texto:', error);
      throw new Error(`Error al extraer texto de la imagen: ${error.message}`);
    }
  }

  /**
   * Guardar datos extraídos en la base de datos de Supabase.
   */
  async saveData(data: { imageUrl: string; extractedText: string }) {
    try {
      // Agregar logs para debugging
      console.log('Attempting to save data:', data);

      const { data: insertedData, error } = await this.supabase
        .from('vouchersData')
        .insert([
          {
            image_url: data.imageUrl,
            extracted_text: data.extractedText,
            created_at: new Date().toISOString(), // Opcional: agregar timestamp
            status: true // Opcional: agregar estado
          }
        ])
        .select(); // Agregamos .select() para obtener los datos insertados

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Error saving data to database: ${error.message}`);
      }

      console.log('Data saved successfully:', insertedData);
      return { message: 'Data saved successfully', data: insertedData };
    } catch (error) {
      console.error('Save error:', error);
      throw new Error(`Failed to save extracted data: ${error.message}`);
    }
  }
}

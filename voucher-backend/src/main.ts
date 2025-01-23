import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  dotenv.config();
  // Configuración de CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'https://vauchers-check.vercel.app'],  // Dominio permitido (frontend)
    methods: 'GET,POST',            // Métodos permitidos
    allowedHeaders: 'Content-Type,Authorization', // Encabezados permitidos
  });

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('Documentación de los endpoints de la API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(8080);
}
bootstrap();

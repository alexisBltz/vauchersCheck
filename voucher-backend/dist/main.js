"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.enableCors({
        origin: 'http://localhost:3000',
        methods: 'GET,POST',
        allowedHeaders: 'Content-Type,Authorization',
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('API Documentation')
        .setDescription('Documentación de los endpoints de la API')
        .setVersion('1.0')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api-docs', app, document);
    await app.listen(8080);
}
bootstrap();
//# sourceMappingURL=main.js.map
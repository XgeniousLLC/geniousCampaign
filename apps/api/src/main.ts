import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors();
  // Amazon SNS posts bounce/complaint notifications as text/plain JSON —
  // parse it as text on this specific route so the controller can JSON.parse it itself.
  app.use('/webhooks/ses/sns', express.text({ type: '*/*' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

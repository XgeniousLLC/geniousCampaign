import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { raw } from 'express';
import type { IncomingMessage } from 'http';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors();
  // AWS SNS posts webhook notifications with Content-Type: text/plain even
  // though the body is JSON. Nest's `rawBody: true` capture only recognizes
  // application/json and application/x-www-form-urlencoded, so req.rawBody
  // was never populated for real SNS requests, crashing SesSnsController
  // before it could parse or log the notification. Capture it explicitly
  // for this route regardless of content-type.
  app.use(
    '/webhooks/ses/sns',
    raw({
      type: '*/*',
      verify: (req: IncomingMessage & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

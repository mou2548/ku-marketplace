import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();

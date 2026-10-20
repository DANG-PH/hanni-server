import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../config/env.validation';
import { databaseOptions } from './database.config';
import { ENTITIES } from './entities';

/**
 * Kết nối Postgres qua TypeORM. Global: service nào cũng `@InjectRepository(Word)` được mà không phải
 * khai báo lại trong module của mình.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        databaseOptions(config.get('DATABASE_URL', { infer: true })),
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

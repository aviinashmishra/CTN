import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { CollegeModule } from './modules/college/college.module';
import { PostModule } from './modules/post/post.module';
import { ResourceModule } from './modules/resource/resource.module';
import { ModeratorModule } from './modules/moderator/moderator.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    
    // PostgreSQL Connection (Neon DB)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV === 'development', // Only in development
        logging: process.env.NODE_ENV === 'development',
        ssl: {
          rejectUnauthorized: false, // Required for Neon DB
        },
      }),
      inject: [ConfigService],
    }),
    
    // MongoDB Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    
    // Feature Modules
    AuthModule,
    CollegeModule,
    PostModule,
    ResourceModule,
    ModeratorModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

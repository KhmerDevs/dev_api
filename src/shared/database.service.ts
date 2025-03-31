import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { RedisService } from './redis.service';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private redisService: RedisService
  ) {}

  async executeWithCache<T>(
    key: string,
    query: (queryRunner: QueryRunner) => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.redisService.get(key);
    if (cached) return JSON.parse(cached);

    // If not in cache, execute query
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      const result = await query(queryRunner);
      
      await queryRunner.commitTransaction();
      
      // Cache the result
      await this.redisService.set(key, JSON.stringify(result), ttl);
      
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
} 
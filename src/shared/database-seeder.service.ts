import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedAdminUser();
  }

  private async seedAdminUser() {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME;
    const enableInitialAdmin = process.env.ENABLE_INITIAL_ADMIN === 'true';

    if (!enableInitialAdmin) {
      this.logger.log('Initial admin creation is disabled');
      return;
    }

    if (!adminEmail || !adminPassword || !adminName) {
      this.logger.warn('Admin credentials not fully specified in environment variables');
      return;
    }

    // Check if admin already exists
    const existingAdmin = await this.userRepository.findOne({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      this.logger.log(`Admin user ${adminEmail} already exists`);

      // Ensure the user has admin role
      if (existingAdmin.role !== UserRole.ADMIN) {
        this.logger.log(`Updating ${adminEmail} role to admin`);
        existingAdmin.role = UserRole.ADMIN;
        await this.userRepository.save(existingAdmin);
      }
      return;
    }

    try {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const admin = this.userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        role: UserRole.ADMIN,
        isVerified: true,
      });

      await this.userRepository.save(admin);
      this.logger.log(`Admin user ${adminEmail} created successfully`);
    } catch (error) {
      this.logger.error(`Failed to create admin user: ${error.message}`);
    }
  }
} 
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

  private validatePassword(password: string): boolean {
    const minLength = 10;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    return password.length >= minLength && hasUppercase && 
           hasLowercase && hasNumbers && hasSpecialChar;
  }

  private async seedAdminUser() {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME;
    const enableInitialAdmin = process.env.ENABLE_INITIAL_ADMIN === 'true';

    // Security check: Disable in production unless explicitly allowed
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_ADMIN_IN_PRODUCTION) {
      this.logger.warn('Admin creation via env vars disabled in production. Use ALLOW_ADMIN_IN_PRODUCTION=true to override.');
      return;
    }

    // Check for time limitations
    if (process.env.ADMIN_CREATION_EXPIRES) {
      const expiryTime = parseInt(process.env.ADMIN_CREATION_EXPIRES);
      if (!isNaN(expiryTime) && Date.now() > expiryTime) {
        this.logger.log('Admin creation time window has expired');
        return;
      }
    }

    if (!enableInitialAdmin) {
      this.logger.log('Initial admin creation is disabled');
      return;
    }

    if (!adminEmail || !adminPassword || !adminName) {
      this.logger.warn('Admin credentials not fully specified in environment variables');
      return;
    }

    // Password strength validation
    if (!this.validatePassword(adminPassword)) {
      this.logger.error('Admin password does not meet security requirements. Password should have at least 10 characters, including uppercase, lowercase, numbers, and special characters.');
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
      // Create new admin user with enhanced security
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const admin = this.userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        role: UserRole.ADMIN,
        isVerified: true,
      });

      await this.userRepository.save(admin);
      
      // Security audit log
      this.logger.log(`Admin user ${adminEmail} created successfully at ${new Date().toISOString()}`);
      
      // Recommend disabling after creation
      this.logger.log('SECURITY RECOMMENDATION: Set ENABLE_INITIAL_ADMIN=false in your .env file now that admin is created');
    } catch (error) {
      this.logger.error(`Failed to create admin user: ${error.message}`);
    }
  }
} 
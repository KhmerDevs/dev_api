import { Injectable, ConflictException, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { MailService } from '../shared/mail.service';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;
  
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private mailService: MailService,
    private logger: Logger,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, this.saltRounds);
    
    // Always assign USER role for public registration
    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      role: UserRole.USER, // Force USER role
    });

    await this.userRepository.save(user);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Store with user
    user.verificationToken = verificationToken;
    user.isVerified = false;
    
    await this.userRepository.save(user);
    
    // Send verification email
    await this.mailService.sendVerificationEmail(
      user.email,
      `${process.env.BASE_URL}/auth/verify?token=${verificationToken}`
    );
    
    this.logger.log(`New user registered: ${registerDto.email}`);
    
    // Return result without password
    const { password, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    // Rate limiting check would go here in production
    
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      // Use consistent error messages to prevent user enumeration
      throw new UnauthorizedException('Invalid credentials'); 
    }

    // Time-constant comparison to prevent timing attacks
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jwtid = uuidv4();
    
    const payload = { 
      sub: user.id, 
      email: user.email,
      role: user.role,
      jti: jwtid
    };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
    };
  }

  async googleLogin(user: any) {
    if (!user) {
      throw new UnauthorizedException('No user from google');
    }

    let existingUser = await this.userRepository.findOne({
      where: { email: user.email },
    });

    if (!existingUser) {
      // Create new user if doesn't exist
      const newUser = this.userRepository.create({
        email: user.email,
        name: user.name,
        password: '', // You might want to generate a random password here
        role: UserRole.USER,
        googleId: user.googleId,
      });
      existingUser = await this.userRepository.save(newUser);
    }

    const payload = {
      sub: existingUser.id,
      email: existingUser.email,
      role: existingUser.role,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
      },
    };
  }
} 
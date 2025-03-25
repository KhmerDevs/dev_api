import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ExamAttempt } from '../../entities/exam-attempt.entity';

@Injectable()
export class UserAdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ExamAttempt)
    private examAttemptRepository: Repository<ExamAttempt>,
  ) {}

  async getAllUsers() {
    const users = await this.userRepository.find({
      select: ['id', 'email', 'name', 'role', 'createdAt'],
    });
    return users;
  }

  async getUser(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'role', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async createUser(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    await this.userRepository.save(user);
    
    const { password, ...result } = user;
    return result;
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.userRepository.update(id, updateUserDto);
    
    return this.getUser(id);
  }

  async deleteUser(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
  }

  async getDashboardStats() {
    const totalUsers = await this.userRepository.count();
    const adminUsers = await this.userRepository.count({ where: { role: UserRole.ADMIN } });
    const regularUsers = await this.userRepository.count({ where: { role: UserRole.USER } });
    
    const recentUsers = await this.userRepository.find({
      select: ['id', 'email', 'name', 'role', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      totalUsers,
      adminUsers,
      regularUsers,
      recentUsers,
    };
  }

  async getAdminProfile(adminId: number) {
    // Get the admin user
    const admin = await this.userRepository.findOne({
      where: { id: adminId, role: UserRole.ADMIN },
      select: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
    });

    if (!admin) {
      throw new NotFoundException('Admin profile not found');
    }

    // Get counts for dashboard-like data
    const totalUsers = await this.userRepository.count();
    
    // Get recent activities (could be expanded based on what you want to track)
    const recentExamAttempts = await this.examAttemptRepository.find({
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      admin,
      stats: {
        totalUsers,
      },
      recentActivity: recentExamAttempts.map(attempt => ({
        id: attempt.id,
        user: {
          id: attempt.user.id,
          name: attempt.user.name,
        },
        course: {
          id: attempt.course.id,
          title: attempt.course.title,
        },
        score: attempt.score,
        passed: attempt.passed,
        createdAt: attempt.createdAt,
      })),
    };
  }
} 
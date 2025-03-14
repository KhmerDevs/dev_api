import { IsEmail, IsNotEmpty, MinLength, IsEnum, MaxLength, Matches } from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  email: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72, { message: 'Password cannot exceed 72 characters' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
  })
  password: string;

  @IsNotEmpty()
  @MaxLength(100, { message: 'First name cannot exceed 100 characters' })
  firstName: string;

  @IsNotEmpty()
  @MaxLength(100, { message: 'Last name cannot exceed 100 characters' })
  lastName: string;

  @IsEnum(UserRole, { message: 'Invalid user role' })
  role: UserRole;
} 
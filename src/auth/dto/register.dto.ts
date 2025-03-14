import { IsEmail, IsNotEmpty, MinLength, IsString, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
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
  @IsString()
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string;

  // Role has been removed from public DTO
} 
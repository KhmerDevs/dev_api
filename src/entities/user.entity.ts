import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Enrollment } from './enrollment.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ default: 'User' })
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  picture: string;

  @Column({ default: false })
  isGoogleAccount: boolean;

  @Column({ nullable: true })
  verificationToken: string;

  @Column({ default: false })
  isVerified: boolean;

  @OneToMany(() => Enrollment, enrollment => enrollment.user)
  enrollments: Enrollment[];
} 
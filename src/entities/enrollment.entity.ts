import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('enrollments')
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.enrollments)
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Course, course => course.enrollments)
  course: Course;

  @Column()
  courseId: number;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: false })
  completed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 
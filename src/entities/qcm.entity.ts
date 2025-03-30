import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Course } from './course.entity';

@Entity('qcms')
export class QCM {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  question: string;

  @Column('simple-array')
  options: string[];

  @Column()
  correctAnswer: number; // Index of the correct answer in options array

  @Column({ nullable: true })
  explanation: string;

  @Column()
  orderIndex: number;

  @ManyToOne(() => Course, course => course.qcms)
  course: Course;

  @Column()
  courseId: number;

  @Column({ default: 0 })
  questionNumber: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 
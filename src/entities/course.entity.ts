import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { CourseCategory } from './course_category.entity';
import { Lesson } from './lesson.entity';
import { QCM } from './qcm.entity';

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.BEGINNER
  })
  difficultyLevel: DifficultyLevel;

  @Column('simple-array', { nullable: true })
  prerequisites: string[];

  @Column('simple-array', { nullable: true })
  learningObjectives: string[];

  @Column({ nullable: true })
  thumbnailUrl: string;

  @ManyToOne(() => CourseCategory)
  @JoinColumn()
  category: CourseCategory;

  @Column()
  categoryId: number;

  @OneToMany(() => Lesson, lesson => lesson.course, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  lessons: Lesson[];

  @Column({ default: false })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'int', default: 30 })  // Duration in minutes for the exam
  examDuration: number;

  @Column({ type: 'int', default: 60 })  // Pass score as percentage (e.g., 60 means 60%)
  examPassScore: number;

  @OneToMany(() => QCM, qcm => qcm.course, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  qcms: QCM[];
} 
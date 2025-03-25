import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../../entities/enrollment.entity';
import { Lesson } from '../../entities/lesson.entity';
import { LessonCompletion } from '../../entities/lesson-completion.entity';
import { PracticeExerciseAttempt } from '../../entities/practice-exercise-attempt.entity';
import { ExamAttempt } from '../../entities/exam-attempt.entity';
import { PracticeExercise } from '../../entities/practice-exercise.entity';
import { EnrollmentService } from './enrollment.service';

@Injectable()
export class CourseProgressService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(LessonCompletion)
    private lessonCompletionRepository: Repository<LessonCompletion>,
    @InjectRepository(PracticeExerciseAttempt)
    private practiceExerciseAttemptRepository: Repository<PracticeExerciseAttempt>,
    @InjectRepository(ExamAttempt)
    private examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(PracticeExercise)
    private practiceExerciseRepository: Repository<PracticeExercise>,
    @Inject(forwardRef(() => EnrollmentService))
    private enrollmentService: EnrollmentService,
  ) {}

  async getUserStats(userId: number) {
    // Get lesson completion statistics
    const lessonCompletions = await this.lessonCompletionRepository.find({
      where: { userId },
    });

    const completedLessons = lessonCompletions.filter(lc => lc.completed).length;
    const totalTimeSpent = lessonCompletions.reduce((sum, lc) => sum + lc.timeSpentSeconds, 0);

    // Get practice exercise statistics
    const exerciseAttempts = await this.practiceExerciseAttemptRepository.find({
      where: { userId },
    });

    const completedExercises = exerciseAttempts.filter(ea => ea.isCorrect).length;
    const totalExerciseAttempts = exerciseAttempts.length;

    // Get exam statistics
    const examAttempts = await this.examAttemptRepository.find({
      where: { userId },
    });

    const passedExams = examAttempts.filter(ea => ea.passed).length;
    const totalExamAttempts = examAttempts.length;

    // Get enrollment statistics
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
    });

    return {
      totalEnrolledCourses: enrollments.length,
      completedCourses: enrollments.filter(e => e.completed).length,
      completedLessons,
      totalTimeSpentSeconds: totalTimeSpent,
      completedExercises,
      totalExerciseAttempts,
      passedExams,
      totalExamAttempts,
    };
  }

  async getCourseProgress(userId: number, courseId: number) {
    // Check if user is enrolled
    const enrollment = await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Get all lessons for this course
    const lessons = await this.lessonRepository.find({
      where: { courseId },
      order: { orderIndex: 'ASC' }
    });
    
    if (!lessons.length) {
      return {
        courseId,
        progress: 0,
        completed: false,
        lessons: []
      };
    }
    
    // Get lesson completions for user
    const lessonCompletions = await this.lessonCompletionRepository.find({
      where: { userId, courseId }
    });
    
    // Get practice exercise attempts
    const exerciseAttempts = await this.practiceExerciseAttemptRepository.find({
      where: { userId, courseId }
    });
    
    // Get all exercises grouped by lesson
    const exercises = await this.practiceExerciseRepository
      .createQueryBuilder('exercise')
      .where('exercise.lessonId IN (:...lessonIds)', { 
        lessonIds: lessons.map(l => l.id) 
      })
      .getMany();
    
    // Get all exams for this course
    const examAttempts = await this.examAttemptRepository.find({
      where: { userId, courseId },
      order: { createdAt: 'DESC' }
    });
    
    // Calculate progress per lesson
    const lessonProgressDetails = lessons.map(lesson => {
      const completion = lessonCompletions.find(lc => lc.lessonId === lesson.id);
      
      const lessonExercises = exercises.filter(ex => ex.lessonId === lesson.id);
      const lessonExerciseAttempts = exerciseAttempts.filter(
        ea => ea.lessonId === lesson.id
      );
      
      // Calculate exercise completion
      let exercisesCompleted = 0;
      if (lessonExercises.length > 0) {
        exercisesCompleted = lessonExercises.filter(ex => 
          lessonExerciseAttempts.some(
            attempt => attempt.practiceExerciseId === ex.id && attempt.isCorrect
          )
        ).length;
      }
      
      // Calculate lesson progress
      let lessonProgress = 0;
      
      if (completion?.completed) {
        lessonProgress = 100;
      } else if (completion?.lastAccessedAt) {
        // If viewed but not completed, count as partial progress
        lessonProgress = 50;
        
        // Add extra progress for completed exercises
        if (lessonExercises.length > 0) {
          lessonProgress += (exercisesCompleted / lessonExercises.length) * 50;
        }
      }
      
      return {
        lessonId: lesson.id,
        title: lesson.title,
        completed: completion?.completed || false,
        viewed: !!completion?.lastAccessedAt,
        progress: Math.round(lessonProgress),
        timeSpentSeconds: completion?.timeSpentSeconds || 0,
        lastAccessedAt: completion?.lastAccessedAt,
        exerciseStats: {
          total: lessonExercises.length,
          completed: exercisesCompleted
        }
      };
    });
    
    // Calculate overall course progress
    const totalLessons = lessons.length;
    const completedLessons = lessonProgressDetails.filter(l => l.completed).length;
    const totalProgress = lessonProgressDetails.reduce((sum, l) => sum + l.progress, 0);
    const averageProgress = totalLessons > 0 ? totalProgress / totalLessons : 0;
    
    // Check if user passed the exam
    const passedExam = examAttempts.some(ea => ea.passed);
    
    // Update enrollment progress
    enrollment.progress = Math.round(averageProgress);
    enrollment.completed = passedExam && completedLessons === totalLessons;
    await this.enrollmentRepository.save(enrollment);
    
    return {
      courseId,
      progress: Math.round(averageProgress),
      completed: enrollment.completed,
      lessonCompletionCount: `${completedLessons}/${totalLessons}`,
      examStatus: {
        attempted: examAttempts.length > 0,
        passed: passedExam,
        bestScore: examAttempts.length > 0 ? 
          Math.max(...examAttempts.filter(ea => ea.score !== null).map(ea => ea.score || 0)) : null,
        attempts: examAttempts.length
      },
      lessons: lessonProgressDetails
    };
  }

  async updateCourseProgress(userId: number, courseId: number) {
    // Get enrollment
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId }
    });
    
    if (!enrollment) {
      return;
    }
    
    // Get all lessons
    const lessons = await this.lessonRepository.find({
      where: { courseId }
    });
    
    if (!lessons.length) {
      return;
    }
    
    // Get lesson completions
    const completions = await this.lessonCompletionRepository.find({
      where: { userId, courseId }
    });
    
    // Calculate progress percentage
    const completedLessons = completions.filter(c => c.completed).length;
    const progress = Math.round((completedLessons / lessons.length) * 100);
    
    // Get exam attempts
    const examAttempts = await this.examAttemptRepository.find({
      where: { userId, courseId }
    });
    
    // Check if passed exam
    const passedExam = examAttempts.some(ea => ea.passed);
    
    // Update enrollment
    enrollment.progress = progress;
    enrollment.completed = passedExam && completedLessons === lessons.length;
    
    await this.enrollmentRepository.save(enrollment);
  }
} 
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../../entities/lesson.entity';
import { PracticeExercise } from '../../entities/practice-exercise.entity';
import { LessonCompletion } from '../../entities/lesson-completion.entity';
import { PracticeExerciseAttempt } from '../../entities/practice-exercise-attempt.entity';
import { UserActivity } from '../../entities/user-activity.entity';
import { ActivityType } from '../../entities/user-activity.entity';
import { EnrollmentService } from './enrollment.service';
import { CourseProgressService } from './course-progress.service';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(PracticeExercise)
    private practiceExerciseRepository: Repository<PracticeExercise>,
    @InjectRepository(LessonCompletion)
    private lessonCompletionRepository: Repository<LessonCompletion>,
    @InjectRepository(PracticeExerciseAttempt)
    private practiceExerciseAttemptRepository: Repository<PracticeExerciseAttempt>,
    @InjectRepository(UserActivity)
    private userActivityRepository: Repository<UserActivity>,
    private enrollmentService: EnrollmentService,
    private courseProgressService: CourseProgressService,
  ) {}

  async markLessonViewed(userId: number, courseId: number, lessonId: number, timeSpentSeconds?: number) {
    // Check if user is enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Check if lesson exists and belongs to course
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId, courseId }
    });
    
    if (!lesson) {
      throw new NotFoundException('Lesson not found in this course');
    }
    
    // Find or create lesson completion record
    let lessonCompletion = await this.lessonCompletionRepository.findOne({
      where: { userId, lessonId }
    });
    
    if (!lessonCompletion) {
      lessonCompletion = this.lessonCompletionRepository.create({
        userId,
        lessonId,
        courseId,
        completed: false,
        timeSpentSeconds: 0
      });
    }
    
    // Update last accessed time
    lessonCompletion.lastAccessedAt = new Date();
    
    // Update time spent if provided
    if (timeSpentSeconds && timeSpentSeconds > 0) {
      lessonCompletion.timeSpentSeconds += timeSpentSeconds;
    }
    
    await this.lessonCompletionRepository.save(lessonCompletion);
    
    // Log user activity
    const activity = this.userActivityRepository.create({
      userId,
      courseId,
      lessonId,
      activityType: ActivityType.VIEW_LESSON,
      timeSpentSeconds
    });
    
    await this.userActivityRepository.save(activity);
    
    // Update course progress
    await this.courseProgressService.updateCourseProgress(userId, courseId);
    
    return {
      message: 'Lesson viewed successfully',
      lessonId,
      lastAccessedAt: lessonCompletion.lastAccessedAt,
      timeSpentSeconds: lessonCompletion.timeSpentSeconds
    };
  }

  async markLessonCompleted(userId: number, courseId: number, lessonId: number) {
    // Check if user is enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Check if lesson exists and belongs to course
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId, courseId }
    });
    
    if (!lesson) {
      throw new NotFoundException('Lesson not found in this course');
    }
    
    // Find or create lesson completion record
    let lessonCompletion = await this.lessonCompletionRepository.findOne({
      where: { userId, lessonId }
    });
    
    if (!lessonCompletion) {
      lessonCompletion = this.lessonCompletionRepository.create({
        userId,
        lessonId,
        courseId,
        timeSpentSeconds: 0
      });
    }
    
    // Mark as completed
    lessonCompletion.completed = true;
    lessonCompletion.lastAccessedAt = new Date();
    
    await this.lessonCompletionRepository.save(lessonCompletion);
    
    // Log user activity
    const activity = this.userActivityRepository.create({
      userId,
      courseId,
      lessonId,
      activityType: ActivityType.COMPLETE_LESSON
    });
    
    await this.userActivityRepository.save(activity);
    
    // Update course progress
    await this.courseProgressService.updateCourseProgress(userId, courseId);
    
    return {
      message: 'Lesson marked as completed',
      lessonId,
      completed: true
    };
  }

  async submitPracticeExercise(
    userId: number, 
    courseId: number, 
    lessonId: number, 
    exerciseId: number, 
    submittedCode: string
  ) {
    // Check if user is enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Check if exercise exists and belongs to the specified lesson
    const exercise = await this.practiceExerciseRepository.findOne({
      where: { id: exerciseId, lessonId }
    });
    
    if (!exercise) {
      throw new NotFoundException('Exercise not found in this lesson');
    }
    
    // Check if solution exists
    if (!exercise.solution) {
      throw new BadRequestException('No solution available for this exercise');
    }
    
    if (!submittedCode) {
      throw new BadRequestException('Submitted code cannot be empty');
    }
    
    // Automatically determine if the code is correct by comparing with the solution
    // Normalize both codes by removing whitespace, comments, etc.
    const normalizeCode = (code: string) => {
      if (!code) return '';
      return code
        .replace(/\s+/g, '') // Remove all whitespace
        .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '') // Remove comments
        .toLowerCase(); // Convert to lowercase to ignore case
    };
    
    // Compare the submitted code with the solution
    const normalizedSubmission = normalizeCode(submittedCode);
    const normalizedSolution = normalizeCode(exercise.solution);
    const isCorrect = normalizedSubmission === normalizedSolution;
    
    // Create attempt record
    const attempt = this.practiceExerciseAttemptRepository.create({
      userId,
      courseId,
      lessonId,
      practiceExerciseId: exerciseId,
      submittedCode,
      isCorrect
    });
    
    await this.practiceExerciseAttemptRepository.save(attempt);
    
    // Log user activity
    const activity = this.userActivityRepository.create({
      userId,
      courseId,
      lessonId,
      exerciseId,
      activityType: ActivityType.SUBMIT_EXERCISE
    });
    
    await this.userActivityRepository.save(activity);
    
    // Update course progress
    await this.courseProgressService.updateCourseProgress(userId, courseId);
    
    // If incorrect, check how many failed attempts user has made
    let showSolution = false;
    let failedAttempts = 0;
    
    if (!isCorrect) {
      // Count previous failed attempts for this exercise
      failedAttempts = await this.practiceExerciseAttemptRepository.count({
        where: {
          userId,
          practiceExerciseId: exerciseId,
          isCorrect: false
        }
      });
      
      // Show solution after 3 failed attempts (including this one)
      showSolution = failedAttempts >= 3;
    }
    
    return {
      message: isCorrect ? 'Exercise completed successfully!' : 'Exercise solution is incorrect',
      submissionId: attempt.id,
      isCorrect,
      feedback: isCorrect 
        ? 'Great job! Your solution matches the expected output.' 
        : 'Try again! Your solution doesn\'t match the expected output.',
      failedAttempts,
      ...(showSolution && {
        solution: exercise.solution,
        solutionMessage: 'After multiple attempts, here is the correct solution to help you learn:'
      })
    };
  }

  async checkLessonExercisesCompletion(userId: number, courseId: number, lessonId: number) {
    // Get all exercises for this lesson
    const exercises = await this.practiceExerciseRepository.find({
      where: { lessonId }
    });
    
    if (!exercises.length) {
      return;
    }
    
    // For each exercise, check if user has at least one correct submission
    const exerciseIds = exercises.map(ex => ex.id);
    
    // Get latest attempt for each exercise
    const latestAttempts = await Promise.all(
      exerciseIds.map(exerciseId => 
        this.practiceExerciseAttemptRepository.findOne({
          where: { userId, practiceExerciseId: exerciseId, isCorrect: true },
          order: { createdAt: 'DESC' }
        })
      )
    );
    
    // If all exercises have at least one correct submission, mark lesson as completed
    const allCompleted = latestAttempts.every(attempt => attempt !== null);
    
    if (allCompleted) {
      let lessonCompletion = await this.lessonCompletionRepository.findOne({
        where: { userId, lessonId }
      });
      
      if (!lessonCompletion) {
        lessonCompletion = this.lessonCompletionRepository.create({
          userId,
          lessonId,
          courseId,
          timeSpentSeconds: 0
        });
      }
      
      lessonCompletion.completed = true;
      lessonCompletion.lastAccessedAt = new Date();
      
      await this.lessonCompletionRepository.save(lessonCompletion);
      
      // Update course progress
      await this.courseProgressService.updateCourseProgress(userId, courseId);
    }
  }
} 
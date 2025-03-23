import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { QCM } from '../entities/qcm.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { Lesson } from '../entities/lesson.entity';
import { PracticeExercise } from '../entities/practice-exercise.entity';
import { LessonCompletion } from '../entities/lesson-completion.entity';
import { PracticeExerciseAttempt } from '../entities/practice-exercise-attempt.entity';
import { UserActivity } from '../entities/user-activity.entity';
import { ActivityType } from '../entities/user-activity.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(QCM)
    private qcmRepository: Repository<QCM>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(ExamAttempt)
    private examAttemptRepository: Repository<ExamAttempt>,
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
  ) {}

  async getProfile(userId: number) {
    // Get user basic info
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get enrolled courses with progress
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course', 'course.category'],
    });

    // Get course progress statistics
    const enrolledCourses = enrollments.map(enrollment => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      categoryId: enrollment.course.categoryId,
      categoryName: enrollment.course.category?.name,
      progress: enrollment.progress,
      completed: enrollment.completed,
      thumbnailUrl: enrollment.course.thumbnailUrl,
      backgroundColor: enrollment.course.backgroundColor,
      enrolledAt: enrollment.createdAt
    }));

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

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      enrolledCourses,
      stats: {
        totalEnrolledCourses: enrollments.length,
        completedCourses: enrollments.filter(e => e.completed).length,
        completedLessons,
        totalTimeSpentSeconds: totalTimeSpent,
        completedExercises,
        totalExerciseAttempts,
        passedExams,
        totalExamAttempts,
      },
    };
  }

  async getEnrolledCourses(userId: number) {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course', 'course.category'],
    });

    return enrollments.map(enrollment => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      category: enrollment.course.category,
      thumbnailUrl: enrollment.course.thumbnailUrl,
      difficultyLevel: enrollment.course.difficultyLevel,
      progress: enrollment.progress,
      completed: enrollment.completed,
      enrolledAt: enrollment.createdAt,
    }));
  }

  async enrollCourse(userId: number, courseId: number) {
    this.logger.log(`Attempting to enroll user ${userId} in course ${courseId}`);
    
    // Check if course exists at all first
    const courseExists = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    
    if (!courseExists) {
      this.logger.warn(`Course ${courseId} does not exist`);
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }
    
    // Then check if it's published
    if (!courseExists.isPublished) {
      this.logger.warn(`Course ${courseId} exists but is not published`);
      throw new ForbiddenException(`Course with ID ${courseId} is not available for enrollment`);
    }

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });

    if (existingEnrollment) {
      throw new ConflictException('Already enrolled in this course');
    }

    // Get all enrollments for this user
    const userEnrollments = await this.enrollmentRepository.find({
      where: { userId },
    });

    // Get exam attempts that were passed - fix the query
    const passedExams = await this.examAttemptRepository.find({
      where: { userId, passed: true },
      select: ['courseId']
    });

    // Count unique courseIds in passed exams using JavaScript's Set
    const uniquePassedCourses = [...new Set(passedExams.map(exam => exam.courseId))].length;
    
    // Calculate enrollment limit (base 5 + number of passed courses)
    const enrollmentLimit = 5 + uniquePassedCourses;
    
    // Check if user has reached the limit
    if (userEnrollments.length >= enrollmentLimit) {
      throw new ForbiddenException(
        `You can enroll in a maximum of ${enrollmentLimit} courses. Please complete some of your current courses before enrolling in new ones.`
      );
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      userId,
      courseId,
      progress: 0,
      completed: false,
    });

    await this.enrollmentRepository.save(enrollment);

    return {
      message: 'Successfully enrolled in course',
      courseId,
      courseTitle: courseExists.title,
      enrollmentsRemaining: enrollmentLimit - userEnrollments.length - 1
    };
  }

  async getCourseDetails(userId: number, courseId: number) {
    // Check if enrolled
    await this.checkEnrollment(userId, courseId);

    // Get course details
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['category', 'lessons', 'lessons.codeExamples', 'lessons.practiceExercises'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Sort lessons by orderIndex
    course.lessons.sort((a, b) => a.orderIndex - b.orderIndex);

    // Format response
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      difficultyLevel: course.difficultyLevel,
      prerequisites: course.prerequisites,
      learningObjectives: course.learningObjectives,
      thumbnailUrl: course.thumbnailUrl,
      lessons: course.lessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        content: lesson.content,
        orderIndex: lesson.orderIndex,
        codeExamples: lesson.codeExamples?.map(code => ({
          id: code.id,
          title: code.title,
          programmingLanguage: code.programmingLanguage,
          code: code.code,
          explanation: code.explanation,
        })) || [],
        practiceExercises: lesson.practiceExercises?.map(exercise => ({
          id: exercise.id,
          instructions: exercise.instructions,
          starterCode: exercise.starterCode,
          isEnabled: exercise.isEnabled,
        })) || [],
      })),
      examDuration: course.examDuration,
      examPassScore: course.examPassScore,
    };
  }

  async getExam(userId: number, courseId: number) {
    // Check if enrolled
    await this.checkEnrollment(userId, courseId);

    // Get course and QCMs
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const qcms = await this.qcmRepository.find({
      where: { courseId },
      order: { questionNumber: 'ASC' },
    });

    if (!qcms || qcms.length === 0) {
      throw new NotFoundException('No exam questions found for this course');
    }

    // Format QCMs for exam (without correct answers)
    return {
      courseId: course.id,
      courseTitle: course.title,
      examDuration: course.examDuration,
      examPassScore: course.examPassScore,
      questions: qcms.map((qcm, index) => ({
        id: qcm.id,
        questionNumber: index + 1,
        question: qcm.question,
        options: qcm.options,
        // Correct answer is not included in response
      })),
    };
  }

  async submitExam(userId: number, courseId: number, answers: { qcmId: number, answer: number }[]) {
    // Check if enrolled
    await this.checkEnrollment(userId, courseId);

    // Get course details
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['qcms'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = course.qcms.length;

    // Validate each answer
    for (const answer of answers) {
      const qcm = course.qcms.find(q => q.id === answer.qcmId);
      if (qcm && qcm.correctAnswer === answer.answer) {
        correctAnswers++;
      }
    }

    // Calculate percentage score
    const score = (correctAnswers / totalQuestions) * 100;
    const passed = score >= course.examPassScore;

    // Save exam attempt
    const examAttempt = this.examAttemptRepository.create({
      userId,
      courseId,
      answers,
      score,
      passed,
    });

    await this.examAttemptRepository.save(examAttempt);

    // If passed, update enrollment status
    if (passed) {
      await this.enrollmentRepository.update(
        { userId, courseId },
        { completed: true, progress: 100 }
      );
    }

    // Add activity tracking
    const activity = this.userActivityRepository.create({
      userId,
      courseId,
      activityType: ActivityType.COMPLETE_EXAM
    });
    
    await this.userActivityRepository.save(activity);

    // Update course progress after exam
    await this.updateCourseProgress(userId, courseId);

    // Return results
    return {
      score,
      passScore: course.examPassScore,
      passed,
      correctAnswers,
      totalQuestions,
      attemptId: examAttempt.id,
    };
  }

  async getExamResults(userId: number, courseId: number) {
    // Check if enrolled
    await this.checkEnrollment(userId, courseId);

    // Get latest exam attempt
    const examAttempt = await this.examAttemptRepository.findOne({
      where: { userId, courseId },
      order: { createdAt: 'DESC' },
    });

    if (!examAttempt) {
      throw new NotFoundException('No exam attempts found for this course');
    }

    // Get course details for pass score
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    // Return results
    return {
      score: examAttempt.score,
      passScore: course.examPassScore,
      passed: examAttempt.passed,
      attemptDate: examAttempt.createdAt,
      answers: examAttempt.answers,
    };
  }

  async startExam(userId: number, courseId: number) {
    // Check if enrolled
    await this.checkEnrollment(userId, courseId);
    
    // Get course to check exam duration
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    // Check for existing incomplete attempts
    const existingAttempt = await this.examAttemptRepository.findOne({
      where: { 
        userId, 
        courseId, 
        isCompleted: false 
      },
      order: { startedAt: 'DESC' }
    });
    
    // If there's an existing attempt that's not expired, return it
    if (existingAttempt && existingAttempt.startedAt) {
      const startTime = new Date(existingAttempt.startedAt);
      const currentTime = new Date();
      const elapsedMinutes = (currentTime.getTime() - startTime.getTime()) / (1000 * 60);
      
      // If the exam is still valid (not expired)
      if (elapsedMinutes < course.examDuration) {
        return {
          attemptId: existingAttempt.id,
          startedAt: existingAttempt.startedAt,
          timeRemainingMinutes: course.examDuration - Math.floor(elapsedMinutes)
        };
      }
      
      // If it's expired, mark it as completed with a fail
      existingAttempt.isCompleted = true;
      existingAttempt.submittedAt = new Date();
      existingAttempt.durationInSeconds = course.examDuration * 60;
      existingAttempt.passed = false;
      existingAttempt.score = 0;
      await this.examAttemptRepository.save(existingAttempt);
    }
    
    // Create a new attempt
    const examAttempt = this.examAttemptRepository.create({
      userId,
      courseId,
      startedAt: new Date(),
      isCompleted: false
    });
    
    await this.examAttemptRepository.save(examAttempt);
    
    // Add activity tracking
    const activity = this.userActivityRepository.create({
      userId,
      courseId,
      activityType: ActivityType.START_EXAM
    });
    
    await this.userActivityRepository.save(activity);
    
    return {
      attemptId: examAttempt.id,
      startedAt: examAttempt.startedAt,
      timeRemainingMinutes: course.examDuration
    };
  }

  async getExamTimeRemaining(userId: number, courseId: number) {
    // Check if enrolled
    await this.checkEnrollment(userId, courseId);
    
    // Get course to check exam duration
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    // Find the latest attempt
    const examAttempt = await this.examAttemptRepository.findOne({
      where: { 
        userId, 
        courseId, 
        isCompleted: false 
      },
      order: { startedAt: 'DESC' }
    });
    
    if (!examAttempt || !examAttempt.startedAt) {
      throw new NotFoundException('No active exam found. Please start the exam first.');
    }
    
    const startTime = new Date(examAttempt.startedAt);
    const currentTime = new Date();
    const elapsedMinutes = (currentTime.getTime() - startTime.getTime()) / (1000 * 60);
    const remainingMinutes = Math.max(0, course.examDuration - elapsedMinutes);
    
    return {
      attemptId: examAttempt.id,
      startedAt: examAttempt.startedAt,
      timeRemainingMinutes: remainingMinutes,
      timeRemainingSeconds: Math.floor(remainingMinutes * 60)
    };
  }

  async getExamHistory(userId: number) {
    const examAttempts = await this.examAttemptRepository.find({
      where: { userId },
      relations: ['course'],
      order: { createdAt: 'DESC' }
    });
    
    return examAttempts.map(attempt => ({
      id: attempt.id,
      courseId: attempt.courseId,
      courseTitle: attempt.course.title,
      score: attempt.score,
      passed: attempt.passed,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      durationInSeconds: attempt.durationInSeconds,
      createdAt: attempt.createdAt
    }));
  }

  async getCourseExamHistory(userId: number, courseId: number) {
    // Check if enrolled
    await this.checkEnrollment(userId, courseId);
    
    const examAttempts = await this.examAttemptRepository.find({
      where: { userId, courseId },
      order: { createdAt: 'DESC' }
    });
    
    return examAttempts.map(attempt => ({
      id: attempt.id,
      score: attempt.score,
      passed: attempt.passed,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      durationInSeconds: attempt.durationInSeconds,
      createdAt: attempt.createdAt
    }));
  }

  async getPublishedCourses() {
    const courses = await this.courseRepository.find({
      where: { isPublished: true },
      relations: ['category'],
      order: { createdAt: 'DESC' }
    });

    return courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      difficultyLevel: course.difficultyLevel,
      thumbnailUrl: course.thumbnailUrl,
      categoryId: course.categoryId,
      category: course.category,
      sampleCodes: course.sampleCodes,
      backgroundColor: course.backgroundColor,
      createdAt: course.createdAt
    }));
  }

  async markLessonViewed(userId: number, courseId: number, lessonId: number, timeSpentSeconds?: number) {
    // Check if user is enrolled
    await this.checkEnrollment(userId, courseId);
    
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
    await this.updateCourseProgress(userId, courseId);
    
    return {
      message: 'Lesson viewed successfully',
      lessonId,
      lastAccessedAt: lessonCompletion.lastAccessedAt,
      timeSpentSeconds: lessonCompletion.timeSpentSeconds
    };
  }

  async markLessonCompleted(userId: number, courseId: number, lessonId: number) {
    // Check if user is enrolled
    await this.checkEnrollment(userId, courseId);
    
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
    await this.updateCourseProgress(userId, courseId);
    
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
    await this.checkEnrollment(userId, courseId);
    
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
    await this.updateCourseProgress(userId, courseId);
    
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

  private async checkLessonExercisesCompletion(userId: number, courseId: number, lessonId: number) {
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
      await this.updateCourseProgress(userId, courseId);
    }
  }

  async getCourseProgress(userId: number, courseId: number) {
    // Check if user is enrolled
    const enrollment = await this.checkEnrollment(userId, courseId);
    
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

  private async updateCourseProgress(userId: number, courseId: number) {
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

  // Helper method to check if user is enrolled in a course
  private async checkEnrollment(userId: number, courseId: number) {
    // Convert and validate parameters
    userId = +userId;
    courseId = +courseId;

    if (isNaN(userId) || isNaN(courseId)) {
      throw new BadRequestException('Invalid user ID or course ID');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { 
        userId: userId,
        courseId: courseId 
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    return enrollment;
  }
} 
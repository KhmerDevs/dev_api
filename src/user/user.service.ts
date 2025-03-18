import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { QCM } from '../entities/qcm.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { ExamAttempt } from '../entities/exam-attempt.entity';

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
      order: { createdAt: 'DESC' }
    });

    // Get exam history
    const examAttempts = await this.examAttemptRepository.find({
      where: { userId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
      take: 5 // Get last 5 exam attempts
    });

    // Calculate statistics
    const totalCourses = enrollments.length;
    const completedCourses = enrollments.filter(e => e.completed).length;
    const averageProgress = enrollments.length > 0 
      ? enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length 
      : 0;
    const examsPassed = examAttempts.filter(e => e.passed).length;

    return {
      // Basic Info
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      joinedAt: user.createdAt,

      // Learning Statistics
      statistics: {
        totalCoursesEnrolled: totalCourses,
        completedCourses,
        coursesInProgress: totalCourses - completedCourses,
        averageProgress: Math.round(averageProgress),
        totalExamAttempts: examAttempts.length,
        examsPassed,
      },

      // Current Enrollments
      enrolledCourses: enrollments.map(enrollment => ({
        id: enrollment.course.id,
        title: enrollment.course.title,
        category: enrollment.course.category.name,
        progress: enrollment.progress,
        completed: enrollment.completed,
        enrolledAt: enrollment.createdAt,
      })),

      // Recent Exam Activity
      recentExams: examAttempts.map(attempt => ({
        id: attempt.id,
        courseId: attempt.course.id,
        courseTitle: attempt.course.title,
        score: attempt.score,
        passed: attempt.passed,
        attemptedAt: attempt.createdAt
      }))
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
      category: {
        id: course.category.id,
        name: course.category.name
      },
      difficultyLevel: course.difficultyLevel,
      thumbnailUrl: course.thumbnailUrl,
      learningObjectives: course.learningObjectives,
      prerequisites: course.prerequisites,
      sampleCodes: course.sampleCodes,
      examDuration: course.examDuration,
      examPassScore: course.examPassScore,
      enrollmentCount: course.enrollments?.length || 0,
      createdAt: course.createdAt
    }));
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
import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { QCM } from '../../entities/qcm.entity';
import { ExamAttempt, ExamAttemptStatus } from '../../entities/exam-attempt.entity';
import { UserActivity } from '../../entities/user-activity.entity';
import { ActivityType } from '../../entities/user-activity.entity';
import { EnrollmentService } from './enrollment.service';
import { CourseProgressService } from './course-progress.service';
import { CertificateService } from './certificate.service';
import { Not, IsNull } from 'typeorm';
import { MailService } from '../../shared/mail.service';
import { User } from '../../entities/user.entity';
import { ExamSecurityService } from './exam-security.service';
import { RedisService } from '../../shared/redis.service';

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(QCM)
    private qcmRepository: Repository<QCM>,
    @InjectRepository(ExamAttempt)
    private examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(UserActivity)
    private userActivityRepository: Repository<UserActivity>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private enrollmentService: EnrollmentService,
    private courseProgressService: CourseProgressService,
    private certificateService: CertificateService,
    private mailService: MailService,
    private examSecurityService: ExamSecurityService,
    private redisService: RedisService,
  ) {}

  async getExam(userId: number, courseId: number) {
    // Check if enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);

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

  async getCertificateForCourse(userId: number, courseId: number) {
    return this.certificateService.findExistingCertificate(userId, courseId);
  }

  async submitExam(
    userId: number, 
    courseId: number, 
    examAttemptId: number,
    answers: { qcmId: number; answer: number }[]
  ): Promise<any> {
    // Validate submission
    const isValid = await this.examSecurityService.validateExamSubmission(
      userId, 
      courseId, 
      examAttemptId
    );
    
    if (!isValid) {
      throw new ForbiddenException('Invalid exam submission');
    }

    return await this.examAttemptRepository.manager.transaction(async (manager) => {
      const result = await this.processExamSubmission(
        userId,
        courseId,
        examAttemptId,
        answers,
        manager
      );

      // Clear exam session after successful submission
      await this.examSecurityService.clearExamSession(userId, courseId);
      
      return result;
    });
  }

  private async processExamSubmission(
    userId: number,
    courseId: number,
    examAttemptId: number,
    answers: { qcmId: number; answer: number }[],
    manager: EntityManager
  ): Promise<any> {
    // Implement answer validation and scoring logic
    const attempt = await manager.findOne(ExamAttempt, {
      where: { id: examAttemptId, userId, courseId }
    });

    if (!attempt) {
      throw new ForbiddenException('Invalid exam attempt');
    }

    // Calculate score and update attempt
    const { score, passed } = await this.calculateScore(answers, courseId);
    
    attempt.answers = answers;
    attempt.score = score;
    attempt.passed = passed;
    attempt.isCompleted = true;
    attempt.submittedAt = new Date();

    await manager.save(attempt);

    return { score, passed };
  }

  private async calculateScore(
    answers: { qcmId: number; answer: number }[],
    courseId: number
  ): Promise<{ score: number; passed: boolean }> {
    // Implement secure score calculation
    // Consider using a separate scoring service for complex calculations
    return { score: 0, passed: false }; // Implement actual scoring logic
  }

  async getExamResults(userId: number, courseId: number) {
    // Check if enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);

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

  async startExam(userId: number, courseId: number): Promise<ExamAttempt> {
    // Validate and lock exam
    const canStartExam = await this.examSecurityService.validateAndLockExam(userId, courseId);
    if (!canStartExam) {
      throw new ForbiddenException('Cannot start exam at this time');
    }

    return await this.examAttemptRepository.manager.transaction(async (manager) => {
      const attempt = await this.createExamAttempt(userId, courseId, manager);
      await this.examSecurityService.trackExamSession(userId, courseId, attempt.id);
      return attempt;
    });
  }

  private async createExamAttempt(
    userId: number,
    courseId: number,
    manager: EntityManager
  ): Promise<ExamAttempt> {
    this.logger.log(`Starting exam for user ${userId} in course ${courseId}`);
    
    // Check enrollment
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Get course
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    // First, clean up any stale attempts that haven't been completed
    await manager.update(ExamAttempt, {
      userId,
      courseId,
      isCompleted: false
    }, {
      isCompleted: true
    });
    
    this.logger.log(`Cleaned up stale attempts for user ${userId} in course ${courseId}`);
    
    // Create new exam attempt
    const now = new Date();
    const examAttempt = manager.create(ExamAttempt, {
      userId,
      courseId,
      startedAt: now,
      isCompleted: false
    });
    
    const savedAttempt = await manager.save(examAttempt);
    this.logger.log(`Created new exam attempt with ID ${savedAttempt.id} at ${savedAttempt.startedAt}`);
    
    // Record activity
    const activity = this.userActivityRepository.create({
      userId,
      courseId,
      examId: savedAttempt.id,
      activityType: ActivityType.START_EXAM
    });
    
    await manager.save(activity);
    
    return savedAttempt;
  }

  async getExamTimeRemaining(userId: number, courseId: number) {
    this.logger.log(`Getting exam time remaining for user ${userId} in course ${courseId}`);
    
    // Check if enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Get course to check exam duration
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    // Find active attempt - with simplified query
    const examAttempt = await this.examAttemptRepository.findOne({
      where: { 
        userId, 
        courseId, 
        isCompleted: false
      },
      order: { 
        createdAt: 'DESC' 
      }
    });
    
    this.logger.log(`Found exam attempt: ${JSON.stringify(examAttempt || 'No attempt found')}`);
    
    if (!examAttempt) {
      throw new NotFoundException('No active exam found. Please start the exam first.');
    }
    
    if (!examAttempt.startedAt) {
      // If we somehow have an attempt with no start time, fix it
      examAttempt.startedAt = new Date();
      await this.examAttemptRepository.save(examAttempt);
      this.logger.warn(`Fixed missing start time for exam attempt ${examAttempt.id}`);
    }
    
    const startTime = new Date(examAttempt.startedAt);
    const currentTime = new Date();
    const elapsedSeconds = (currentTime.getTime() - startTime.getTime()) / 1000;
    const remainingSeconds = Math.max(0, course.examDuration * 60 - elapsedSeconds);
    
    this.logger.log(`Time calculation: Started at ${startTime}, elapsed ${elapsedSeconds} seconds, remaining ${remainingSeconds} seconds`);
    
    // If time has expired, mark the attempt as completed
    if (remainingSeconds <= 0) {
      examAttempt.isCompleted = true;
      await this.examAttemptRepository.save(examAttempt);
      throw new BadRequestException('Exam time has expired');
    }
    
    return {
      attemptId: examAttempt.id,
      startedAt: examAttempt.startedAt,
      timeRemainingMinutes: Math.floor(remainingSeconds / 60),
      timeRemainingSeconds: Math.floor(remainingSeconds),
      examDuration: course.examDuration
    };
  }

  async getExamHistory(userId: number) {
    const examAttempts = await this.examAttemptRepository.find({
      where: { userId, isCompleted: true },
      relations: ['course'],
      order: { createdAt: 'DESC' }
    });

    // Get all relevant course IDs from attempts
    const courseIds = [...new Set(examAttempts.map(attempt => attempt.courseId))];
    
    // Get certificates for all these courses in one query
    const certificates = await this.certificateService.getUserCertificatesForCourses(userId, courseIds);

    // Map attempt data and add certificate information if available
    return Promise.all(examAttempts.map(async (attempt) => {
      const certificate = certificates.find(cert => cert.courseId === attempt.courseId);
      
      return {
        examId: attempt.id,
        courseId: attempt.courseId,
        courseTitle: attempt.course.title,
        score: attempt.score,
        passed: attempt.passed,
        attemptDate: attempt.createdAt,
        durationInSeconds: attempt.durationInSeconds,
        certificate: certificate ? {
          id: certificate.id,
          certificateNumber: certificate.certificateNumber,
          pdfUrl: certificate.pdfUrl,
          issuedAt: certificate.issuedAt
        } : null
      };
    }));
  }

  async getCourseExamHistory(userId: number, courseId: number) {
    // Check if enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);

    const examAttempts = await this.examAttemptRepository.find({
      where: { userId, courseId, isCompleted: true },
      order: { createdAt: 'DESC' }
    });

    // Get certificate for this course
    const certificate = await this.getCertificateForCourse(userId, courseId);

    return examAttempts.map(attempt => ({
      examId: attempt.id,
      score: attempt.score,
      passed: attempt.passed,
      attemptDate: attempt.createdAt,
      durationInSeconds: attempt.durationInSeconds,
      certificate: certificate && attempt.passed ? {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        pdfUrl: certificate.pdfUrl,
        issuedAt: certificate.issuedAt
      } : null
    }));
  }

  async getExamQuestions(userId: number, courseId: number): Promise<any> {
    const cacheKey = `exam_questions:${courseId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const questions = await this.fetchAndShuffleQuestions(courseId);
    await this.redisService.set(cacheKey, JSON.stringify(questions), this.CACHE_TTL);
    
    return questions;
  }

  private async fetchAndShuffleQuestions(courseId: number): Promise<any[]> {
    // Implement logic to fetch and shuffle questions
    // This is a placeholder and should be replaced with actual implementation
    return [];
  }

  async getLatestPassingAttempt(userId: number, courseId: number) {
    return this.examAttemptRepository.findOne({
      where: {
        userId,
        courseId,
        passed: true,
        isCompleted: true
      },
      order: { submittedAt: 'DESC' }
    });
  }

  async getActiveExamAttempt(userId: number, courseId: number): Promise<ExamAttempt> {
    return this.examAttemptRepository.findOne({
      where: {
        userId,
        courseId,
        isCompleted: false,
        status: ExamAttemptStatus.PENDING
      },
      order: {
        startedAt: 'DESC'
      }
    });
  }
} 
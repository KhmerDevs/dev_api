import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, QueryRunner } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Course } from '../../entities/course.entity';
import { ExamAttempt, ExamAttemptStatus } from '../../entities/exam-attempt.entity';
import { Certificate } from '../../entities/certificate.entity';
import { CertificateService } from './certificate.service';
import { MailService } from '../../shared/mail.service';
import { ExamSecurityService } from './exam-security.service';
import { RedisService } from '../../shared/redis.service';
import * as crypto from 'crypto';
import { EnrollmentService } from './enrollment.service';
import { QCM } from '../../entities/qcm.entity';

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(QCM)
    private readonly qcmRepository: Repository<QCM>,
    @InjectRepository(ExamAttempt)
    private readonly examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    private readonly certificateService: CertificateService,
    private readonly mailService: MailService,
    private readonly examSecurityService: ExamSecurityService,
    private readonly redisService: RedisService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  async getExam(userId: number, courseId: number) {
    // Check if user is enrolled in the course
    const enrollment = await this.examAttemptRepository.manager
      .getRepository('enrollments')
      .findOne({
        where: {
          userId,
          courseId
        }
      });
      
    if (!enrollment) {
      throw new ForbiddenException('User is not enrolled in this course');
    }

    // Get course details
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get QCMs for the course from database
    const qcms = await this.examAttemptRepository.manager
      .createQueryBuilder()
      .select('qcm')
      .from('qcms', 'qcm')
      .where('qcm.courseId = :courseId', { courseId })
      .orderBy('qcm.questionNumber', 'ASC')
      .getRawMany();

    return {
      courseId,
      courseName: course.title,
      examDuration: course.examDuration,
      passScore: course.examPassScore,
      totalQuestions: qcms?.length || 0,
      questions: qcms?.map(qcm => ({
        id: qcm.id,
        question: qcm.question,
        options: qcm.options,
        questionNumber: qcm.questionNumber
      })) || []
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
    const queryRunner = this.examAttemptRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.processExamSubmission(
        userId, 
        courseId, 
        examAttemptId, 
        answers, 
        queryRunner.manager
      );

      await queryRunner.commitTransaction();

      // Only attempt to generate certificate and send email if exam was passed
      if (result.passed && result.certificateId) {
        // Process certificate and send email after transaction is committed
        setImmediate(() => this.processCertificateAndEmail(userId, courseId, examAttemptId));
      }

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to submit exam: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async processExamSubmission(
    userId: number,
    courseId: number,
    examAttemptId: number,
    answers: { qcmId: number; answer: number }[],
    manager: EntityManager
  ): Promise<any> {
    // Get user details
    const user = await manager.findOne(User, { where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get course details
    const course = await manager.findOne(Course, { where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

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
    attempt.status = ExamAttemptStatus.COMPLETED;

    await manager.save(attempt);

    let certificateUrl = null;

    // If user passed, generate certificate within the transaction
    if (passed) {
      try {
        // Check for existing certificate within the transaction
        const existingCertificate = await manager.findOne(Certificate, {
          where: { userId, courseId }
        });

        if (!existingCertificate) {
          // Generate certificate number
          const certificateNumber = this.generateCertificateNumber(userId, courseId, examAttemptId);

          // Create certificate record within transaction
          const certificate = manager.create(Certificate, {
            userId,
            courseId,
            examAttemptId,
            certificateNumber,
            isValid: true
          });

          // Save certificate to database within transaction
          const savedCertificate = await manager.save(Certificate, certificate);
          certificateUrl = savedCertificate;
        } else {
          certificateUrl = existingCertificate;
        }
      } catch (error) {
        this.logger.error(`Failed to process certificate for user ${userId}: ${error.message}`);
      }
    }

    return { score, passed, certificateId: certificateUrl ? certificateUrl.id : null };
  }

  private async calculateScore(
    answers: { qcmId: number; answer: number }[],
    courseId: number
  ): Promise<{ score: number; passed: boolean }> {
    if (!answers || answers.length === 0) {
      return { score: 0, passed: false };
    }

    // Get all QCMs for this course
    const qcms = await this.qcmRepository.find({
      where: { courseId }
    });

    if (!qcms || qcms.length === 0) {
      this.logger.warn(`No questions found for course ${courseId}`);
      return { score: 0, passed: false };
    }

    // Get course for pass score
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });

    if (!course) {
      this.logger.warn(`Course not found: ${courseId}`);
      return { score: 0, passed: false };
    }

    // Validate each answer
    let correctAnswers = 0;
    for (const answer of answers) {
      const qcm = qcms.find(q => q.id === answer.qcmId);
      if (qcm && qcm.correctAnswer === answer.answer) {
        correctAnswers++;
      }
    }

    // Calculate score as percentage
    const score = Math.round((correctAnswers / qcms.length) * 100);
    const passed = score >= course.examPassScore;

    return { score, passed };
  }

  private generateCertificateNumber(userId: number, courseId: number, examAttemptId: number): string {
    const timestamp = Date.now().toString();
    const data = `${userId}-${courseId}-${examAttemptId}-${timestamp}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `CERT-${hash.substring(0, 8)}-${hash.substring(8, 16)}`.toUpperCase();
  }

  async processCertificateAndEmail(userId: number, courseId: number, examAttemptId: number): Promise<void> {
    try {
      // Get the certificate
      const certificate = await this.certificateService.findExistingCertificate(userId, courseId);

      if (!certificate) {
        this.logger.warn(`No certificate found for userId: ${userId}, courseId: ${courseId}`);
        return;
      }

      // Get user and course details 
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const course = await this.courseRepository.findOne({ where: { id: courseId } });

      if (!user || !course) {
        this.logger.warn(`User or course not found for certificate generation`);
        return;
      }

      // Get exam attempt for the score
      const examAttempt = await this.examAttemptRepository.findOne({
        where: { id: examAttemptId }
      });

      // Generate PDF and update certificate with PDF URL
      const pdfUrl = await this.certificateService.generatePdfCertificate(certificate, user, course);
      certificate.pdfUrl = pdfUrl;
      await this.certificateRepository.save(certificate);

      // Send congratulatory email with certificate link
      await this.mailService.sendExamCompletionEmail(
        user.email,
        user.name,
        course.title,
        examAttempt ? examAttempt.score : 0,
        userId,
        courseId,
        pdfUrl
      );
    } catch (error) {
      this.logger.error(`Failed to process certificate/email for user ${userId}: ${error.message}`);
    }
  }

  async getExamResults(userId: number, courseId: number) {
    // Check if user is enrolled in the course
    const enrollment = await this.examAttemptRepository.manager
      .getRepository('enrollments')
      .findOne({
        where: {
          userId,
          courseId
        }
      });
      
    if (!enrollment) {
      throw new ForbiddenException('User is not enrolled in this course');
    }

    // Get latest exam attempt
    const examAttempt = await this.examAttemptRepository.findOne({
      where: {
        userId,
        courseId,
        isCompleted: true
      },
      order: {
        submittedAt: 'DESC'
      }
    });

    if (!examAttempt) {
      return {
        message: 'No completed exam attempts found',
        results: null
      };
    }

    // Get certificate details if available
    const certificate = await this.certificateService.findExistingCertificate(userId, courseId);

    return {
      examId: examAttempt.id,
      score: examAttempt.score,
      passed: examAttempt.passed,
      answers: examAttempt.answers,
      submittedAt: examAttempt.submittedAt,
      certificate: certificate ? {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        pdfUrl: certificate.pdfUrl,
        issuedAt: certificate.issuedAt
      } : null
    };
  }

  async startExam(userId: number, courseId: number): Promise<ExamAttempt> {
    this.logger.log(`Starting exam for user ${userId} in course ${courseId}`);

    // Check if there's an active security lock
    const isLocked = await this.examSecurityService.validateAndLockExam(userId, courseId);
    if (!isLocked) {
      throw new ForbiddenException('An exam session is already in progress or was recently started');
    }

    try {
      // Use transaction for atomicity
      return await this.examAttemptRepository.manager.transaction(async manager => {
        // Create new exam attempt
        const examAttempt = await this.createExamAttempt(userId, courseId, manager);
        
        // Track the exam session for security
        await this.examSecurityService.trackExamSession(userId, courseId, examAttempt.id);
        
        // Get questions via cache
        await this.getExamQuestions(userId, courseId);
        
        return examAttempt;
      });
    } catch (error) {
      // Release the lock if there was an error
      await this.examSecurityService.clearExamSession(userId, courseId);
      throw error;
    }
  }

  private async createExamAttempt(
    userId: number,
    courseId: number,
    manager: EntityManager
  ): Promise<ExamAttempt> {
    
    // Check if user is enrolled in the course
    const enrollment = await manager.findOne('enrollments', {
      where: { userId, courseId }
    });
    
    if (!enrollment) {
      throw new ForbiddenException('User is not enrolled in this course');
    }

    // Get course to check exam duration
    const course = await manager.findOne(Course, {
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Create new exam attempt
    const examAttempt = manager.create(ExamAttempt, {
      userId,
      courseId,
      startedAt: new Date(),
      status: ExamAttemptStatus.PENDING
    });

    // Save and return the exam attempt
    return await manager.save(examAttempt);
  }

  async getExamTimeRemaining(userId: number, courseId: number) {
    this.logger.log(`Getting exam time remaining for user ${userId} in course ${courseId}`);
    
    // Check if enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Get active exam attempt
    const activeExamAttempt = await this.getActiveExamAttempt(userId, courseId);
    
    if (!activeExamAttempt) {
      return {
        active: false,
        timeRemaining: 0,
        message: 'No active exam'
      };
    }
    
    // Calculate time remaining
    const startedAt = activeExamAttempt.startedAt.getTime();
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    const durationMs = course.examDuration * 60 * 1000; // Convert minutes to ms
    const endTime = startedAt + durationMs;
    const now = Date.now();
    const timeRemainingMs = Math.max(0, endTime - now);
    const timeRemainingSeconds = Math.floor(timeRemainingMs / 1000);
    
    return {
      active: true,
      timeRemaining: timeRemainingSeconds,
      attemptId: activeExamAttempt.id,
      startedAt: activeExamAttempt.startedAt
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
    // Check if user is enrolled in the course
    const enrollment = await this.examAttemptRepository.manager
      .getRepository('enrollments')
      .findOne({
        where: {
          userId,
          courseId
        }
      });
      
    if (!enrollment) {
      throw new ForbiddenException('User is not enrolled in this course');
    }

    const examAttempts = await this.examAttemptRepository.find({
      where: { userId, courseId, isCompleted: true },
      order: { createdAt: 'DESC' }
    });

    // Get certificate for this course
    const certificate = await this.certificateService.findExistingCertificate(userId, courseId);

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
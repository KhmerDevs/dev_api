import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { QCM } from '../../entities/qcm.entity';
import { ExamAttempt } from '../../entities/exam-attempt.entity';
import { UserActivity } from '../../entities/user-activity.entity';
import { ActivityType } from '../../entities/user-activity.entity';
import { EnrollmentService } from './enrollment.service';
import { CourseProgressService } from './course-progress.service';
import { CertificateService } from './certificate.service';

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(QCM)
    private qcmRepository: Repository<QCM>,
    @InjectRepository(ExamAttempt)
    private examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(UserActivity)
    private userActivityRepository: Repository<UserActivity>,
    private enrollmentService: EnrollmentService,
    private courseProgressService: CourseProgressService,
    private certificateService: CertificateService,
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

  async submitExam(userId: number, courseId: number, answers: { qcmId: number, answer: number }[]) {
    // Check enrollment
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Get active exam attempt
    const examAttempt = await this.examAttemptRepository.findOne({
      where: {
        userId,
        courseId,
        isCompleted: false
      }
    });
    
    if (!examAttempt) {
      throw new BadRequestException('No active exam found');
    }
    
    // Get course and questions
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['qcms']
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    // Calculate score
    let correctAnswers = 0;
    const qcmsMap = new Map(course.qcms.map(q => [q.id, q]));
    
    for (const answer of answers) {
      const qcm = qcmsMap.get(answer.qcmId);
      if (qcm && qcm.correctAnswer === answer.answer) {
        correctAnswers++;
      }
    }
    
    const totalQuestions = course.qcms.length;
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const passed = score >= course.examPassScore;
    
    // Update exam attempt
    examAttempt.answers = answers;
    examAttempt.score = score;
    examAttempt.passed = passed;
    examAttempt.isCompleted = true;
    examAttempt.submittedAt = new Date();
    
    // Calculate duration
    if (examAttempt.startedAt) {
      const durationMs = examAttempt.submittedAt.getTime() - examAttempt.startedAt.getTime();
      examAttempt.durationInSeconds = Math.floor(durationMs / 1000);
    }
    
    await this.examAttemptRepository.save(examAttempt);
    
    // Log activity
    await this.userActivityRepository.save({
      userId,
      courseId,
      examId: examAttempt.id,
      activityType: ActivityType.COMPLETE_EXAM
    });
    
    // Update course progress
    await this.courseProgressService.updateCourseProgress(userId, courseId);
    
    // If the user passed, generate a certificate
    if (passed) {
      try {
        const certificate = await this.certificateService.generateCertificate(
          userId, 
          courseId, 
          examAttempt.id
        );
        
        // Add certificate info to the response
        return {
          id: examAttempt.id,
          score,
          correctAnswers,
          totalQuestions,
          passed,
          passScore: course.examPassScore,
          message: 'Congratulations! You passed the exam.',
          certificate: {
            id: certificate.id,
            certificateNumber: certificate.certificateNumber,
            pdfUrl: certificate.pdfUrl
          }
        };
      } catch (error) {
        this.logger.error(`Failed to generate certificate: ${error.message}`);
        // Continue without certificate if generation fails
      }
    }
    
    return {
      id: examAttempt.id,
      score,
      correctAnswers,
      totalQuestions,
      passed,
      passScore: course.examPassScore,
      message: passed ? 'Congratulations! You passed the exam.' : 'You did not pass the exam. Try again after reviewing the course material.'
    };
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

  async startExam(userId: number, courseId: number) {
    // Check enrollment
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Get course
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    // Check if there's an active exam attempt
    const activeAttempt = await this.examAttemptRepository.findOne({
      where: {
        userId,
        courseId,
        isCompleted: false
      }
    });
    
    if (activeAttempt) {
      return {
        message: 'You already have an active exam attempt',
        examId: activeAttempt.id,
        startedAt: activeAttempt.startedAt,
        examDuration: course.examDuration
      };
    }
    
    // Create new exam attempt
    const examAttempt = this.examAttemptRepository.create({
      userId,
      courseId,
      startedAt: new Date(),
      isCompleted: false
    });
    
    await this.examAttemptRepository.save(examAttempt);
    
    // Record activity
    const activity = this.userActivityRepository.create({
      userId,
      courseId,
      examId: examAttempt.id,
      activityType: ActivityType.START_EXAM
    });
    
    await this.userActivityRepository.save(activity);
    
    return {
      message: 'Exam started successfully',
      examId: examAttempt.id,
      startedAt: examAttempt.startedAt,
      examDuration: course.examDuration
    };
  }

  async getExamTimeRemaining(userId: number, courseId: number) {
    // Check if enrolled
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
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
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
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

  async getExamQuestions(userId: number, courseId: number) {
    // Check enrollment
    await this.enrollmentService.checkEnrollment(userId, courseId);
    
    // Get active exam attempt
    const activeAttempt = await this.examAttemptRepository.findOne({
      where: {
        userId,
        courseId,
        isCompleted: false
      }
    });
    
    if (!activeAttempt) {
      throw new BadRequestException('No active exam. Please start an exam first.');
    }
    
    // Get course
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['qcms']
    });
    
    if (!course || !course.qcms || course.qcms.length === 0) {
      throw new NotFoundException('No questions found for this exam');
    }
    
    // Sort questions by orderIndex
    const sortedQuestions = course.qcms.sort((a, b) => a.orderIndex - b.orderIndex);
    
    // Return questions without correct answers
    return {
      examId: activeAttempt.id,
      startedAt: activeAttempt.startedAt,
      examDuration: course.examDuration,
      questions: sortedQuestions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        questionNumber: q.questionNumber || q.orderIndex
      }))
    };
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
} 
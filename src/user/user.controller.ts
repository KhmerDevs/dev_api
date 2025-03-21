import { Controller, Get, Post, Body, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserGuard } from '../auth/guards/user.guard';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { IsArray, IsNotEmpty, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { Public } from '../auth/decorators/public.decorator';

class AnswerDto {
  @IsNotEmpty()
  qcmId: number;

  @IsNotEmpty()
  answer: number;
}

class SubmitExamDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one answer is required' })
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('courses/published')
  @Public()
  async getPublishedCourses() {
    return this.userService.getPublishedCourses();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, UserGuard)
  getProfile(@Req() req) {
    return this.userService.getProfile(req.user.id);
  }

  @Get('courses')
  @UseGuards(JwtAuthGuard, UserGuard)
  getEnrolledCourses(@Req() req) {
    return this.userService.getEnrolledCourses(req.user.id);
  }

  @Post('enroll')
  @UseGuards(JwtAuthGuard, UserGuard)
  enrollCourse(@Req() req, @Body() enrollCourseDto: EnrollCourseDto) {
    return this.userService.enrollCourse(req.user.id, enrollCourseDto.courseId);
  }

  @Get('courses/:courseId')
  @UseGuards(JwtAuthGuard, UserGuard)
  getCourseDetails(
    @Req() req, 
    @Param('courseId', ParseIntPipe) courseId: number
  ) {
    return this.userService.getCourseDetails(req.user.id, courseId);
  }

  @Get('courses/:courseId/exam')
  @UseGuards(JwtAuthGuard, UserGuard)
  getExam(@Req() req, @Param('courseId') courseId: number) {
    return this.userService.getExam(req.user.id, courseId);
  }

  @Post('courses/:courseId/exam/submit')
  @UseGuards(JwtAuthGuard, UserGuard)
  submitExam(
    @Req() req, 
    @Param('courseId') courseId: number,
    @Body() submitExamDto: SubmitExamDto
  ) {
    return this.userService.submitExam(req.user.id, courseId, submitExamDto.answers);
  }
  
  @Get('courses/:courseId/exam/results')
  @UseGuards(JwtAuthGuard, UserGuard)
  getExamResults(@Req() req, @Param('courseId') courseId: number) {
    return this.userService.getExamResults(req.user.id, courseId);
  }

  @Post('courses/:courseId/exam/start')
  @UseGuards(JwtAuthGuard, UserGuard)
  startExam(@Req() req, @Param('courseId') courseId: number) {
    return this.userService.startExam(req.user.id, courseId);
  }

  @Get('courses/:courseId/exam/time-remaining')
  @UseGuards(JwtAuthGuard, UserGuard)
  getExamTimeRemaining(@Req() req, @Param('courseId') courseId: number) {
    return this.userService.getExamTimeRemaining(req.user.id, courseId);
  }

  @Get('exam-history')
  @UseGuards(JwtAuthGuard, UserGuard)
  getExamHistory(@Req() req) {
    return this.userService.getExamHistory(req.user.id);
  }

  @Get('courses/:courseId/exam-history')
  @UseGuards(JwtAuthGuard, UserGuard)
  getCourseExamHistory(@Req() req, @Param('courseId') courseId: number) {
    return this.userService.getCourseExamHistory(req.user.id, courseId);
  }

  @Post('courses/:courseId/lessons/:lessonId/view')
  @UseGuards(JwtAuthGuard, UserGuard)
  markLessonViewed(
    @Req() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() body: { timeSpentSeconds?: number }
  ) {
    return this.userService.markLessonViewed(
      req.user.id, 
      courseId, 
      lessonId, 
      body.timeSpentSeconds
    );
  }

  @Post('courses/:courseId/lessons/:lessonId/complete')
  @UseGuards(JwtAuthGuard, UserGuard)
  markLessonCompleted(
    @Req() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('lessonId', ParseIntPipe) lessonId: number
  ) {
    return this.userService.markLessonCompleted(req.user.id, courseId, lessonId);
  }

  @Post('courses/:courseId/lessons/:lessonId/exercises/:exerciseId/submit')
  @UseGuards(JwtAuthGuard, UserGuard)
  submitPracticeExercise(
    @Req() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
    @Body() body: { submittedCode: string }
  ) {
    return this.userService.submitPracticeExercise(
      req.user.id,
      courseId,
      lessonId,
      exerciseId,
      body.submittedCode
    );
  }

  @Get('courses/:courseId/progress')
  @UseGuards(JwtAuthGuard, UserGuard)
  getCourseProgress(
    @Req() req,
    @Param('courseId', ParseIntPipe) courseId: number
  ) {
    return this.userService.getCourseProgress(req.user.id, courseId);
  }
} 
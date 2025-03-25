export class PracticeExerciseResponseDto {
  exerciseNumber: number;
  id: number;
  instructions: string;
  starterCode: string;
  solution: string;
  isEnabled: boolean;
  orderIndex?: number;
}

export class LessonResponseDto {
  id: number;
  title: string;
  content: string;
  courseId: number;
  orderIndex: number;
  lessonNumber: number;  // This will be 1, 2, 3, etc. for each course
  codeExamples?: any[];
  practiceExercises?: any[];
  createdAt?: Date;
  updatedAt?: Date;
} 
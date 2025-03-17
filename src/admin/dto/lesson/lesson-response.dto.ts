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
  lessonNumber: number;  // This will be 1, 2, 3, etc. for each course
  title: string;
  content: string;
  codeExamples?: {
    exampleNumber: number;  // Sequential number within the lesson
    title: string;
    programmingLanguage: string;
    code: string;
    explanation: string;
    orderIndex: number;
  }[];
  practiceExercises?: PracticeExerciseResponseDto[];
  createdAt: Date;
  updatedAt: Date;
} 
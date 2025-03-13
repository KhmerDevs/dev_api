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
  practiceExercises?: {
    exerciseNumber: number;  // Sequential number within the lesson
    instructions: string;
    starterCode: string;
    solution: string;
    isEnabled: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
} 
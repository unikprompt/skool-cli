/** Skool community post */
export interface SkoolPost {
  title: string;
  author: string;
  category: string;
  likes: number;
  comments: number;
  preview: string;
  url: string;
}

/** Skool community member */
export interface SkoolMember {
  name: string;
  level: number;
  points: number;
  contributions: number;
}

/** Skool course info */
export interface SkoolCourse {
  name: string;
  modules: SkoolModule[];
}

/** Skool module (folder) in a course */
export interface SkoolModule {
  name: string;
  lessons: string[];
}

/** Options for creating a lesson */
export interface CreateLessonOptions {
  group: string;
  module: string;
  title: string;
  course?: string;
  htmlContent?: string;
  markdownContent?: string;
  filePath?: string;
}

/** Options for creating a post */
export interface CreatePostOptions {
  group: string;
  title: string;
  body: string;
  category?: string;
}

/** Result of an operation */
export interface OperationResult {
  success: boolean;
  message: string;
}

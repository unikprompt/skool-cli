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

/** A resource attached to a lesson (link or file) */
export interface LessonResource {
  title: string;
  link: string;
}

/** Options for creating a lesson */
export interface CreateLessonOptions {
  group: string;
  module: string;
  title: string;
  course?: string;
  folder?: string;
  folderId?: string;
  htmlContent?: string;
  markdownContent?: string;
  filePath?: string;
  videoUrl?: string;
  resources?: LessonResource[];
}

/** Options for editing an existing lesson */
export interface EditLessonOptions {
  id: string;
  title?: string;
  htmlContent?: string;
  markdownContent?: string;
  filePath?: string;
  videoUrl?: string;
  resources?: LessonResource[];
}

/** Options for creating a folder */
export interface CreateFolderOptions {
  group: string;
  title: string;
  course?: string;
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

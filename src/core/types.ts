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

/** Options for creating a course */
export interface CreateCourseOptions {
  group: string;
  title: string;
  description?: string;
  privacy?: "open" | "level" | "buy" | "time" | "private";
  coverImage?: string;
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

/** Authenticated user's profile */
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  bio: string;
  location: string;
  website: string;
  photoUrl: string;
  socialLinks: {
    twitter: string;
    instagram: string;
    linkedin: string;
    facebook: string;
    youtube: string;
  };
  theme: string;
  timezone: string;
  createdAt: string;
}

/** Community the user belongs to */
export interface UserCommunity {
  id: string;
  name: string;
  displayName: string;
  description: string;
  memberCount: number;
  logoUrl: string;
  color: string;
  isOwner: boolean;
}

/** Options for editing user profile */
export interface EditProfileOptions {
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  youtube?: string;
}

/** A notification from Skool */
export interface SkoolNotification {
  id: string;
  action: string;
  displayName: string;
  text: string;
  groupName: string;
  link: string;
  unread: boolean;
  createdAt: string;
}

/** A chat channel (DM conversation) */
export interface ChatChannel {
  id: string;
  userName: string;
  userBio: string;
  userPhotoUrl: string;
  lastMessageAt: string;
  unreadCount: number;
  lastMessagePreview: string;
}

/** A chat message */
export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
}

/** Result of an operation */
export interface OperationResult {
  success: boolean;
  message: string;
}

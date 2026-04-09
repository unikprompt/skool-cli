#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { Command } from "commander";
import { checkForUpdate } from "./core/update-checker.js";
import { loginCommand } from "./commands/login.js";
import { whoamiCommand } from "./commands/whoami.js";
import { createCourseCommand } from "./commands/create-course.js";
import { editCourseCommand } from "./commands/edit-course.js";
import { listCoursesCommand } from "./commands/list-courses.js";
import { moveCourseCommand } from "./commands/move-course.js";
import { duplicateCourseCommand } from "./commands/duplicate-course.js";
import { deleteCourseCommand } from "./commands/delete-course.js";
import { createLessonCommand } from "./commands/create-lesson.js";
import { createFolderCommand } from "./commands/create-folder.js";
import { createPostCommand } from "./commands/create-post.js";
import { editPostCommand } from "./commands/edit-post.js";
import { deletePostCommand } from "./commands/delete-post.js";
import { getPostsCommand } from "./commands/get-posts.js";
import { getCategoriesCommand } from "./commands/get-categories.js";
import { getMembersCommand } from "./commands/get-members.js";
import { getAnalyticsCommand } from "./commands/get-analytics.js";
import { getLeaderboardCommand } from "./commands/get-leaderboard.js";
import { editLessonCommand } from "./commands/edit-lesson.js";
import { moveLessonCommand } from "./commands/move-lesson.js";
import { deleteLessonCommand } from "./commands/delete-lesson.js";
import { listLessonsCommand } from "./commands/list-lessons.js";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
) as { version: string };

const program = new Command();

program
  .name("skool")
  .description(
    "CLI for Skool.com automation, create lessons, posts, and manage communities"
  )
  .version(pkg.version);

// Auth
program.addCommand(loginCommand);
program.addCommand(whoamiCommand);

// Classroom
program.addCommand(createCourseCommand);
program.addCommand(editCourseCommand);
program.addCommand(listCoursesCommand);
program.addCommand(moveCourseCommand);
program.addCommand(duplicateCourseCommand);
program.addCommand(deleteCourseCommand);
program.addCommand(createLessonCommand);
program.addCommand(createFolderCommand);
program.addCommand(editLessonCommand);
program.addCommand(moveLessonCommand);
program.addCommand(deleteLessonCommand);
program.addCommand(listLessonsCommand);

// Calendar
import { createEventCommand } from "./commands/create-event.js";
import { editEventCommand } from "./commands/edit-event.js";
import { listEventsCommand } from "./commands/list-events.js";
import { deleteEventCommand } from "./commands/delete-event.js";
program.addCommand(createEventCommand);
program.addCommand(editEventCommand);
program.addCommand(listEventsCommand);
program.addCommand(deleteEventCommand);

// Community
program.addCommand(createPostCommand);
program.addCommand(editPostCommand);
program.addCommand(deletePostCommand);
program.addCommand(getPostsCommand);
program.addCommand(getCategoriesCommand);

// Members
program.addCommand(getMembersCommand);
program.addCommand(getLeaderboardCommand);
program.addCommand(getAnalyticsCommand);

// Group
import { editAboutCommand } from "./commands/edit-about.js";
program.addCommand(editAboutCommand);

// User / Profile
import { getProfileCommand } from "./commands/get-profile.js";
import { editProfileCommand } from "./commands/edit-profile.js";
import { listCommunitiesCommand } from "./commands/list-communities.js";
program.addCommand(getProfileCommand);
program.addCommand(editProfileCommand);
program.addCommand(listCommunitiesCommand);

// Notifications
import { getNotificationsCommand } from "./commands/get-notifications.js";
import { markNotificationsReadCommand } from "./commands/mark-notifications-read.js";
program.addCommand(getNotificationsCommand);
program.addCommand(markNotificationsReadCommand);

// Chat
import { getChatsCommand } from "./commands/get-chats.js";
import { getChatMessagesCommand } from "./commands/get-chat-messages.js";
import { sendChatMessageCommand } from "./commands/send-chat-message.js";
program.addCommand(getChatsCommand);
program.addCommand(getChatMessagesCommand);
program.addCommand(sendChatMessageCommand);

// Watch
import { watchMembersCommand } from "./commands/watch-members.js";
import { watchPendingCommand } from "./commands/watch-pending.js";
program.addCommand(watchMembersCommand);
program.addCommand(watchPendingCommand);

program.parse();

checkForUpdate(pkg.version).catch(() => {});

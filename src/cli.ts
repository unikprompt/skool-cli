#!/usr/bin/env node

import { Command } from "commander";
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
import { getLeaderboardCommand } from "./commands/get-leaderboard.js";
import { editLessonCommand } from "./commands/edit-lesson.js";
import { moveLessonCommand } from "./commands/move-lesson.js";
import { deleteLessonCommand } from "./commands/delete-lesson.js";
import { listLessonsCommand } from "./commands/list-lessons.js";

const program = new Command();

program
  .name("skool")
  .description(
    "CLI for Skool.com automation — create lessons, posts, and manage communities"
  )
  .version("1.0.0");

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

// Community
program.addCommand(createPostCommand);
program.addCommand(editPostCommand);
program.addCommand(deletePostCommand);
program.addCommand(getPostsCommand);
program.addCommand(getCategoriesCommand);

// Members
program.addCommand(getMembersCommand);
program.addCommand(getLeaderboardCommand);

program.parse();

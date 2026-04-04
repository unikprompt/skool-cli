#!/usr/bin/env node

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { whoamiCommand } from "./commands/whoami.js";
import { createLessonCommand } from "./commands/create-lesson.js";
import { createFolderCommand } from "./commands/create-folder.js";
import { createPostCommand } from "./commands/create-post.js";
import { getPostsCommand } from "./commands/get-posts.js";
import { getCategoriesCommand } from "./commands/get-categories.js";
import { getMembersCommand } from "./commands/get-members.js";
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
program.addCommand(createLessonCommand);
program.addCommand(createFolderCommand);
program.addCommand(deleteLessonCommand);
program.addCommand(listLessonsCommand);

// Community
program.addCommand(createPostCommand);
program.addCommand(getPostsCommand);
program.addCommand(getCategoriesCommand);

// Members
program.addCommand(getMembersCommand);

program.parse();

#!/usr/bin/env node

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { whoamiCommand } from "./commands/whoami.js";
import { createLessonCommand } from "./commands/create-lesson.js";
import { createPostCommand } from "./commands/create-post.js";
import { getPostsCommand } from "./commands/get-posts.js";
import { getCategoriesCommand } from "./commands/get-categories.js";
import { getMembersCommand } from "./commands/get-members.js";
import { debugCommand } from "./commands/debug.js";
import { debugApiCommand } from "./commands/debug-api.js";
import { testApiCommand } from "./commands/test-api.js";
import { debugManualCommand } from "./commands/debug-manual.js";
import { createFolderCommand } from "./commands/create-folder.js";

const program = new Command();

program
  .name("skool")
  .description(
    "CLI for Skool.com automation — create lessons, posts, and manage communities"
  )
  .version("1.0.0");

// Auth commands
program.addCommand(loginCommand);
program.addCommand(whoamiCommand);

// Classroom commands
program.addCommand(createLessonCommand);
program.addCommand(createFolderCommand);

// Community commands
program.addCommand(createPostCommand);
program.addCommand(getPostsCommand);
program.addCommand(getCategoriesCommand);

// Members commands
program.addCommand(getMembersCommand);

// Debug
program.addCommand(debugCommand);
program.addCommand(debugApiCommand);
program.addCommand(testApiCommand);
program.addCommand(debugManualCommand);

program.parse();

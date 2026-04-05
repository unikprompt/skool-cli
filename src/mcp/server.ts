#!/usr/bin/env node
/**
 * skool-mcp-server — MCP Server for Skool.com
 *
 * Wraps skool-cli's SkoolClient as MCP tools for Claude Code, Cursor, etc.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SkoolClient } from "../core/skool-client.js";

const client = new SkoolClient();

const server = new McpServer({
  name: "skool-mcp-server",
  version: "1.0.0",
});

// ----------------------------------------------------------
// Auth tools
// ----------------------------------------------------------

server.tool(
  "skool_login",
  "Login to Skool with email and password. Run this first.",
  {
    email: z.string().describe("Skool account email"),
    password: z.string().describe("Skool account password"),
  },
  async ({ email, password }) => {
    const result = await client.login(email, password);
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

server.tool(
  "skool_check_session",
  "Check if the current Skool session is active",
  {
    group: z.string().describe("Skool group slug (e.g. 'operadores-aumentados')"),
  },
  async ({ group }) => {
    const result = await client.checkSession(group);
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

// ----------------------------------------------------------
// Classroom tools
// ----------------------------------------------------------

server.tool(
  "skool_create_course",
  "Create a new course in a Skool group",
  {
    group: z.string().describe("Skool group slug"),
    title: z.string().describe("Course title (max 50 chars)"),
    description: z.string().optional().describe("Course description (max 500 chars)"),
    privacy: z.enum(["open", "level", "buy", "time", "private"]).optional().describe("Access type (default: open)"),
    cover_image: z.string().optional().describe("Local file path for cover image"),
  },
  async (args) => {
    const result = await client.createCourse({
      group: args.group,
      title: args.title,
      description: args.description,
      privacy: args.privacy,
      coverImage: args.cover_image,
    });
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

server.tool(
  "skool_list_courses",
  "List all courses in a Skool group",
  {
    group: z.string().describe("Skool group slug"),
  },
  async ({ group }) => {
    const result = await client.listCourses(group);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "skool_edit_course",
  "Edit a course's title, description, or privacy",
  {
    id: z.string().describe("Course ID to edit"),
    title: z.string().optional().describe("New title"),
    description: z.string().optional().describe("New description"),
    privacy: z.enum(["open", "level", "buy", "time", "private"]).optional().describe("Access type"),
    cover_image: z.string().optional().describe("Local file path for cover image"),
    group: z.string().optional().describe("Skool group slug (required with cover_image)"),
  },
  async (args) => {
    const result = await client.editCourse({
      id: args.id,
      title: args.title,
      description: args.description,
      privacy: args.privacy,
      coverImage: args.cover_image,
      group: args.group,
    });
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

server.tool(
  "skool_move_course",
  "Move a course left or right in the classroom order",
  {
    id: z.string().describe("Course ID to move"),
    direction: z.enum(["left", "right"]).describe("Direction to move"),
  },
  async ({ id, direction }) => {
    const result = await client.moveCourse(id, direction);
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

server.tool(
  "skool_duplicate_course",
  "Duplicate a course with all its content",
  {
    id: z.string().describe("Course ID to duplicate"),
  },
  async ({ id }) => {
    const result = await client.duplicateCourse(id);
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

server.tool(
  "skool_delete_course",
  "Delete a course by ID",
  {
    id: z.string().describe("Course ID to delete"),
  },
  async ({ id }) => {
    const result = await client.deleteCourse(id);
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

server.tool(
  "skool_create_lesson",
  "Create a new lesson in a Skool classroom. Supports markdown, HTML, or JSON content.",
  {
    group: z.string().describe("Skool group slug"),
    title: z.string().describe("Lesson title (max 50 chars)"),
    markdown_content: z.string().optional().describe("Lesson content in markdown"),
    html_content: z.string().optional().describe("Lesson content in HTML"),
    course: z.string().optional().describe("Course name (if multiple courses)"),
    folder: z.string().optional().describe("Folder/module name to create lesson in"),
    folder_id: z.string().optional().describe("Folder ID directly"),
    video_url: z.string().optional().describe("YouTube/Vimeo/Loom video URL"),
    resources: z.array(z.object({ title: z.string(), link: z.string() })).optional().describe("Attached resource links"),
  },
  async (args) => {
    const result = await client.createLesson({
      group: args.group,
      module: args.folder || "",
      title: args.title,
      course: args.course,
      folder: args.folder,
      folderId: args.folder_id,
      markdownContent: args.markdown_content,
      htmlContent: args.html_content,
      videoUrl: args.video_url,
      resources: args.resources,
    });
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

server.tool(
  "skool_create_folder",
  "Create a new folder (module) in a Skool classroom course",
  {
    group: z.string().describe("Skool group slug"),
    title: z.string().describe("Folder name (max 50 chars)"),
    course: z.string().optional().describe("Course name"),
  },
  async (args) => {
    const result = await client.createFolder({
      group: args.group,
      title: args.title,
      course: args.course,
    });
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

server.tool(
  "skool_edit_lesson",
  "Edit an existing lesson's title and/or content",
  {
    id: z.string().describe("Lesson ID to edit"),
    title: z.string().optional().describe("New title"),
    html_content: z.string().optional().describe("HTML content"),
    markdown_content: z.string().optional().describe("Markdown content"),
    video_url: z.string().optional().describe("YouTube/Vimeo/Loom video URL"),
    resources: z.array(z.object({ title: z.string(), link: z.string() })).optional().describe("Attached resource links"),
  },
  async (args) => {
    const result = await client.editLesson({
      id: args.id,
      title: args.title,
      htmlContent: args.html_content,
      markdownContent: args.markdown_content,
      videoUrl: args.video_url,
      resources: args.resources,
    });
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

server.tool(
  "skool_move_lesson",
  "Move a lesson to a different folder",
  {
    id: z.string().describe("Lesson ID to move"),
    target_folder_id: z.string().optional().describe("Target folder ID"),
    target_folder: z.string().optional().describe("Target folder name"),
    group: z.string().optional().describe("Skool group slug (required with target_folder)"),
    course: z.string().optional().describe("Course name"),
  },
  async (args) => {
    const result = await client.moveLesson({
      id: args.id,
      targetFolderId: args.target_folder_id,
      targetFolder: args.target_folder,
      group: args.group,
      course: args.course,
    });
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

server.tool(
  "skool_delete_lesson",
  "Delete a lesson or folder by ID",
  {
    id: z.string().describe("Page or folder ID to delete"),
  },
  async ({ id }) => {
    const result = await client.deleteLesson(id);
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

server.tool(
  "skool_list_lessons",
  "List all lessons and folders in a Skool classroom course",
  {
    group: z.string().describe("Skool group slug"),
    course: z.string().optional().describe("Course name"),
  },
  async (args) => {
    const result = await client.listLessons(args.group, args.course);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ----------------------------------------------------------
// Community tools
// ----------------------------------------------------------

server.tool(
  "skool_create_post",
  "Create a new community post in Skool",
  {
    group: z.string().describe("Skool group slug"),
    title: z.string().describe("Post title"),
    body: z.string().describe("Post body text"),
    category: z.string().optional().describe("Post category name"),
  },
  async (args) => {
    const result = await client.createPost({
      group: args.group,
      title: args.title,
      body: args.body,
      category: args.category,
    });
    return {
      content: [{ type: "text", text: result.success ? `OK: ${result.message}` : `FAIL: ${result.message}` }],
    };
  }
);

server.tool(
  "skool_get_posts",
  "List community posts from a Skool group",
  {
    group: z.string().describe("Skool group slug"),
  },
  async ({ group }) => {
    const result = await client.getPosts(group);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "skool_get_categories",
  "List post categories in a Skool group",
  {
    group: z.string().describe("Skool group slug"),
  },
  async ({ group }) => {
    const result = await client.getCategories(group);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "skool_get_members",
  "List or search members in a Skool group",
  {
    group: z.string().describe("Skool group slug"),
    search: z.string().optional().describe("Search by name"),
  },
  async (args) => {
    const result = await client.getMembers(args.group, args.search);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ----------------------------------------------------------
// Start server
// ----------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[skool-mcp-server] Running");
}

main().catch((error) => {
  console.error("[skool-mcp-server] Fatal:", error);
  process.exit(1);
});

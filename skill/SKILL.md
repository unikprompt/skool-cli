---
name: skool-cli
description: Automate Skool.com classroom and community management via CLI commands. Create lessons, folders, posts, and manage members.
---

# skool-cli Skill

Automates Skool.com via `npx skool-cli` commands. No MCP server needed, all operations run via bash.

## Prerequisites

1. Node.js >= 18 installed
2. Playwright Chromium: `npx playwright install chromium`
3. Login once: `npx skool-cli login --email EMAIL --password PASSWORD`

Session persists in `~/.skool-cli/` across invocations.

## Commands Reference

### Authentication

```bash
# Login (saves session for future use)
npx skool-cli login --email EMAIL --password PASSWORD

# Check session
npx skool-cli whoami --group GROUP_SLUG
```

### Classroom - Lessons

```bash
# Create lesson from markdown
npx skool-cli create-lesson -g GROUP_SLUG --course "COURSE_NAME" -t "TITLE" --markdown "## Heading\n\nContent here"

# Create lesson from file (.md, .html, or .json with skool_class)
npx skool-cli create-lesson -g GROUP_SLUG --course "COURSE_NAME" -t "TITLE" --file path/to/content.md

# Create lesson inside a specific folder/module
npx skool-cli create-lesson -g GROUP_SLUG --course "COURSE_NAME" --folder-id FOLDER_ID -t "TITLE" --markdown "content"

# Delete lesson or folder by ID
npx skool-cli delete-lesson --id PAGE_ID

# List all lessons and folders in a course
npx skool-cli list-lessons -g GROUP_SLUG --course "COURSE_NAME"
npx skool-cli list-lessons -g GROUP_SLUG --json
```

### Classroom - Folders (Modules)

```bash
# Create folder/module in a course
npx skool-cli create-folder -g GROUP_SLUG --course "COURSE_NAME" -t "MODULE_NAME"
```

The create-folder command returns the folder ID. Use it with `--folder-id` when creating lessons inside that folder.

### Community - Posts

```bash
# Create post
npx skool-cli create-post -g GROUP_SLUG -t "POST TITLE" -b "Post body text" -c "CATEGORY_NAME"

# Create post from file
npx skool-cli create-post -g GROUP_SLUG -t "POST TITLE" --file path/to/post.txt -c "General"

# List posts
npx skool-cli get-posts -g GROUP_SLUG
npx skool-cli get-posts -g GROUP_SLUG --json

# List categories
npx skool-cli get-categories -g GROUP_SLUG
```

### Members

```bash
# List members
npx skool-cli get-members -g GROUP_SLUG

# Search members
npx skool-cli get-members -g GROUP_SLUG --search "name"

# JSON output
npx skool-cli get-members -g GROUP_SLUG --json
```

## Common Flows

### Create a complete course module with lessons

```bash
# 1. Create the folder (module)
npx skool-cli create-folder -g my-group --course "My Course" -t "Module 1: Basics"
# Output: OK: Folder "Module 1: Basics" created. ID: abc123...

# 2. Create lessons inside the folder
npx skool-cli create-lesson -g my-group --course "My Course" --folder-id abc123 -t "Lesson 1" --file lesson1.md
npx skool-cli create-lesson -g my-group --course "My Course" --folder-id abc123 -t "Lesson 2" --file lesson2.md
```

### Batch create lessons from a directory

```bash
for file in content/*.md; do
  title=$(basename "$file" .md | tr '-' ' ')
  npx skool-cli create-lesson -g my-group --course "My Course" --folder-id FOLDER_ID -t "$title" --file "$file"
done
```

## Content Format

Lessons support markdown with:
- Headings (H1-H4)
- Paragraphs
- **Bold**, *italic*, `inline code`
- Bullet lists and numbered lists
- Code blocks
- Links
- Blockquotes
- Horizontal rules

JSON files with `skool_class` structure (from Content Pipeline) are auto-converted to HTML.

## Environment Variables

Set these to avoid passing flags every time:

```bash
export SKOOL_GROUP=my-group-slug
export SKOOL_EMAIL=me@email.com
export SKOOL_PASSWORD=mypassword
```

Then commands simplify to:
```bash
npx skool-cli get-posts
npx skool-cli create-post -t "Title" -b "Body"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Browser not found" | `npx playwright install chromium` |
| Login fails | Try `SKOOL_CLI_HEADLESS=false npx skool-cli login -e EMAIL -p PASS` to see browser |
| Session expired | Run `npx skool-cli login` again |
| Title too long | Auto-truncated to 50 chars (Skool limit) |
| Bold/italic not rendering | Use markdown: `**bold**` and `*italic*` |

## Notes

- Skool has no public API. This tool uses Playwright for auth and Skool's internal API (api2.skool.com) for content operations.
- Community posts are plain text only (Skool limitation).
- Classroom lessons support rich HTML via TipTap editor format.
- Session cookies persist in `~/.skool-cli/` and survive restarts.

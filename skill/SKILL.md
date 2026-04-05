---
name: skool-cli
description: Automate Skool.com classroom and community management via CLI commands. Create, edit, and delete lessons with rich content (markdown, images, videos, resources). Manage folders, posts, and members.
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
npx skool-cli create-lesson -g GROUP -m "MODULE" --course "COURSE" -t "TITLE" --markdown "## Heading\n\nContent"

# Create lesson from file (.md, .html, or .json with skool_class)
npx skool-cli create-lesson -g GROUP -m "MODULE" --course "COURSE" -t "TITLE" --file content.md

# Create lesson inside a specific folder
npx skool-cli create-lesson -g GROUP -m "MODULE" --course "COURSE" --folder-id FOLDER_ID -t "TITLE" --file content.md

# Create lesson with video and resources
npx skool-cli create-lesson -g GROUP -m "MODULE" --course "COURSE" -t "TITLE" --markdown "content" --video "https://youtu.be/xxx" --resource "Doc Name::https://url.com" --resource "Another::https://url2.com"

# Edit lesson title and/or content
npx skool-cli edit-lesson --id PAGE_ID --title "New Title"
npx skool-cli edit-lesson --id PAGE_ID --file updated.md
npx skool-cli edit-lesson --id PAGE_ID --title "Title" --markdown "## Updated\n\nNew content"

# Edit lesson video and resources
npx skool-cli edit-lesson --id PAGE_ID --video "https://youtu.be/xxx"
npx skool-cli edit-lesson --id PAGE_ID --resource "Link Title::https://url.com"

# Move lesson to a different folder (by folder name)
npx skool-cli move-lesson --id PAGE_ID --target-folder "Module Name" -g GROUP --course "COURSE"

# Move lesson to a different folder (by folder ID)
npx skool-cli move-lesson --id PAGE_ID --target-folder-id FOLDER_ID

# Delete lesson or folder by ID
npx skool-cli delete-lesson --id PAGE_ID

# List all lessons and folders in a course
npx skool-cli list-lessons -g GROUP --course "COURSE"
npx skool-cli list-lessons -g GROUP --json
```

### Classroom - Courses

```bash
# Create a new course
npx skool-cli create-course -g GROUP -t "Course Name" -d "Course description"

# Create course with cover image and privacy
npx skool-cli create-course -g GROUP -t "Premium Course" -d "Description" --privacy level --cover cover.jpg
# Privacy options: open (default), level, buy, time, private

# Edit a course
npx skool-cli edit-course --id COURSE_ID --title "New Name" --description "New desc"
npx skool-cli edit-course --id COURSE_ID --privacy private
npx skool-cli edit-course --id COURSE_ID --cover new-cover.jpg -g GROUP

# List all courses (to get IDs)
npx skool-cli list-courses -g GROUP
npx skool-cli list-courses -g GROUP --json

# Move a course left/right in the classroom
npx skool-cli move-course --id COURSE_ID --direction right
npx skool-cli move-course --id COURSE_ID --direction left

# Duplicate a course (copies all content)
npx skool-cli duplicate-course --id COURSE_ID

# Delete a course
npx skool-cli delete-course --id COURSE_ID
```

### Classroom - Folders (Modules)

```bash
# Create folder/module in a course
npx skool-cli create-folder -g GROUP --course "COURSE" -t "MODULE_NAME"
```

The create-folder command returns the folder ID. Use it with `--folder-id` when creating lessons inside that folder.

### Community - Posts

```bash
# Create post
npx skool-cli create-post -g GROUP -t "POST TITLE" -b "Post body text" -c "CATEGORY"

# Create post from file
npx skool-cli create-post -g GROUP -t "POST TITLE" --file post.txt -c "General"

# Edit a post
npx skool-cli edit-post --id POST_ID --title "New Title" --body "Updated body"
npx skool-cli edit-post --id POST_ID --category CATEGORY_ID

# Delete a post
npx skool-cli delete-post --id POST_ID

# List posts (to get IDs)
npx skool-cli get-posts -g GROUP
npx skool-cli get-posts -g GROUP --json

# List categories (to get category IDs)
npx skool-cli get-categories -g GROUP
```

### Members

### Calendar Events

```bash
# Create an event
npx skool-cli create-event -g GROUP -t "Weekly Q&A" --start "2026-04-10T14:00:00-04:00" --end "2026-04-10T15:00:00-04:00" -d "Open Q&A session"

# Create recurring event (every Monday)
npx skool-cli create-event -g GROUP -t "Weekly Q&A" --start "2026-04-07T20:00:00-04:00" --end "2026-04-07T21:00:00-04:00" --repeat "weekly:mon"

# Edit an event
npx skool-cli edit-event --id EVENT_ID -g GROUP --title "New Title" --description "Updated desc"
npx skool-cli edit-event --id EVENT_ID -g GROUP --start "2026-04-10T15:00:00-04:00" --end "2026-04-10T16:00:00-04:00"

# List events
npx skool-cli list-events -g GROUP
npx skool-cli list-events -g GROUP --json

# Delete an event
npx skool-cli delete-event --id EVENT_ID
```

### Group Settings

```bash
# Edit group description (Settings > General)
npx skool-cli edit-about -g GROUP -d "New description for the group"

# Edit About page landing description (visible to visitors)
npx skool-cli edit-about -g GROUP --about "Landing page description, max 1000 chars"

# Edit group display name
npx skool-cli edit-about -g GROUP -n "New Group Name"
```

### Analytics

```bash
# Get group analytics (members, visitors, signups, conversion, MRR)
npx skool-cli get-analytics -g GROUP
npx skool-cli get-analytics -g GROUP --json
```

### Leaderboard

```bash
# Get leaderboard rankings
npx skool-cli get-leaderboard -g GROUP
npx skool-cli get-leaderboard -g GROUP --period 30d
npx skool-cli get-leaderboard -g GROUP --period 7d --json
```

### Members

```bash
# List members
npx skool-cli get-members -g GROUP

# Search members
npx skool-cli get-members -g GROUP --search "name"

# JSON output
npx skool-cli get-members -g GROUP --json
```

## Content Format

Lessons support full markdown:
- Headings (H1-H4): `## Heading`
- **Bold**: `**text**`, *Italic*: `*text*`, ***Bold+Italic***: `***text***`
- ~~Strikethrough~~: `~~text~~`
- `Inline code`: `` `code` ``
- Code blocks: ` ```language ... ``` `
- Bullet lists: `- item` and numbered: `1. item`
- Links: `[text](url)`
- Images: `![alt text](url)` (URL must allow hotlinking)
- Blockquotes: `> quoted text`
- Horizontal rules: `---`

JSON files with `skool_class` structure (from Content Pipeline) are auto-converted.

## Common Flows

### Create a complete course module with lessons

```bash
# 1. Create the folder (module)
npx skool-cli create-folder -g my-group --course "My Course" -t "Module 1: Basics"
# Output: OK: Folder "Module 1: Basics" created. ID: abc123...

# 2. Create lessons inside the folder with video and resources
npx skool-cli create-lesson -g my-group -m "Module 1: Basics" --course "My Course" --folder-id abc123 -t "Lesson 1" --file lesson1.md --video "https://youtu.be/xxx" --resource "Slides::https://docs.google.com/..."
npx skool-cli create-lesson -g my-group -m "Module 1: Basics" --course "My Course" --folder-id abc123 -t "Lesson 2" --file lesson2.md
```

### Edit an existing lesson

```bash
# Get lesson IDs
npx skool-cli list-lessons -g my-group --json

# Update content
npx skool-cli edit-lesson --id PAGE_ID --title "Better Title" --file updated.md

# Add video to existing lesson
npx skool-cli edit-lesson --id PAGE_ID --video "https://youtu.be/xxx"

# Add resources
npx skool-cli edit-lesson --id PAGE_ID --resource "Guide::https://example.com" --resource "API Docs::https://docs.example.com"
```

### Batch create lessons from a directory

```bash
for file in content/*.md; do
  title=$(basename "$file" .md | tr '-' ' ')
  npx skool-cli create-lesson -g my-group -m "Module" --course "My Course" --folder-id FOLDER_ID -t "$title" --file "$file"
done
```

## Environment Variables

Set these to avoid passing flags every time:

```bash
export SKOOL_GROUP=my-group-slug
export SKOOL_EMAIL=me@email.com
export SKOOL_PASSWORD=mypassword
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Browser not found" | `npx playwright install chromium` |
| Login fails | Try `SKOOL_CLI_HEADLESS=false npx skool-cli login -e EMAIL -p PASS` to see browser |
| Session expired | Run `npx skool-cli login` again |
| Title too long | Auto-truncated to 50 chars (Skool limit) |
| Image not showing | URL must allow hotlinking (no auth-gated or CDN-blocked URLs) |
| Bold/italic not rendering | Use markdown: `**bold**` and `*italic*` |

## Notes

- Skool has no public API. This tool uses Playwright for auth and Skool's internal API (api2.skool.com) for content operations.
- Community posts are plain text only (Skool limitation).
- Classroom lessons support rich content via TipTap editor format.
- Videos support YouTube, Vimeo, and Loom URLs.
- Resources are link attachments shown below the lesson content.
- Session cookies persist in `~/.skool-cli/` and survive restarts.

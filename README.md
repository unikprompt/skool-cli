# skool-cli

CLI and programmatic API for [Skool.com](https://www.skool.com) automation. Create courses, lessons, posts, and manage your Skool groups from the terminal.

**Skool has no public API.** This tool uses browser automation (Playwright) for auth and Skool's internal API for all content operations.

## Quick Start

```bash
# Install globally
npm install -g skool-cli

# Or run directly with npx
npx skool-cli login --email you@email.com --password yourpass

# Install browser (first time only)
npx playwright install chromium
```

## Commands

### Authentication

```bash
skool login --email you@email.com --password yourpass
skool whoami --group my-community
```

### Courses

```bash
# Create a new course
skool create-course -g my-community -t "Course Name" -d "Description"

# Create course with cover image and privacy
skool create-course -g my-community -t "Premium Course" -d "Desc" --privacy level --cover cover.jpg
# Privacy options: open (default), level, buy, time, private

# Edit a course
skool edit-course --id COURSE_ID --title "New Name" --description "Updated desc"
skool edit-course --id COURSE_ID --privacy private
skool edit-course --id COURSE_ID --cover new-cover.jpg -g my-community

# List courses (to get IDs)
skool list-courses -g my-community
skool list-courses -g my-community --json

# Move a course left/right in the classroom
skool move-course --id COURSE_ID --direction right

# Duplicate a course (copies all content)
skool duplicate-course --id COURSE_ID

# Delete a course
skool delete-course --id COURSE_ID
```

### Lessons

```bash
# Create lesson from markdown file
skool create-lesson -g my-community -m "Module" --course "Course" -t "Title" -f lesson.md

# Create lesson with video and resources
skool create-lesson -g my-community -m "Module" --course "Course" -t "Title" \
  --markdown "## Content" \
  --video "https://youtu.be/xxx" \
  --resource "Docs::https://docs.example.com" \
  --resource "Slides::https://slides.example.com"

# Create lesson in a specific folder (by name or ID)
skool create-lesson -g my-community -m "Module" --course "Course" --folder "Module 1" -t "Title" -f content.md
skool create-lesson -g my-community -m "Module" --course "Course" --folder-id FOLDER_ID -t "Title" -f content.md

# Edit an existing lesson
skool edit-lesson --id PAGE_ID --title "New Title"
skool edit-lesson --id PAGE_ID --file updated.md
skool edit-lesson --id PAGE_ID --video "https://youtu.be/xxx"
skool edit-lesson --id PAGE_ID --resource "Guide::https://example.com"

# Move a lesson to a different folder
skool move-lesson --id PAGE_ID --target-folder "Module 2" -g my-community --course "Course"
skool move-lesson --id PAGE_ID --target-folder-id FOLDER_ID

# Delete a lesson or folder
skool delete-lesson --id PAGE_ID

# List lessons and folders
skool list-lessons -g my-community --course "Course"
skool list-lessons -g my-community --json
```

### Folders (Modules)

```bash
skool create-folder -g my-community --course "Course" -t "Module Name"
```

### Calendar Events

```bash
# Create a one-time event
skool create-event -g my-community -t "Workshop" \
  --start "2026-04-10T14:00:00-04:00" --end "2026-04-10T15:00:00-04:00" \
  -d "Description" --cover cover.jpg

# Create a recurring event (every Monday)
skool create-event -g my-community -t "Weekly Q&A" \
  --start "2026-04-07T20:00:00-04:00" --end "2026-04-07T21:00:00-04:00" \
  --repeat "weekly:mon"
# Repeat options: weekly:mon,wed | daily | biweekly:fri

# Edit an event (preserves recurrence unless --repeat is specified)
skool edit-event --id EVENT_ID -g my-community --title "New Title"
skool edit-event --id EVENT_ID -g my-community --repeat "weekly:tue"

# List events
skool list-events -g my-community --json

# Delete an event
skool delete-event --id EVENT_ID
```

### Leaderboard

```bash
skool get-leaderboard -g my-community
skool get-leaderboard -g my-community --period 30d --json
# Periods: all (default), 30d, 7d
```

### Community Posts

```bash
# Create a post
skool create-post -g my-community -t "Title" -b "Body text" -c "General"

# Edit a post
skool edit-post --id POST_ID --title "Updated Title" --body "New body"

# Delete a post
skool delete-post --id POST_ID

# List posts and categories
skool get-posts -g my-community --json
skool get-categories -g my-community
```

### Members

```bash
skool get-members -g my-community
skool get-members -g my-community --search "name" --json
```

## Content Format

Lessons support full markdown:

- Headings (H1-H4), paragraphs
- **Bold**, *italic*, ***bold+italic***, ~~strikethrough~~, `inline code`
- Code blocks with language hints
- Bullet and numbered lists
- [Links](url) and ![images](url) (local files auto-uploaded)
- > Blockquotes
- Horizontal rules (`---`)

## Programmatic API

```typescript
import { SkoolClient } from 'skool-cli';

const client = new SkoolClient();
await client.login('you@email.com', 'yourpass');

// Create a course with cover image
await client.createCourse({
  group: 'my-community',
  title: 'My Course',
  description: 'Course description',
  coverImage: './cover.jpg',
});

// List, edit, move, duplicate courses
const { courses } = await client.listCourses('my-community');
await client.editCourse({ id: courses[0].id, title: 'Updated Name' });
await client.moveCourse(courses[0].id, 'right');
await client.duplicateCourse(courses[0].id);
await client.deleteCourse(courses[0].id);

// Create a lesson with video and resources
await client.createLesson({
  group: 'my-community',
  module: 'Module 1',
  title: 'Lesson 1',
  markdownContent: '## Hello\n\nThis is a lesson with an ![image](./photo.jpg)',
  videoUrl: 'https://youtu.be/xxx',
  resources: [
    { title: 'Documentation', link: 'https://docs.example.com' },
  ],
});

// Edit a lesson
await client.editLesson({
  id: 'lesson-page-id',
  title: 'Updated Title',
  markdownContent: '## Updated content',
});

// Move a lesson
await client.moveLesson({
  id: 'lesson-page-id',
  targetFolder: 'Module 2',
  group: 'my-community',
  course: 'My Course',
});

// Calendar events
await client.createEvent({
  group: 'my-community',
  title: 'Weekly Q&A',
  startTime: '2026-04-07T20:00:00-04:00',
  endTime: '2026-04-07T21:00:00-04:00',
  recurrence: { frequency: 'weekly', interval: 1, days: [1] },
});
await client.editEvent({ id: 'event-id', group: 'my-community', title: 'Updated' });
await client.deleteEvent('event-id');

// Leaderboard
const { users, levels } = await client.getLeaderboard('my-community', '30d');

// Community posts
await client.createPost({ group: 'my-community', title: 'Hello!', body: 'Post body' });
await client.editPost({ id: 'post-id', title: 'Updated', body: 'New body' });
await client.deletePost('post-id');
const { posts } = await client.getPosts('my-community');
const { members } = await client.getMembers('my-community');

await client.close();
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SKOOL_EMAIL` | Default email for login |
| `SKOOL_PASSWORD` | Default password for login |
| `SKOOL_GROUP` | Default group slug (avoids `--group` every time) |
| `SKOOL_CLI_HEADLESS` | Set to `false` for visible browser (debugging) |
| `SKOOL_CLI_DATA_DIR` | Custom data directory (default: `~/.skool-cli/`) |
| `SKOOL_CLI_TIMEOUT` | Operation timeout in ms (default: 30000) |

## Use as Claude Code Skill

Copy `skill/SKILL.md` to your project:

```bash
mkdir -p .claude/skills/skool-cli
curl -o .claude/skills/skool-cli/SKILL.md https://raw.githubusercontent.com/unikprompt/skool-cli/main/skill/SKILL.md
```

Then tell Claude Code: "Create a lesson in Skool about X" and it will use the CLI commands automatically.

## Use as MCP Server

For Cursor, Windsurf, or other MCP clients:

```json
{
  "mcpServers": {
    "skool": {
      "command": "npx",
      "args": ["-y", "skool-cli", "skool-mcp-server"]
    }
  }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Browser not found" | `npx playwright install chromium` |
| Login fails | Try `SKOOL_CLI_HEADLESS=false` to see the browser |
| Session expired | Run `skool login` again |
| Image not showing | URL must allow hotlinking |
| Title too long | Auto-truncated to 50 chars |

## Learn More

- [LinkedIn](https://www.linkedin.com/in/mario-perez-ed) - Mario Perez Edwards
- [X @mperedwa](https://x.com/mperedwa) - Updates and builds
- [Skool: Operadores Aumentados](https://skool.com/operadores-aumentados) - Premium community
- [UNIKPROMPT](https://unikprompt.com) - More tools and resources

## License

MIT

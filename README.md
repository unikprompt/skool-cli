# skool-cli

CLI, MCP Server, and programmatic API for [Skool.com](https://www.skool.com) automation. 35 commands covering courses, lessons, events, posts, members, analytics, group settings, user profile, notifications, and chat.

**Skool has no public API.** This tool uses browser automation (Playwright) for auth and Skool's internal API for all content operations.

## Quick Start

```bash
npm install -g skool-cli
npx playwright install chromium
skool login --email you@email.com --password yourpass
```

## Commands (35)

### Authentication

```bash
skool login --email you@email.com --password yourpass
skool whoami --group my-community
```

### Courses

```bash
# Create (with optional cover image and privacy)
skool create-course -g my-community -t "Course Name" -d "Description" --cover cover.jpg --privacy level

# Edit
skool edit-course --id COURSE_ID --title "New Name" --description "New desc" --cover new.jpg -g my-community

# List, move, duplicate, delete
skool list-courses -g my-community --json
skool move-course --id COURSE_ID --direction right
skool duplicate-course --id COURSE_ID
skool delete-course --id COURSE_ID
```

### Lessons

```bash
# Create (with video, resources, images, folder placement)
skool create-lesson -g my-community -m "Module" --course "Course" -t "Title" \
  -f lesson.md --video "https://youtu.be/xxx" \
  --resource "Docs::https://docs.example.com" --folder "Module 1"

# Edit, move, delete, list
skool edit-lesson --id PAGE_ID --title "New" --file updated.md --video "url" --resource "title::url"
skool move-lesson --id PAGE_ID --target-folder "Module 2" -g my-community --course "Course"
skool delete-lesson --id PAGE_ID
skool list-lessons -g my-community --course "Course" --json

# Create folders
skool create-folder -g my-community --course "Course" -t "Module Name"
```

### Calendar Events

```bash
# Create (one-time or recurring with cover)
skool create-event -g my-community -t "Weekly Q&A" \
  --start "2026-04-07T20:00:00-04:00" --end "2026-04-07T21:00:00-04:00" \
  --repeat "weekly:mon" --cover event.jpg -d "Description"

# Edit (preserves recurrence unless --repeat specified)
skool edit-event --id EVENT_ID -g my-community --title "New" --repeat "weekly:tue"

# List, delete
skool list-events -g my-community --json
skool delete-event --id EVENT_ID
```

### Community Posts

```bash
# Create, edit, delete (via API, resolves category by name)
skool create-post -g my-community -t "Title" -b "Body" -c "General"
skool edit-post --id POST_ID --title "Updated" --body "New body"
skool delete-post --id POST_ID

# List posts and categories
skool get-posts -g my-community --json
skool get-categories -g my-community
```

### Members & Leaderboard

```bash
skool get-members -g my-community --search "name" --json
skool get-leaderboard -g my-community --period 30d --json
```

### Analytics

```bash
skool get-analytics -g my-community --json
# Returns: members, visitors, signups, conversion rate, MRR
```

### Group Settings

```bash
# Settings > General description
skool edit-about -g my-community -d "Group description"

# About page landing description
skool edit-about -g my-community --about "Landing page text (max 1000 chars)"

# Display name
skool edit-about -g my-community -n "New Group Name"
```

### User Profile

```bash
# Get your profile (name, bio, social links, etc.)
skool get-profile
skool get-profile --json

# Edit profile fields
skool edit-profile --bio "New bio" --location "Fort Myers, FL"
skool edit-profile --website "https://example.com" --twitter "https://x.com/user"

# List your communities
skool list-communities
skool list-communities --json
```

### Notifications

```bash
skool get-notifications --json
skool mark-notifications-read
```

### Chat

```bash
# List conversations
skool get-chats --json

# Read messages
skool get-chat-messages --channel CHANNEL_ID --json

# Send a message
skool send-chat-message --channel CHANNEL_ID -m "Hey!"
```

## Content Format

Lessons support full markdown with auto-upload of local images:

```markdown
## Heading
**Bold**, *italic*, ***both***, ~~strike~~, `code`
- Bullet lists
1. Numbered lists
[Links](url) and ![images](./local.jpg)
> Blockquotes
```code blocks```
---
```

## Programmatic API

```typescript
import { SkoolClient } from 'skool-cli';

const client = new SkoolClient();
await client.login('you@email.com', 'yourpass');

// Courses
await client.createCourse({ group: 'my-community', title: 'Course', coverImage: './cover.jpg' });
const { courses } = await client.listCourses('my-community');
await client.editCourse({ id: courses[0].id, title: 'Updated' });
await client.moveCourse(courses[0].id, 'right');
await client.duplicateCourse(courses[0].id);

// Lessons with video, resources, and local images
await client.createLesson({
  group: 'my-community', module: 'Mod', title: 'Lesson',
  markdownContent: '## Hello\n\n![photo](./img.jpg)',
  videoUrl: 'https://youtu.be/xxx',
  resources: [{ title: 'Docs', link: 'https://docs.example.com' }],
});
await client.editLesson({ id: 'id', title: 'Updated', markdownContent: '## New' });
await client.moveLesson({ id: 'id', targetFolder: 'Mod 2', group: 'my-community', course: 'Course' });

// Events with recurrence
await client.createEvent({
  group: 'my-community', title: 'Q&A',
  startTime: '2026-04-07T20:00:00-04:00', endTime: '2026-04-07T21:00:00-04:00',
  recurrence: { frequency: 'weekly', interval: 1, days: [1] },
});
await client.editEvent({ id: 'id', group: 'my-community', title: 'Updated', repeat: 'weekly:tue' });

// Posts (API-based, resolves categories by name)
await client.createPost({ group: 'my-community', title: 'Hello!', body: 'Post body', category: 'General' });
await client.editPost({ id: 'id', title: 'Updated', body: 'New body' });

// Analytics & Leaderboard
const { data } = await client.getAnalytics('my-community');
const { users, levels } = await client.getLeaderboard('my-community', '30d');

// Group settings
await client.editAbout({ group: 'my-community', aboutDescription: 'Landing page text' });

// User profile
const { profile } = await client.getProfile();
const { communities } = await client.listCommunities();
await client.editProfile({ bio: 'New bio', location: 'City' });

// Notifications & Chat
const { notifications } = await client.getNotifications();
await client.markNotificationsRead();
const { channels } = await client.getChats();
const { messages } = await client.getChatMessages(channels[0].id);
await client.sendChatMessage(channels[0].id, 'Hello!');

await client.close();
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SKOOL_EMAIL` | Default email for login |
| `SKOOL_PASSWORD` | Default password |
| `SKOOL_GROUP` | Default group slug |
| `SKOOL_CLI_HEADLESS` | `false` for visible browser |
| `SKOOL_CLI_DATA_DIR` | Data directory (default: `~/.skool-cli/`) |
| `SKOOL_CLI_TIMEOUT` | Timeout in ms (default: 30000) |

## Use as Claude Code Skill

```bash
mkdir -p .claude/skills/skool-cli
curl -o .claude/skills/skool-cli/SKILL.md https://raw.githubusercontent.com/unikprompt/skool-cli/main/skill/SKILL.md
```

## Use as MCP Server

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

## Learn More

- [LinkedIn](https://www.linkedin.com/in/mario-perez-ed) - Mario Perez Edwards
- [X @mperedwa](https://x.com/mperedwa) - Updates and builds
- [Skool: Operadores Aumentados](https://skool.com/operadores-aumentados) - Premium community
- [UNIKPROMPT](https://unikprompt.com) - More tools and resources

## License

MIT

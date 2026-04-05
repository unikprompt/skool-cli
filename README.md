# skool-cli

CLI and programmatic API for [Skool.com](https://www.skool.com) automation. Create classroom lessons, community posts, and manage your Skool groups from the terminal.

**Skool has no public API.** This tool uses browser automation (Playwright) to give you full programmatic access to Skool's features.

## Killer Feature: Classroom Lessons

Create rich HTML lessons in Skool's classroom with a single command. Supports headers, lists, code blocks, bold, italic, links, and images via TipTap editor injection.

```bash
skool create-lesson \
  --group my-community \
  --module "Getting Started" \
  --title "Your First Lesson" \
  --file lesson.md
```

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
# Login (saves session for future use)
skool login --email you@email.com --password yourpass

# Check session status
skool whoami --group my-community
```

### Classroom (Lessons)

```bash
# Create lesson from markdown file
skool create-lesson -g my-community -m "Module Name" -t "Lesson Title" -f lesson.md

# Create lesson from HTML
skool create-lesson -g my-community -m "Module Name" -t "Lesson Title" --html lesson.html

# Create lesson from content JSON (with skool_class structure)
skool create-lesson -g my-community -m "Module Name" -t "Lesson Title" -f content.json

# Inline markdown
skool create-lesson -g my-community -m "Module Name" -t "Quick Tip" --markdown "## Hello\n\nThis is a lesson."

# Edit an existing lesson (get ID from list-lessons --json)
skool edit-lesson --id PAGE_ID --title "Updated Title"
skool edit-lesson --id PAGE_ID --file updated-content.md
skool edit-lesson --id PAGE_ID --title "New Title" --markdown "## Updated\n\nNew content."

# Delete a lesson
skool delete-lesson --id PAGE_ID

# List lessons (to get IDs)
skool list-lessons -g my-community
skool list-lessons -g my-community --json
```

### Community (Posts)

```bash
# Create a post
skool create-post -g my-community -t "Welcome!" -b "Hello everyone..."

# Create a post from file
skool create-post -g my-community -t "Weekly Update" -f post.txt -c "General"

# List posts
skool get-posts -g my-community
skool get-posts -g my-community --json

# List categories
skool get-categories -g my-community
```

### Members

```bash
# List members
skool get-members -g my-community

# Search members
skool get-members -g my-community --search "mario"

# JSON output
skool get-members -g my-community --json
```

## Programmatic API

Use `skool-cli` as a library in your Node.js projects:

```typescript
import { SkoolClient } from 'skool-cli';

const client = new SkoolClient();

// Login
await client.login('you@email.com', 'yourpass');

// Create a lesson
await client.createLesson({
  group: 'my-community',
  module: 'Getting Started',
  title: 'Lesson 1',
  markdownContent: '## Hello\n\nThis is a lesson.',
});

// Edit a lesson
await client.editLesson({
  id: 'lesson-page-id',
  title: 'Updated Title',
  markdownContent: '## Updated\n\nNew content here.',
});

// Create a post
await client.createPost({
  group: 'my-community',
  title: 'Welcome!',
  body: 'Hello everyone...',
  category: 'General',
});

// Read data
const { posts } = await client.getPosts('my-community');
const { categories } = await client.getCategories('my-community');
const { members } = await client.getMembers('my-community');

// Cleanup
await client.close();
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SKOOL_EMAIL` | Default email for login |
| `SKOOL_PASSWORD` | Default password for login |
| `SKOOL_GROUP` | Default group slug (avoids passing `--group` every time) |
| `SKOOL_CLI_HEADLESS` | Set to `false` for visible browser (debugging) |
| `SKOOL_CLI_DATA_DIR` | Custom data directory (default: `~/.skool-cli/`) |
| `SKOOL_CLI_TIMEOUT` | Operation timeout in ms (default: 30000) |

## How It Works

1. **Login**: Playwright opens a headless Chromium browser and logs into Skool
2. **Session persistence**: Browser profile is saved to `~/.skool-cli/browser-data/`, so subsequent runs reuse the session without re-logging in
3. **Operations**: Each command navigates to the appropriate Skool page and interacts with it programmatically
4. **TipTap injection**: For classroom lessons, HTML is injected directly into Skool's TipTap editor via `editor.commands.setContent()`

## Supported Content Formats

The `create-lesson` command accepts:

- **Markdown** (`.md`): Converted to TipTap-compatible HTML automatically
- **HTML** (`.html`): Injected directly into the editor
- **JSON** (`.json`): Extracts `skool_class` structure and converts to HTML (compatible with content pipeline JSONs)

### Supported HTML Elements

Headers (h1-h4), paragraphs, bold, italic, strikethrough, inline code, code blocks, ordered/unordered lists, blockquotes, horizontal rules, links, images.

**Not supported by Skool's editor**: Tables, iframes (except video embeds), forms.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Browser not found" | Run `npx playwright install chromium` |
| Login fails | Check email/password. Try `SKOOL_CLI_HEADLESS=false` to see the browser |
| Session expired | Run `skool login` again |
| SAVE button not working | Known Skool quirk. The CLI handles this automatically with a dirty-state trigger |
| Title too long | Automatically truncated to 50 characters |
| Community posts look plain | Skool community posts only support plain text (no HTML) |

## Use as Claude Code Skill

For Claude Code users, the **skill** approach is lighter than MCP (no context overhead from tool schemas).

Copy `skill/SKILL.md` to your project:

```bash
mkdir -p .claude/skills/skool-cli
cp node_modules/skool-cli/skill/SKILL.md .claude/skills/skool-cli/SKILL.md
```

Or download from GitHub:

```bash
mkdir -p .claude/skills/skool-cli
curl -o .claude/skills/skool-cli/SKILL.md https://raw.githubusercontent.com/unikprompt/skool-cli/main/skill/SKILL.md
```

Then tell Claude Code: "Create a lesson in Skool about X" and it will use the CLI commands automatically.

## Use as MCP Server

For Cursor, Windsurf, or other MCP clients, add to your MCP config:

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

# CLAUDE.md - skool-cli

## Sobre este proyecto

CLI, Skill y MCP Server para automatizar Skool.com. Publicado en npm como `skool-cli` (v1.0.1) y en GitHub como `unikprompt/skool-cli`.

Skool no tiene API publica. Usamos Playwright para auth y la API interna `api2.skool.com` (descubierta via interceptacion de red) para operaciones de contenido.

## Links

- **npm**: npmjs.com/package/skool-cli
- **GitHub**: github.com/unikprompt/skool-cli
- **Skool group**: skool.com/operadores-aumentados

## Estructura

```
skool-cli/
  src/
    cli.ts                 # Entry point CLI (Commander.js)
    mcp/server.ts          # Entry point MCP Server
    commands/              # 10 comandos CLI
    core/
      skool-client.ts      # API publica (high-level)
      skool-api.ts         # HTTP client + HTML-to-TipTap converter
      page-ops.ts          # Playwright browser ops (nav, posts, auth)
      browser-manager.ts   # Playwright lifecycle + session persistence
      html-generator.ts    # Markdown/JSON → HTML (port de Content-Pipeline)
      config.ts            # Constantes y env vars
      types.ts             # TypeScript interfaces
  skill/SKILL.md           # Claude Code skill (alternativa liviana a MCP)
  dist/                    # Compiled JS (npm publish from here)
```

## Comandos

```bash
skool login -e EMAIL -p PASSWORD     # Auth (guarda cookies en ~/.skool-cli/)
skool whoami -g GROUP                # Verifica sesion
skool create-lesson -g GROUP --course COURSE -t TITULO --markdown "contenido"
skool create-lesson -g GROUP --course COURSE --folder-id ID -t TITULO -f archivo.md
skool create-folder -g GROUP --course COURSE -t "Nombre Modulo"
skool delete-lesson --id PAGE_ID
skool list-lessons -g GROUP --course COURSE
skool create-post -g GROUP -t TITULO -b "body" -c CATEGORIA
skool get-posts -g GROUP
skool get-categories -g GROUP
skool get-members -g GROUP
```

## API Interna de Skool (api2.skool.com)

| Endpoint | Metodo | Que hace |
|----------|--------|----------|
| `/courses` | POST | Crea pagina (`unit_type: "module"`) o folder (`unit_type: "set"`) |
| `/courses/{id}` | PUT | Actualiza titulo + contenido (`desc: "[v2]" + TipTap JSON`) |
| `/courses/{id}` | DELETE | Elimina pagina o folder |

**Auth**: Cookies del browser (`auth_token` JWT).

**IDs necesarios**: `group_id` (de assets URL), `user_id` (de JWT payload), `root_id` (interceptando POST response al crear pagina temporal).

**Formato de contenido**: TipTap JSON con prefijo `[v2]`. Ejemplo:
```json
"[v2][{\"type\":\"heading\",\"attrs\":{\"level\":2},\"content\":[{\"type\":\"text\",\"text\":\"Titulo\"}]},{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Contenido con \"},{\"type\":\"text\",\"text\":\"bold\",\"marks\":[{\"type\":\"bold\"}]}]}]"
```

## Build y publish

```bash
npm run build              # Compila TypeScript
npm version patch          # Bump version
npm publish --access public # Publica en npm
git push origin main       # Push a GitHub
```

**npm account**: `unikprompt` (token en `~/.npmrc`)

## Env vars

| Variable | Default | Uso |
|----------|---------|-----|
| `SKOOL_EMAIL` | - | Email default para login |
| `SKOOL_PASSWORD` | - | Password default |
| `SKOOL_GROUP` | - | Group slug default |
| `SKOOL_CLI_HEADLESS` | `true` | `false` para ver el browser |
| `SKOOL_CLI_DATA_DIR` | `~/.skool-cli/` | Donde se guardan cookies |
| `SKOOL_CLI_TIMEOUT` | `30000` | Timeout en ms |

## Decisiones tecnicas

- **API directa sobre UI automation**: Intentamos 10+ veces automatizar el editor TipTap via Playwright (pencil icon click, setContent, dirty trigger). React synthetic events no responden a dispatchEvent ni a clicks de Playwright en SVGs. La solucion fue descubrir la API interna via interceptacion de red.
- **Playwright solo para auth**: Login requiere browser real (CAPTCHA, WAF). Despues de auth, todas las operaciones son HTTP puro.
- **TipTap JSON, no HTML**: Skool almacena contenido como `[v2]` + TipTap JSON, no HTML. El `htmlToSkoolDesc()` en skool-api.ts convierte HTML a este formato.
- **Session en disco**: `~/.skool-cli/auth-state.json` persiste cookies entre invocaciones del CLI.

## Pendiente

- Fix `--folder` por nombre (endpoint GET para listar items no descubierto, fallback via __NEXT_DATA__)
- Limpiar dist/ de archivos debug viejos (debug.js, test-api.js siguen en dist/ de v1.0.1)
- Mejorar parser de inline marks (espacios entre bold/italic y texto adyacente)
- Soporte para editar lecciones existentes (PUT con ID conocido)
- Soporte para mover lecciones entre folders
- Tests automatizados

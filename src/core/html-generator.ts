/**
 * Converts markdown or structured content to TipTap-compatible HTML for Skool.
 *
 * Ported from Content-Pipeline's skool-html-generator.cjs.
 * Supported elements: h1-h4, p, strong, em, code, pre>code, ul/ol, blockquote, hr, a
 * NOT supported: tables, iframes (except video), forms
 */

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/\u2014/g, "-") // em dash
    .replace(/\u2013/g, "-") // en dash
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyInlineFormatting(text: string): string {
  let formatted = text;
  // Bold: **text** or __text__
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/__(.*?)__/g, "<strong>$1</strong>");
  // Italic: *text* (but not inside **)
  formatted = formatted.replace(
    /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g,
    "<em>$1</em>"
  );
  // Inline code: `text`
  formatted = formatted.replace(/`(.*?)`/g, "<code>$1</code>");
  return formatted;
}

function cleanText(text: string): string {
  return text.replace(/\u2014/g, "-").replace(/\u2013/g, "-");
}

// ----------------------------------------------------------
// Text to HTML (markdown-like)
// ----------------------------------------------------------

function textToHtml(text: string): string {
  if (!text) return "";

  const cleaned = cleanText(text);
  const paragraphs = cleaned.split(/\n\n+/);
  let html = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Code block
    if (trimmed.startsWith("```")) {
      const codeContent = trimmed
        .replace(/^```\w*\n?/, "")
        .replace(/\n?```$/, "");
      html += `<pre><code>${escapeHtml(codeContent)}</code></pre>`;
      continue;
    }

    const lines = trimmed.split("\n");
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }

      // Markdown headers
      const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        html += `<h${level}>${applyInlineFormatting(headerMatch[2])}</h${level}>`;
        i++;
        continue;
      }

      // Bullet list
      if (/^[-\u2022]\s/.test(line)) {
        html += "<ul>";
        while (i < lines.length && /^[-\u2022]\s/.test(lines[i].trim())) {
          const bulletText = lines[i].trim().replace(/^[-\u2022]\s*/, "");
          if (bulletText) {
            html += `<li>${applyInlineFormatting(bulletText)}</li>`;
          }
          i++;
        }
        html += "</ul>";
        continue;
      }

      // Numbered list
      if (/^\d+[.)]\s/.test(line)) {
        html += "<ol>";
        while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
          const numberedText = lines[i].trim().replace(/^\d+[.)]\s*/, "");
          if (numberedText) {
            html += `<li>${applyInlineFormatting(numberedText)}</li>`;
          }
          i++;
        }
        html += "</ol>";
        continue;
      }

      // Regular paragraph
      html += `<p>${applyInlineFormatting(line)}</p>`;
      i++;
    }
  }

  return html;
}

// ----------------------------------------------------------
// Public API
// ----------------------------------------------------------

/** Convert markdown text to TipTap-compatible HTML */
export function markdownToHtml(markdown: string): string {
  return textToHtml(markdown);
}

/**
 * Convert a skool_class structured object to TipTap-compatible HTML.
 * This is the port of skool-html-generator.cjs.
 */
export function structuredContentToHtml(sc: Record<string, unknown>): string {
  let html = "";
  const contenido = sc.contenido as Record<string, unknown> | undefined;

  if (contenido) {
    for (const [key, value] of Object.entries(contenido)) {
      const sectionTitle = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // Skip header for contexto (it's the intro)
      if (key !== "contexto") {
        html += `<h2>${escapeHtml(sectionTitle)}</h2>`;
      }

      if (typeof value === "string") {
        html += textToHtml(value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") {
            html += textToHtml(item);
          } else if (typeof item === "object" && item !== null) {
            const obj = item as Record<string, unknown>;
            if (obj.paso && obj.titulo) {
              html += `<p><strong>Paso ${obj.paso}: ${escapeHtml(String(obj.titulo))}</strong></p>`;
              if (obj.instruccion) html += textToHtml(String(obj.instruccion));
              if (obj.detalle) html += textToHtml(String(obj.detalle));
              if (obj.nota) {
                html += `<p><em>${applyInlineFormatting(escapeHtml(String(obj.nota)))}</em></p>`;
              }
            } else if (obj.titulo) {
              html += `<p><strong>${escapeHtml(String(obj.titulo))}</strong></p>`;
              if (obj.descripcion) html += textToHtml(String(obj.descripcion));
              if (obj.explicacion) html += textToHtml(String(obj.explicacion));
              if (obj.detalle) html += textToHtml(String(obj.detalle));
            } else {
              for (const [, v] of Object.entries(obj)) {
                if (typeof v === "string") html += textToHtml(v);
              }
            }
          }
        }
      } else if (typeof value === "object" && value !== null) {
        for (const [subKey, subValue] of Object.entries(
          value as Record<string, unknown>
        )) {
          if (typeof subValue === "string") {
            html += `<p><strong>${escapeHtml(subKey.replace(/_/g, " "))}:</strong> ${subValue}</p>`;
          }
        }
      }
    }
  }

  // Ejercicio section
  if (sc.ejercicio) {
    html += `<h2>Ejercicio Practico</h2>`;
    if (typeof sc.ejercicio === "string") {
      html += textToHtml(sc.ejercicio);
    } else if (typeof sc.ejercicio === "object") {
      const ej = sc.ejercicio as Record<string, unknown>;
      if (ej.titulo) html += `<p><strong>${escapeHtml(String(ej.titulo))}</strong></p>`;
      if (ej.instrucciones) html += textToHtml(String(ej.instrucciones));
      if (Array.isArray(ej.pasos)) {
        for (const paso of ej.pasos) {
          if (typeof paso === "string") {
            html += textToHtml(paso);
          } else if (typeof paso === "object" && paso !== null) {
            const p = paso as Record<string, unknown>;
            if (p.paso && p.titulo) {
              html += `<p><strong>Paso ${p.paso}: ${escapeHtml(String(p.titulo))}</strong></p>`;
            }
            if (p.instruccion) html += textToHtml(String(p.instruccion));
            if (p.detalle) html += textToHtml(String(p.detalle));
            if (p.nota) {
              html += `<p><em>${applyInlineFormatting(escapeHtml(String(p.nota)))}</em></p>`;
            }
          }
        }
      }
      if (ej.resultado_esperado) {
        html += `<p><strong>Resultado esperado:</strong> ${applyInlineFormatting(escapeHtml(String(ej.resultado_esperado)))}</p>`;
      }
      if (ej.tiempo_estimado) {
        html += `<p><strong>Tiempo estimado:</strong> ${escapeHtml(String(ej.tiempo_estimado))}</p>`;
      }
    }
  }

  // Action item section
  if (sc.action_item) {
    html += `<h2>Action Item</h2>`;
    if (typeof sc.action_item === "string") {
      html += textToHtml(sc.action_item);
    } else if (typeof sc.action_item === "object") {
      const ai = sc.action_item as Record<string, unknown>;
      if (ai.titulo) html += `<p><strong>${escapeHtml(String(ai.titulo))}</strong></p>`;
      if (ai.descripcion) html += textToHtml(String(ai.descripcion));
      if (ai.instrucciones) html += textToHtml(String(ai.instrucciones));
      if (ai.texto) html += textToHtml(String(ai.texto));
    }
  }

  // Recursos section
  if (Array.isArray(sc.recursos) && sc.recursos.length > 0) {
    html += `<h2>Recursos</h2><ul>`;
    for (const recurso of sc.recursos) {
      const r = recurso as Record<string, unknown>;
      if (r.nombre && r.url) {
        const tipo = r.tipo ? ` (${escapeHtml(String(r.tipo))})` : "";
        html += `<li><a href="${escapeHtml(String(r.url))}" target="_blank">${escapeHtml(String(r.nombre))}</a>${tipo}</li>`;
      } else if (r.nombre) {
        html += `<li>${escapeHtml(String(r.nombre))}</li>`;
      }
    }
    html += `</ul>`;
  }

  // Pregunta de discusion
  if (sc.pregunta_discusion) {
    html += `<h2>Pregunta de Discusion</h2>`;
    html += textToHtml(String(sc.pregunta_discusion));
  }

  return html;
}

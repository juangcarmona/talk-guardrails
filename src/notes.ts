import source from '../content/speaker-notes.md?raw'
import sourceEs from '../content/speaker-notes.es.md?raw'

// content/speaker-notes.md (English) and speaker-notes.es.md (Spanish) are the
// single source of the notes: one `## scene-id` section per scene, with
// `[click]` separating what is said at each step.
function parse(text: string) {
  const result: Record<string, string[]> = {}
  for (const section of text.split(/^## /m).slice(1)) {
    const [heading, ...body] = section.split('\n')
    result[heading.trim()] = body.join('\n').trim().split(/\s*\[click\]\s*/)
  }
  return result
}

export const notes = parse(source)
export const notesEs = parse(sourceEs)

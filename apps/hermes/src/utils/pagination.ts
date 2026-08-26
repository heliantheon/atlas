import type { Items } from '@/types'

/** Collect an opaque-cursor endpoint without interpreting or rewriting its token. */
export async function collectCursorPages<T>(
  fetchPage: (token?: string) => Promise<Items<T>>
): Promise<T[]> {
  const items: T[] = []
  const seenTokens = new Set<string>()
  let token: string | undefined

  do {
    const page = await fetchPage(token)
    items.push(...page.items)
    if (!page.next || seenTokens.has(page.next)) break
    seenTokens.add(page.next)
    token = page.next
  } while (token)

  return items
}

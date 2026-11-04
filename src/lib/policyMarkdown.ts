import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import rehypeSanitize from 'rehype-sanitize';

const processor = createMarkdownProcessor({
  syntaxHighlight: false,
  smartypants: false,
  remarkRehype: { allowDangerousHtml: false },
  rehypePlugins: [rehypeSanitize],
});

export async function renderPolicyMarkdown(markdown: string): Promise<string> {
  const result = await (await processor).render(markdown);
  return result.code;
}

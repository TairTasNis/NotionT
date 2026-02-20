export interface HeadingNode {
  id: string;
  text: string;
  level: number;
  line: number;
  children: HeadingNode[];
  collapsed?: boolean; // For UI state
}

export function parseMarkdownHeadings(markdown: string): HeadingNode {
  const lines = markdown.split('\n');
  const root: HeadingNode = {
    id: 'root',
    text: 'Root',
    level: 0,
    line: 0,
    children: []
  };

  const stack: HeadingNode[] = [root];

  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2];
      const node: HeadingNode = {
        id: `heading-${index}`,
        text,
        level,
        line: index,
        children: []
      };

      // Find the correct parent in the stack
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
  });

  return root;
}

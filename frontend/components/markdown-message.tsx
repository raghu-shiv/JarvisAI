import ReactMarkdown from "react-markdown";

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose max-w-none text-sm leading-6">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

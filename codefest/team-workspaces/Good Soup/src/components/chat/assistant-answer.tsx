import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AssistantAnswer({ answer }: { answer: string }) {
  return (
    <div className="assistant-turn__markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} rel="noreferrer" target="_blank" />
          )
        }}
      >
        {answer}
      </ReactMarkdown>
    </div>
  );
}

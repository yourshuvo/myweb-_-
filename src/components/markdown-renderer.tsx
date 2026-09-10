import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isSafeHref } from "@/lib/markdown";

export function MarkdownRenderer({ markdown }: { markdown: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href = "", children }) =>
            isSafeHref(href) ? (
              <a href={href} rel={href.startsWith("https://") ? "noreferrer" : undefined}>
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ src = "", alt = "" }) => {
            if (typeof src !== "string" || !src.startsWith("https://cdn.hackclub.com/")) return null;
            // Markdown images have author-provided dimensions, so native responsive sizing is intentional here.
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={src} alt={alt} loading="lazy" />;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

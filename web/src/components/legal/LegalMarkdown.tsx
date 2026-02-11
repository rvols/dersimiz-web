'use client';

import ReactMarkdown from 'react-markdown';

type Props = { content: string };

const components = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="font-display font-bold text-2xl text-neutral-carbon mt-8 mb-4 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="font-display font-bold text-xl text-neutral-carbon mt-6 mb-3">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="font-display font-semibold text-lg text-neutral-carbon mt-4 mb-2">
      {children}
    </h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-neutral-slate leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-6 text-neutral-slate mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-6 text-neutral-slate mb-3 space-y-1">{children}</ol>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="text-primary hover:underline">
      {children}
    </a>
  ),
};

export function LegalMarkdown({ content }: Props) {
  return (
    <article className="legal-content">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </article>
  );
}

import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getDocumentBySlug } from "@/lib/db/documents";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const document = await getDocumentBySlug(slug);

  if (!document) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-10 text-4xl font-bold">
        {document.name}
      </h1>

      <article className="prose prose-neutral max-w-none whitespace-pre-wrap">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {document.content_markdown}
        </ReactMarkdown>
      </article>
    </main>
  );
}
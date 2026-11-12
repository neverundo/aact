import Link from "next/link";
import type { DocLocale, DocPage } from "@/content/docs/types";
import { DocsCallout } from "./DocsCallout";
import { DocsCodeBlock } from "./DocsCodeBlock";
import { DocsStatusBadge } from "./DocsStatusBadge";

export function DocsArticle({
  page,
  locale,
  copyLabel,
  copiedLabel,
}: {
  page: DocPage;
  locale: DocLocale;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl">
      <header className="space-y-3 border-b border-stone-200 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          {page.title}
        </h1>
        <p className="text-lg text-stone-600">{page.description}</p>
      </header>

      <div className="mt-10 space-y-12">
        {page.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24 space-y-4"
          >
            <h2 className="text-xl font-semibold tracking-tight text-stone-900">
              <a
                href={`#${section.id}`}
                className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
              >
                {section.title}
              </a>
            </h2>
            <div className="space-y-4">
              {section.blocks.map((block, index) => {
                const key = `${section.id}-${index}`;
                switch (block.type) {
                  case "paragraph":
                    return (
                      <p key={key} className="leading-relaxed text-stone-700">
                        {block.text}
                      </p>
                    );
                  case "list":
                    return block.ordered ? (
                      <ol
                        key={key}
                        className="list-decimal space-y-2 pl-5 text-stone-700"
                      >
                        {block.items.map((item) => (
                          <li key={item} className="leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <ul
                        key={key}
                        className="list-disc space-y-2 pl-5 text-stone-700"
                      >
                        {block.items.map((item) => (
                          <li key={item} className="leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    );
                  case "callout":
                    return (
                      <DocsCallout
                        key={key}
                        tone={block.tone}
                        title={block.title}
                        text={block.text}
                      />
                    );
                  case "code":
                    return (
                      <DocsCodeBlock
                        key={key}
                        language={block.language}
                        code={block.code}
                        caption={block.caption}
                        copyLabel={copyLabel}
                        copiedLabel={copiedLabel}
                      />
                    );
                  case "table":
                    return (
                      <div key={key} className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-left text-sm text-stone-700">
                          <thead>
                            <tr className="border-b border-stone-300">
                              {block.headers.map((header) => (
                                <th
                                  key={header}
                                  className="px-3 py-2 font-semibold text-stone-900"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.map((row) => (
                              <tr
                                key={row.join("|")}
                                className="border-b border-stone-200"
                              >
                                {row.map((cell) => (
                                  <td key={cell} className="px-3 py-2 align-top">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  case "status":
                    return (
                      <DocsStatusBadge
                        key={key}
                        status={block.status}
                        label={block.label}
                        locale={locale}
                      />
                    );
                  case "linkList":
                    return (
                      <ul key={key} className="space-y-3">
                        {block.items.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className="font-medium text-stone-900 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
                            >
                              {item.label}
                            </Link>
                            {item.description ? (
                              <p className="text-sm text-stone-600">
                                {item.description}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

/* Structured data (JSON-LD) rendered as part of the page itself.

   Pages used to add their FAQPage/Organization blocks from a useEffect, which
   only runs in the browser — so the server-rendered HTML that crawlers, link
   previewers and AI answer engines read had none of it. Rendering the script
   element in the component tree puts it in that HTML, keeps exactly one copy
   per page, and removes it with the page on client-side navigation.

   `<` is escaped so no text inside the data can close the script tag. */
export default function JsonLd({ data, id }: { data: unknown; id?: string }) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

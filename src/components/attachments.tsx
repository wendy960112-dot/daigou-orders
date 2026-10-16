import { removeAttachment } from "@/actions/orders";
import type { Attachment } from "@/db/schema";

export function AttachmentGallery({
  title,
  items,
  empty,
}: {
  title: string;
  items: Attachment[];
  empty: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-muted">{empty}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <figure key={item.id} className="overflow-hidden rounded-2xl border border-line bg-white">
            {item.mimeType.startsWith("image/") ? (
              <img src={`/api/files/${item.id}`} alt={item.fileName} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <a href={`/api/files/${item.id}`} className="flex aspect-[4/3] items-center justify-center bg-sea-soft px-3 text-center text-sm font-medium text-sea">
                開啟 PDF
              </a>
            )}
            <figcaption className="flex items-center justify-between gap-2 px-2 py-2">
              <span className="truncate text-xs text-muted">{item.fileName}</span>
              <form action={removeAttachment}>
                <input type="hidden" name="attachmentId" value={item.id} />
                <button type="submit" className="text-xs font-medium text-brand">
                  刪除
                </button>
              </form>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

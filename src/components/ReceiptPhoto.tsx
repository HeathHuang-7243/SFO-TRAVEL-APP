import { useEffect, useState } from "react";
import { photoUrl } from "../storage/photos";
export default function ReceiptPhoto({
  path,
  description,
}: {
  path: string;
  description: string;
}) {
  const [url, setUrl] = useState(""),
    [open, setOpen] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    photoUrl(path)
      .then((u) => {
        if (active) setUrl(u);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("sfo-close-overlay", close);
    return () => window.removeEventListener("sfo-close-overlay", close);
  }, [open]);
  if (error)
    return (
      <span
        className="receipt-thumb no-photo"
        title="凭证读取失败 / Receipt unavailable"
      >
        !
      </span>
    );
  return (
    <>
      <button
        className="receipt-button"
        aria-label={"查看凭证 / View receipt: " + description}
        disabled={!url}
        onClick={() => setOpen(true)}
      >
        {url && (
          <img
            className="receipt-thumb"
            src={url}
            alt={description}
            onError={() => setError(true)}
          />
        )}
      </button>
      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <section
            className="modal receipt-view"
            role="dialog"
            aria-modal="true"
            aria-label="凭证 / Receipt"
          >
            <button className="secondary" onClick={() => setOpen(false)}>
              关闭 / Close
            </button>
            <img src={url} alt={description} />
          </section>
        </div>
      )}
    </>
  );
}

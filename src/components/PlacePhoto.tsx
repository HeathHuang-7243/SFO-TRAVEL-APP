import photos from "../lib/place-photos.json";
// Small real-photo previews are bundled with the page so image paths do not
// depend on an external host, lazy-loading observer or separate asset request.
export default function PlacePhoto({ id, name }: { id: string; name: string }) {
  const src = photos[id as keyof typeof photos];
  return (
    <img
      className="place-photo"
      src={src}
      alt={name}
      width={800}
      height={450}
      decoding="async"
    />
  );
}

import { MAPS_KEY, MAPS_PROVIDER } from '@/lib/config';

/** Provider-configurable map. Respects the listing's privacy setting (approximate location only). */
export function PropertyMap({ lat, lng, approximate, label }: { lat: number; lng: number; approximate: boolean; label: string }) {
  const zoom = approximate ? 13 : 16;
  let src: string | null = null;
  if (MAPS_PROVIDER === 'google' && MAPS_KEY) {
    src = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(MAPS_KEY)}&q=${lat},${lng}&zoom=${zoom}`;
  } else if (MAPS_PROVIDER === 'mapbox' && MAPS_KEY) {
    src = `https://api.mapbox.com/styles/v1/mapbox/streets-v12.html?title=false&access_token=${encodeURIComponent(MAPS_KEY)}#${zoom}/${lat}/${lng}`;
  }
  return (
    <div>
      {src ? (
        <iframe title={`Map: ${label}`} src={src} className="h-72 w-full rounded-xl border border-line" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface text-center text-sm text-muted">
          <span>Interactive map not configured.</span>
          <a className="font-medium text-brand-700 hover:underline" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`} target="_blank" rel="noopener noreferrer">
            Open location in OpenStreetMap ↗
          </a>
        </div>
      )}
      {approximate && <p className="mt-2 text-xs text-muted">The lister has chosen to show an approximate location only.</p>}
    </div>
  );
}

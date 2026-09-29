import type { Coordinates } from '@civita/shared';
import { useQuery } from '@tanstack/react-query';
import { LocateFixed, Loader2, MapPin, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre';
import { toast } from 'sonner';
import { useDebounced, useGeolocation } from '@/hooks/misc';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/form-controls';
import { DEFAULT_CENTER } from '@/lib/geo';
import { BaseMap } from './base-map';

interface Place {
  label: string;
  lat: number;
  lng: number;
}

/** A single pin marker styled to match the brand. */
export const Pin = ({ color = '#6366f1', pulse = false }: { color?: string; pulse?: boolean }) => (
  <div className="relative">
    {pulse && (
      <span
        className="animate-pulse-ring absolute -bottom-2 left-1/2 -ml-2 size-4 rounded-full"
        style={{ backgroundColor: color }}
      />
    )}
    <svg width="36" height="44" viewBox="0 0 36 44" className="drop-shadow-lg">
      <path
        d="M18 43s15-14.1 15-25.5A15 15 0 0 0 3 17.5C3 28.9 18 43 18 43Z"
        fill={color}
        stroke="white"
        strokeWidth="2.5"
      />
      <circle cx="18" cy="17.5" r="5.5" fill="white" />
    </svg>
  </div>
);

export const LocationPicker = ({
  value,
  onChange,
  className,
}: {
  value: Coordinates | null;
  onChange: (coords: Coordinates) => void;
  className?: string;
}) => {
  const mapRef = useRef<MapRef>(null);
  const geo = useGeolocation();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const q = useDebounced(search.trim(), 400);

  const places = useQuery({
    queryKey: ['geo-search', q],
    queryFn: () => api.get<Place[]>('/geo/search', { q }),
    enabled: q.length >= 3,
    staleTime: Infinity,
  });

  const flyTo = (coords: Coordinates, zoom = 16) => {
    mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom, duration: 900 });
  };

  const choose = (coords: Coordinates) => {
    onChange(coords);
    flyTo(coords);
  };

  const locateMe = async () => {
    const coords = await geo.locate();
    if (coords) choose(coords);
    else toast.error('Could not get your location. Drop a pin on the map instead.');
  };

  const start = value ?? DEFAULT_CENTER;

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border', className)}>
      <BaseMap
        ref={mapRef}
        initialViewState={{ latitude: start.lat, longitude: start.lng, zoom: value ? 15 : 12.5 }}
        style={{ width: '100%', height: '100%' }}
        cursor="crosshair"
        onClick={(e) => onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        {value && (
          <Marker
            latitude={value.lat}
            longitude={value.lng}
            anchor="bottom"
            draggable
            onDragEnd={(e) => onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
          >
            <Pin pulse />
          </Marker>
        )}
      </BaseMap>

      <div className="absolute inset-x-3 top-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search for a place or address"
            className="bg-card/95 h-10 pl-9 shadow-lg backdrop-blur"
            aria-label="Search for a place"
          />
          {open && q.length >= 3 && (
            <div className="bg-popover absolute inset-x-0 top-full z-10 mt-1.5 overflow-hidden rounded-xl border shadow-xl">
              {places.isFetching ? (
                <p className="text-muted-foreground flex items-center gap-2 px-3 py-3 text-sm">
                  <Loader2 className="size-4 animate-spin" /> Searching…
                </p>
              ) : places.data?.length ? (
                places.data.map((p) => (
                  <button
                    key={`${p.lat},${p.lng}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      choose({ lat: p.lat, lng: p.lng });
                      setSearch(p.label.split(',').slice(0, 2).join(','));
                      setOpen(false);
                    }}
                    className="hover:bg-accent flex w-full cursor-pointer items-start gap-2 px-3 py-2.5 text-left text-sm"
                  >
                    <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <span className="line-clamp-2">{p.label}</span>
                  </button>
                ))
              ) : (
                <p className="text-muted-foreground px-3 py-3 text-sm">No places found.</p>
              )}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          className="bg-card/95 h-10 shadow-lg backdrop-blur"
          onClick={() => void locateMe()}
          loading={geo.status === 'locating'}
        >
          {geo.status !== 'locating' && <LocateFixed />}
          <span className="hidden sm:inline">Use my location</span>
        </Button>
      </div>

      {!value && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <span className="bg-foreground text-background rounded-full px-3 py-1.5 text-xs font-medium shadow-lg">
            Tap the map to drop a pin
          </span>
        </div>
      )}
    </div>
  );
};

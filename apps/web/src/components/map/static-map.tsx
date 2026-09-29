import { Marker, NavigationControl } from 'react-map-gl/maplibre';
import { cn } from '@/lib/utils';
import { BaseMap } from './base-map';
import { Pin } from './location-picker';

/** Small read-only map with a single pin, for the issue page. */
export const StaticMap = ({
  lat,
  lng,
  color,
  className,
}: {
  lat: number;
  lng: number;
  color?: string;
  className?: string;
}) => (
  <div className={cn('overflow-hidden rounded-xl border', className)}>
    <BaseMap
      initialViewState={{ latitude: lat, longitude: lng, zoom: 15 }}
      style={{ width: '100%', height: '100%' }}
      scrollZoom={false}
      cooperativeGestures
    >
      <NavigationControl position="bottom-right" showCompass={false} />
      <Marker latitude={lat} longitude={lng} anchor="bottom">
        <Pin color={color} />
      </Marker>
    </BaseMap>
  </div>
);

import 'maplibre-gl/dist/maplibre-gl.css';
import { setWorkerUrl } from 'maplibre-gl';
// Let Vite bundle MapLibre's web worker; its default relative lookup breaks under bundling.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { forwardRef, type ComponentProps } from 'react';
import MapGL, { type MapRef } from 'react-map-gl/maplibre';
import { useTheme } from '@/providers/theme';

setWorkerUrl(workerUrl);

const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

/** MapLibre map with free OpenFreeMap vector tiles (no API key) that follows the app theme. */
export const BaseMap = forwardRef<MapRef, ComponentProps<typeof MapGL>>(
  function BaseMap(props, ref) {
    const { resolved } = useTheme();
    return (
      <MapGL
        ref={ref}
        mapStyle={STYLES[resolved]}
        attributionControl={{ compact: true }}
        dragRotate={false}
        pitchWithRotate={false}
        {...props}
      />
    );
  },
);

import { ISSUE_STATUS_LABEL, ISSUE_STATUSES, type IssueStatus } from '@civita/shared';
import type { FeatureCollection, Point } from 'geojson';
import { ArrowBigUp, ArrowRight, Loader2, MapPin, MessageSquare, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  GeolocateControl,
  Layer,
  NavigationControl,
  Source,
  type LayerProps,
  type MapLayerMouseEvent,
  type MapRef,
} from 'react-map-gl/maplibre';
import type { GeoJSONSource } from 'maplibre-gl';
import { Link } from 'react-router';
import { CategoryGlyph, CategoryPill, STATUS_META, StatusBadge } from '@/components/domain';
import { MultiSelectFilter } from '@/components/filters';
import { BaseMap } from '@/components/map/base-map';
import { DEFAULT_CENTER } from '@/lib/geo';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/primitives';
import { useDocumentTitle } from '@/hooks/misc';
import { useCategories, useIssue, useMapIssues } from '@/hooks/queries';
import { cn, timeAgo } from '@/lib/utils';

const statusColor = [
  'match',
  ['get', 'status'],
  ...ISSUE_STATUSES.flatMap((s) => [s, STATUS_META[s].hex]),
  '#6366f1',
] as unknown as string;

const clusterLayer: LayerProps = {
  id: 'clusters',
  type: 'circle',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#6366f1',
    'circle-opacity': 0.9,
    'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 30, 26],
    'circle-stroke-width': 4,
    'circle-stroke-color': 'rgba(99,102,241,0.3)',
  },
};

const clusterCountLayer: LayerProps = {
  id: 'cluster-count',
  type: 'symbol',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': ['get', 'point_count_abbreviated'],
    'text-font': ['Noto Sans Bold'],
    'text-size': 12,
  },
  paint: { 'text-color': '#ffffff' },
};

const pointLayer: LayerProps = {
  id: 'points',
  type: 'circle',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': statusColor,
    'circle-radius': ['interpolate', ['linear'], ['get', 'upvoteCount'], 0, 7, 20, 11],
    'circle-stroke-width': 2.5,
    'circle-stroke-color': '#ffffff',
  },
};

const selectedLayer = (id: string | null): LayerProps => ({
  id: 'selected',
  type: 'circle',
  filter: ['==', ['get', 'id'], id ?? ''],
  paint: {
    'circle-color': 'transparent',
    'circle-radius': 18,
    'circle-stroke-width': 3,
    'circle-stroke-color': '#6366f1',
  },
});

const IssuePreview = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const { data: issue, isPending } = useIssue(id);
  return (
    <div className="bg-card/95 absolute inset-x-3 bottom-3 z-10 max-h-[60%] overflow-y-auto rounded-2xl border shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:top-20 sm:right-4 sm:bottom-auto sm:max-h-[calc(100%-7rem)] sm:w-96">
      <button
        type="button"
        onClick={onClose}
        className="bg-background/80 hover:bg-accent absolute top-3 right-3 z-10 cursor-pointer rounded-full p-1.5 backdrop-blur"
        aria-label="Close preview"
      >
        <X className="size-4" />
      </button>
      {isPending || !issue ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          {issue.images[0] && (
            <img src={issue.images[0].url} alt="" className="h-40 w-full object-cover" />
          )}
          <div className="p-5">
            <div className="flex flex-wrap gap-2 pr-8">
              <StatusBadge status={issue.status} />
              <CategoryPill category={issue.category} />
            </div>
            <h2 className="mt-3 text-lg leading-snug font-semibold">{issue.title}</h2>
            <p className="text-muted-foreground mt-1.5 line-clamp-3 text-sm">{issue.description}</p>
            <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="flex items-center gap-1">
                <ArrowBigUp className="size-4" /> {issue.upvoteCount} upvotes
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3.5" /> {issue.commentCount}
              </span>
              <span>{timeAgo(issue.createdAt)}</span>
            </div>
            {issue.address && (
              <p className="text-muted-foreground mt-2 flex items-start gap-1 text-xs">
                <MapPin className="mt-px size-3.5 shrink-0" /> {issue.address}
              </p>
            )}
            <Button className="mt-5 w-full" asChild>
              <Link to={`/issues/${issue.id}`}>
                View details <ArrowRight />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default function MapPage() {
  useDocumentTitle('Map');
  const mapRef = useRef<MapRef>(null);
  const [status, setStatus] = useState<IssueStatus[]>(['open', 'in_progress']);
  const [category, setCategory] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [cursor, setCursor] = useState('');
  const { data: categories } = useCategories();
  const { data: issues, isFetching } = useMapIssues({
    status: status.length ? status.join(',') : undefined,
    category: category.length ? category.join(',') : undefined,
  });

  const geojson = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: (issues ?? []).map((i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [i.lng, i.lat] },
        properties: { id: i.id, status: i.status, upvoteCount: i.upvoteCount },
      })),
    }),
    [issues],
  );

  const onClick = async (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) {
      setSelected(null);
      return;
    }
    const geometry = feature.geometry as Point;
    if (feature.properties?.cluster_id !== undefined) {
      const source = mapRef.current?.getSource('issues') as GeoJSONSource | undefined;
      const zoom = await source?.getClusterExpansionZoom(feature.properties.cluster_id as number);
      mapRef.current?.easeTo({
        center: geometry.coordinates as [number, number],
        zoom: (zoom ?? 14) + 0.5,
      });
      return;
    }
    setSelected(String(feature.properties?.id));
    mapRef.current?.easeTo({ center: geometry.coordinates as [number, number], duration: 500 });
  };

  return (
    <div className="relative h-[calc(100dvh-4rem)]">
      <BaseMap
        ref={mapRef}
        initialViewState={{ latitude: DEFAULT_CENTER.lat, longitude: DEFAULT_CENTER.lng, zoom: 12 }}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['clusters', 'points']}
        onClick={(e) => void onClick(e)}
        onMouseEnter={() => setCursor('pointer')}
        onMouseLeave={() => setCursor('')}
        cursor={cursor}
      >
        <NavigationControl position="bottom-left" showCompass={false} />
        <GeolocateControl position="bottom-left" />
        <Source
          id="issues"
          type="geojson"
          data={geojson}
          cluster
          clusterMaxZoom={14}
          clusterRadius={45}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...selectedLayer(selected)} />
          <Layer {...pointLayer} />
        </Source>
      </BaseMap>

      <div className="absolute top-4 left-4 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2">
        <div className="bg-card/95 flex items-center gap-2 rounded-xl border p-1.5 shadow-lg backdrop-blur">
          <MultiSelectFilter
            label="Status"
            selected={status}
            onChange={(v) => setStatus(v as IssueStatus[])}
            options={ISSUE_STATUSES.map((s) => ({
              value: s,
              label: ISSUE_STATUS_LABEL[s],
              icon: (
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_META[s].hex }}
                />
              ),
            }))}
          />
          <MultiSelectFilter
            label="Category"
            selected={category}
            onChange={setCategory}
            options={(categories ?? []).map((c) => ({
              value: c.id,
              label: c.name,
              icon: (
                <CategoryGlyph
                  icon={c.icon}
                  color={c.color}
                  className="size-5 rounded-md"
                  iconClassName="size-3"
                />
              ),
            }))}
          />
          <span className="text-muted-foreground flex items-center gap-1.5 px-2 text-xs font-medium tabular-nums">
            {isFetching && <Loader2 className="size-3 animate-spin" />}
            {issues?.length ?? 0} issues
          </span>
        </div>
      </div>

      <div className="bg-card/95 absolute right-4 bottom-8 hidden rounded-xl border px-3 py-2.5 shadow-lg backdrop-blur sm:block">
        <p className="text-muted-foreground mb-1.5 text-[11px] font-semibold tracking-wide uppercase">
          Status
        </p>
        <div className="grid gap-1">
          {ISSUE_STATUSES.map((s) => (
            <span
              key={s}
              className={cn(
                'flex items-center gap-2 text-xs',
                !status.includes(s) && status.length && 'opacity-40',
              )}
            >
              <span
                className="size-2.5 rounded-full ring-2 ring-white"
                style={{ backgroundColor: STATUS_META[s].hex }}
              />
              {ISSUE_STATUS_LABEL[s]}
            </span>
          ))}
        </div>
      </div>

      {selected && <IssuePreview id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

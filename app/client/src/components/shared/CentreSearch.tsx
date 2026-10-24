import { useMemo, useState } from 'react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@databricks/appkit-ui/react';
import { ChevronsUpDown } from 'lucide-react';
import { searchCentres, townLabel, townsOf, whyNotPickable, type Centre } from './centres';
import { useGeoData } from './GeoData';
import { QueryError } from './QueryError';

const ALL_TOWNS = '__all__';

interface CentreSearchProps {
  selectedId: string | null;
  onSelect: (centre: Centre) => void;
  placeholder?: string;
  // Centres listed but not pickable, e.g. Page 1's anchor and the centres already added.
  excludedIds?: readonly string[];
  // Pass both to drive the town filter from the page (Page 2 also filters its map by town).
  // Leave both out and CentreSearch keeps the town itself.
  town?: string | null;
  onTownChange?: (town: string | null) => void;
}

// Pick the centre to close: typeahead over operating centres from gold.centres, with an optional
// town filter. Interim and excluded centres are listed but can't be picked (whyNotPickable).
export function CentreSearch({
  selectedId,
  onSelect,
  placeholder = 'Pick a centre to close',
  excludedIds = [],
  town: townProp,
  onTownChange,
}: CentreSearchProps) {
  const { centres, centresError } = useGeoData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [ownTown, setOwnTown] = useState<string | null>(null);
  const town = townProp === undefined ? ownTown : townProp;
  const setTown = onTownChange ?? setOwnTown;

  const towns = useMemo(() => (centres ? townsOf(centres) : []), [centres]);
  const matches = useMemo(() => (centres ? searchCentres(centres, query, town) : []), [centres, query, town]);
  const selected = centres?.find((c) => c.centre_id === selectedId) ?? null;

  if (centresError) return <QueryError what="Centres" error={centresError} />;
  if (!centres) return <Skeleton className="h-9 w-full max-w-xl" />;

  return (
    <div className="flex flex-col gap-2 sm:flex-row max-w-xl">
      <Select value={town ?? ALL_TOWNS} onValueChange={(v) => setTown(v === ALL_TOWNS ? null : v)}>
        <SelectTrigger className="sm:w-48" aria-label="Town">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TOWNS}>All towns</SelectItem>
          {towns.map((t) => (
            <SelectItem key={t} value={t}>
              {townLabel(t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="flex-1 justify-between font-normal">
            <span className="truncate">{selected ? selected.name : placeholder}</span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          {/* Filtering is ours (searchCentres), so cmdk's own filter is off */}
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search centres" value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>No centre matches.</CommandEmpty>
              {matches.map((c) => {
                const reason = whyNotPickable(c, excludedIds);
                return (
                  <CommandItem
                    key={c.centre_id}
                    value={c.centre_id}
                    disabled={reason !== null}
                    onSelect={() => {
                      onSelect(c);
                      setOpen(false);
                    }}
                  >
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{reason ?? townLabel(c.pln_area_n)}</span>
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

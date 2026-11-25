import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Pin } from 'lucide-react';
import { extract } from '@/extract';
import type { SchemaElement } from '@/extract/types';
import View from '@/components/objects';
import SchemaTypeCombobox, {
  matchesSelectedTypes,
} from '@/components/schema-type-combobox';

type ActivePageResponse =
  | { html: string; url: string }
  | { error: string };

function getSchemaKey(schema: SchemaElement): string {
  const url = schema['_url'];
  const id = schema['@id'];
  if (typeof id === 'string') {
    return JSON.stringify([url, id]);
  }

  const serialized = JSON.stringify(schema);
  if (serialized === undefined) {
    throw new TypeError('Schema item could not be serialized.');
  }
  return serialized;
}

export default function SidebarApp() {
  const [schemas, setSchemas] = useState<SchemaElement[]>([]);
  const [pinnedSchemas, setPinnedSchemas] = useState<SchemaElement[]>([]);
  const [pinsLoaded, setPinsLoaded] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useSpecial, setUseSpecial] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const pinnedSchemasRef = useRef<SchemaElement[]>([]);

  function togglePin(schema: SchemaElement) {
    const schemaKey = getSchemaKey(schema);
    const currentPins = pinnedSchemasRef.current;
    const nextPins = currentPins.some((item) => getSchemaKey(item) === schemaKey)
      ? currentPins.filter((item) => getSchemaKey(item) !== schemaKey)
      : [...currentPins, schema];
    pinnedSchemasRef.current = nextPins;
    setPinnedSchemas(nextPins);
  }

  useEffect(() => {
    chrome.storage.local.get('pinnedSchemas', (result) => {
      const storageError = chrome.runtime.lastError;
      if (storageError) {
        setError(storageError.message ?? 'Unable to load saved pins.');
        return;
      }

      const savedPins = Array.isArray(result.pinnedSchemas)
        ? result.pinnedSchemas.filter(
            (schema): schema is SchemaElement =>
              typeof schema === 'object' && schema !== null && !Array.isArray(schema)
          )
        : [];
      pinnedSchemasRef.current = savedPins;
      setPinnedSchemas(savedPins);
      setSchemas(savedPins);
      setPinsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!pinsLoaded) return;

    chrome.storage.local.set({pinnedSchemas}, () => {
      const storageError = chrome.runtime.lastError;
      if (storageError) {
        setError(storageError.message ?? 'Unable to save pins.');
      }
    });
  }, [pinsLoaded, pinnedSchemas]);

  useEffect(() => {
    if (!pinsLoaded) return;

    function applyActivePage(response: ActivePageResponse | undefined) {
      if (!response) return;

      if ('error' in response) {
        setError(response.error);
        setHasFetched(true);
        return;
      }

      try {
        setError(null);
        const fetchedSchemas = extract(response.html, response.url);
        const fetchedByKey = new Map(
          fetchedSchemas.map((schema) => [getSchemaKey(schema), schema])
        );
        const refreshedPins = pinnedSchemasRef.current.map(
          (schema) => fetchedByKey.get(getSchemaKey(schema)) ?? schema
        );
        pinnedSchemasRef.current = refreshedPins;
        setPinnedSchemas(refreshedPins);

        const seen = new Set<string>();
        const combinedSchemas: SchemaElement[] = [];
        for (const schema of [...refreshedPins, ...fetchedSchemas]) {
          const key = getSchemaKey(schema);
          if (!seen.has(key)) {
            seen.add(key);
            combinedSchemas.push(schema);
          }
        }
        setSchemas(combinedSchemas);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to read schema information.');
      } finally {
        setHasFetched(true);
      }
    }

    chrome.storage.session.get('tabData', (result) => {
      const storageError = chrome.runtime.lastError;
      if (storageError) {
        setError(storageError.message ?? 'Unable to load page data.');
        setHasFetched(true);
        return;
      }

      applyActivePage(result.tabData as ActivePageResponse | undefined);
    });

    function handleStorageChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) {
      if (areaName !== 'session' || !changes.tabData) return;
      applyActivePage(changes.tabData.newValue as ActivePageResponse | undefined);
    }

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [pinsLoaded]);

  const pinnedSchemaKeys = new Set(pinnedSchemas.map(getSchemaKey));
  const visibleSchemas = schemas.filter((schema) =>
    matchesSelectedTypes(schema, selectedTypes)
  );

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="use-special">Use special views</Label>
        <Switch
          id="use-special"
          checked={useSpecial}
          onCheckedChange={setUseSpecial}
        />
      </div>

      <SchemaTypeCombobox
        schemas={schemas}
        selectedTypes={selectedTypes}
        onSelectedTypesChange={setSelectedTypes}
      />

      {error && <p role="alert">{error}</p>}

      {hasFetched && !error && schemas.length === 0 && (
        <p>No schema information was found on this page.</p>
      )}

      {hasFetched && schemas.length > 0 && visibleSchemas.length === 0 && (
        <p>No items match the selected schema types.</p>
      )}

      <div className="flex flex-col gap-3">
        {visibleSchemas.map((schema, index) => {
          const isPinned = pinnedSchemaKeys.has(getSchemaKey(schema));
          return (
            <div className="relative rounded-md border p-3" key={index}>
              <View object={schema} useSpecial={useSpecial} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-10 bg-background/80"
                aria-label={isPinned ? 'Unpin item' : 'Pin item'}
                aria-pressed={isPinned}
                title={isPinned ? 'Unpin item' : 'Pin item'}
                disabled={!pinsLoaded}
                onClick={() => togglePin(schema)}
              >
                <Pin
                  aria-hidden="true"
                  className={isPinned ? 'fill-current' : ''}
                />
              </Button>
            </div>
          );
        })}
      </div>
    </main>
  );
}

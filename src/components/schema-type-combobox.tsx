import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { SchemaElement, Value } from "@/extract/types";
import {
    SCHEMA_TYPE_HIERARCHY,
    SCHEMA_TYPE_MATCHES,
    getOptionTypeNames,
    type SchemaTypeOption,
} from "@/components/schema-type-hierarchy";

function normalizeType(type: string): string {
    return type.slice(Math.max(type.lastIndexOf("/"), type.lastIndexOf(":")) + 1);
}

function getTypeNames(value: Value | undefined): string[] {
    if (typeof value === "string") {
        return [normalizeType(value)];
    }
    if (Array.isArray(value)) {
        return value.flatMap(getTypeNames);
    }
    return [];
}

function getAllOptionTypeNames(options: SchemaTypeOption[]): Set<string> {
    return new Set(options.flatMap(getOptionTypeNames));
}

function getOptions(schemas: SchemaElement[]): SchemaTypeOption[] {
    const knownTypes = getAllOptionTypeNames(SCHEMA_TYPE_HIERARCHY);
    const detectedTypes = new Set(
        schemas.flatMap((schema) => getTypeNames(schema["@type"]))
    );
    const otherTypes = [...detectedTypes]
        .filter((type) => !knownTypes.has(type))
        .sort((a, b) => a.localeCompare(b))
        .map((type) => ({ label: type, type }));

    return otherTypes.length
        ? [
              ...SCHEMA_TYPE_HIERARCHY,
              { label: "Other detected types", children: otherTypes },
          ]
        : SCHEMA_TYPE_HIERARCHY;
}

function getVisibleOptions(
    options: SchemaTypeOption[],
    query: string
): SchemaTypeOption[] {
    if (!query) {
        return options;
    }

    return options.flatMap((option) => {
        const children = getVisibleOptions(option.children ?? [], query);
        const matches = option.label.toLocaleLowerCase().includes(query);
        if (!matches && children.length === 0) {
            return [];
        }
        return [{ ...option, children: matches ? option.children : children }];
    });
}

function TypeOptionRow({
    option,
    path,
    selectedTypes,
    onToggle,
    query,
}: {
    option: SchemaTypeOption;
    path: string;
    selectedTypes: string[];
    onToggle: (type: string) => void;
    query: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const children = option.children ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded;
    const typeName = option.type;
    const isSelected = typeName ? selectedTypes.includes(typeName) : false;

    useEffect(() => {
        if (query) {
            setExpanded(true);
        }
    }, [query]);

    return (
        <div>
            <div className="flex min-h-8 items-center gap-1">
                {hasChildren ? (
                    <button
                        type="button"
                        className="flex size-7 shrink-0 items-center justify-center rounded hover:bg-accent"
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${option.label}`}
                        aria-expanded={isExpanded}
                        onClick={() => setExpanded((current) => !current)}
                    >
                        {isExpanded ? (
                            <ChevronDown className="size-4" aria-hidden="true" />
                        ) : (
                            <ChevronRight className="size-4" aria-hidden="true" />
                        )}
                    </button>
                ) : (
                    <span className="size-7 shrink-0" />
                )}
                {typeName ? (
                    <label className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggle(typeName)}
                        />
                        <span className="truncate">{option.label}</span>
                    </label>
                ) : (
                    <span className="px-1 text-sm font-semibold">{option.label}</span>
                )}
            </div>
            {hasChildren && isExpanded && (
                <div className="ml-3 border-l pl-2" role="group">
                    {children.map((child) => (
                        <TypeOptionRow
                            key={`${path}/${child.label}`}
                            option={child}
                            path={`${path}/${child.label}`}
                            selectedTypes={selectedTypes}
                            onToggle={onToggle}
                            query={query}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface Props {
    schemas: SchemaElement[];
    selectedTypes: string[];
    onSelectedTypesChange: (types: string[]) => void;
}

export function matchesSelectedTypes(
    schema: SchemaElement,
    selectedTypes: string[]
): boolean {
    if (selectedTypes.length === 0) {
        return true;
    }

    const schemaTypes = getTypeNames(schema["@type"]);
    return selectedTypes.some((selectedType) => {
        if (selectedType === "Thing") {
            return schemaTypes.length > 0;
        }

        const matchingTypes = SCHEMA_TYPE_MATCHES.get(selectedType) ?? [selectedType];

        return schemaTypes.some((type) => matchingTypes.includes(type));
    });
}

export default function SchemaTypeCombobox({
    schemas,
    selectedTypes,
    onSelectedTypesChange,
}: Props) {
    const [query, setQuery] = useState("");
    const options = getVisibleOptions(
        getOptions(schemas),
        query.trim().toLocaleLowerCase()
    );

    function toggleType(type: string) {
        onSelectedTypesChange(
            selectedTypes.includes(type)
                ? selectedTypes.filter((selectedType) => selectedType !== type)
                : [...selectedTypes, type]
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <Label>Filter by schema type</Label>
            <details className="group relative">
                <summary className="flex h-9 cursor-pointer list-none items-center justify-between rounded-md border bg-background px-3 text-sm [&::-webkit-details-marker]:hidden">
                    <span>
                        {selectedTypes.length === 0
                            ? "All schema types"
                            : `${selectedTypes.length} type${selectedTypes.length === 1 ? "" : "s"} selected`}
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                </summary>
                <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-md border bg-popover p-2 shadow-md">
                    <div className="mb-2 flex items-center gap-2">
                        <input
                            type="search"
                            className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
                            placeholder="Search schema types"
                            aria-label="Search schema types"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        {selectedTypes.length > 0 && (
                            <button
                                type="button"
                                className="text-xs text-muted-foreground underline"
                                onClick={() => onSelectedTypesChange([])}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="max-h-64 overflow-y-auto" role="group" aria-label="Schema types">
                        {options.map((option) => (
                            <TypeOptionRow
                                key={option.label}
                                option={option}
                                path={option.label}
                                selectedTypes={selectedTypes}
                                onToggle={toggleType}
                                query={query.trim()}
                            />
                        ))}
                        {options.length === 0 && (
                            <p className="px-2 py-3 text-sm text-muted-foreground">
                                No matching schema types
                            </p>
                        )}
                    </div>
                </div>
            </details>
        </div>
    );
}

import { Extractor, SchemaElement } from './types';
import { extractMicrodata, extractRdfa } from './microdata';
import jsonld from './jsonld';

const EXTRACTORS: Record<string, Extractor> = {
    microdata: extractMicrodata,
    rdfla: extractRdfa,
    jsonld: jsonld
}

export function extract(html: string, url: string): SchemaElement[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const extracted = Object.values(EXTRACTORS).flatMap(extractor => extractor(doc));
    const merged: SchemaElement[] = [];
    const indexesById = new Map<string, number>();

    for (const schema of extracted) {
        schema["_url"] = url;
        const id = schema["@id"];
        if (typeof id !== "string") {
            merged.push(schema);
            continue;
        }

        const existingIndex = indexesById.get(id);
        if (existingIndex === undefined) {
            indexesById.set(id, merged.length);
            merged.push(schema);
        } else {
            merged[existingIndex] = { ...merged[existingIndex], ...schema };
        }
    }

    return merged;
}

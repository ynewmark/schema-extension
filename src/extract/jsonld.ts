import { SchemaElement } from "./types";

export default function extractJsonLd(document: Document): SchemaElement[] {
    let data: SchemaElement[] = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((element) => {
        let json = JSON.parse(element.textContent);
        if (json['@graph']) {
            json = json['@graph']
        }
        if (!Array.isArray(json)) {
            json = [json];
        }
        data.push(...json);
    });
    return data;
}

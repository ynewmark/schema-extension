export type Value = string | number | SchemaElement | Value[]
export interface SchemaElement {
	[key: string]: Value
}
export type Extractor = (document: Document) => SchemaElement[];

import { SchemaElement } from "@/extract/types";

interface Props {
    object: SchemaElement;
}

function shouldInclude(key: string): boolean {
    return !key.startsWith("@") && !key.startsWith("_");
}

function formatValue(value: SchemaElement[string]): string {
    if (typeof value === "string" || typeof value === "number") {
        return String(value);
    }

    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
        throw new TypeError("Schema value could not be serialized");
    }

    return serialized;
}

function formatType(value: SchemaElement[string]): string {
    const typeValue = Array.isArray(value) && value.length === 1 ? value[0] : value;
    const type = formatValue(typeValue);
    const lastSlash = type.lastIndexOf("/");
    return lastSlash === -1 ? type : type.slice(lastSlash + 1);
}

function PropertyValue({ value }: { value: SchemaElement[string] }) {
    if (Array.isArray(value)) {
        if (value.length === 1) {
            return <PropertyValue value={value[0]} />;
        }

        return (
            <ul className="list-none space-y-2 pl-0">
                {value.map((item, index) => (
                    <li key={index}>
                        <PropertyValue value={item} />
                    </li>
                ))}
            </ul>
        );
    }

    if (typeof value === "object") {
        return (
            <div className="border-l pl-1">
                {value["@type"] !== undefined && (
                    <h3 className="text-base font-semibold">
                        {formatType(value["@type"])}
                    </h3>
                )}
                <dl>
                    {Object.entries(value)
                        .filter(([key]) => shouldInclude(key))
                        .map(([key, nestedValue]) => (
                            <div className="grid grid-cols-2 gap-2 py-2" key={key}>
                                <dt className="font-medium">{key}</dt>
                                <dd className="break-words">
                                    <PropertyValue value={nestedValue} />
                                </dd>
                            </div>
                        ))}
                </dl>
            </div>
        );
    }

    return formatValue(value);
}

export default function Data({ object }: Props) {
    return (
        <section>
            {object["@type"] !== undefined && (
                <h2 className="text-lg font-semibold">
                    {formatType(object["@type"])}
                </h2>
            )}
            <dl className="divide-y">
                {Object.entries(object)
                    .filter(([key]) => shouldInclude(key))
                    .map(([key, value]) => (
                        <div className="grid grid-cols-2 gap-2 py-2" key={key}>
                            <dt className="font-medium">{key}</dt>
                            <dd className="break-words">
                                <PropertyValue value={value} />
                            </dd>
                        </div>
                    ))}
            </dl>
        </section>
    );
}

import type { Article, Product, Recipe, VideoObject, Thing } from "schema-dts";

type SchemaTypeName<T> = T extends { "@type": infer Type extends string } ? Type : never;

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSchemaType(type: string): string {
    return type.slice(type.lastIndexOf("/") + 1);
}

export function isSchemaType<T extends Thing>(
    value: unknown,
    schemaTypes: SchemaTypeName<T> | readonly SchemaTypeName<T>[]
): value is T {
    if (typeof value !== "object" || value === null || !("@type" in value)) {
        return false;
    }

    const actualType = value["@type"];
    const actualTypes =
        typeof actualType === "string"
            ? [actualType]
            : Array.isArray(actualType)
              ? actualType.filter((type): type is string => typeof type === "string")
              : [];
    const acceptedTypes = new Set(
        (typeof schemaTypes === "string" ? [schemaTypes] : schemaTypes).map(
            normalizeSchemaType
        )
    );

    return actualTypes.some((type) => acceptedTypes.has(normalizeSchemaType(type)));
}

export function isVideo(value: unknown) {
    return isSchemaType<VideoObject>(value, ["VideoObject", "VideoObjectSnapshot"]);
}

export function isProduct(value: unknown) {
    return isSchemaType<Product>(value, [
        "Product",
        "DietarySupplement",
        "Drug",
        "IndividualProduct",
        "ProductCollection",
        "ProductGroup",
        "ProductModel",
        "SomeProducts",
        "Vehicle",
        "BusOrCoach",
        "Car",
        "Motorcycle",
        "MotorizedBicycle",
    ]);
}

export function isArticle(value: unknown) {
    return isSchemaType<Article>(value, [
        "Article",
        "AdvertiserContentArticle",
        "NewsArticle",
        "AnalysisNewsArticle",
        "AskPublicNewsArticle",
        "BackgroundNewsArticle",
        "OpinionNewsArticle",
        "ReportageNewsArticle",
        "ReviewNewsArticle",
        "Report",
        "SatiricalArticle",
        "ScholarlyArticle",
        "MedicalScholarlyArticle",
        "SocialMediaPosting",
        "BlogPosting",
        "LiveBlogPosting",
        "DiscussionForumPosting",
        "TechArticle",
        "APIReference"
    ]);
}

export function isRecipe(value: unknown) {
    return isSchemaType<Recipe>(value, ["Recipe"]);
}

const ISO_DURATION_PATTERN =
    /^([+-])?P(?:(\d+(?:[.,]\d+)?)Y)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)W)?(?:(\d+(?:[.,]\d+)?)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?$/;

export function convertDuration(duration: string, mode: "words" | "short"): string {
    const match = ISO_DURATION_PATTERN.exec(duration);
    if (!match) {
        throw new TypeError(`Invalid ISO 8601 duration: ${duration}`);
    }

    const components = match.slice(2);
    if (!components.some((component) => component !== undefined)) {
        throw new TypeError(`Invalid ISO 8601 duration: ${duration}`);
    }

    const hasTime = components.slice(4).some((component) => component !== undefined);
    if (duration.includes("T") && !hasTime) {
        throw new TypeError(`Invalid ISO 8601 duration: ${duration}`);
    }

    const hasWeeks = components[2] !== undefined;
    if (hasWeeks && components.some((component, index) => index !== 2 && component !== undefined)) {
        throw new TypeError("ISO 8601 week durations cannot include other components");
    }

    let foundFraction = false;
    for (const component of components) {
        if (component === undefined) {
            continue;
        }
        if (foundFraction) {
            throw new TypeError("Only the smallest ISO 8601 duration unit may be fractional");
        }
        foundFraction = /[.,]/.test(component);
    }

    const values = components.map((component) =>
        component === undefined ? 0 : Number(component.replace(",", "."))
    );
    if (values.some((value) => !Number.isFinite(value))) {
        throw new RangeError("ISO 8601 duration component is too large");
    }

    const [years, months, weeks, days, hours, minutes, seconds] = values;
    const negative = match[1] === "-";

    if (mode === "short") {
        if (components.slice(0, 4).some((component) => component !== undefined)) {
            throw new RangeError("Short duration format only supports hours, minutes, and seconds");
        }

        const totalSeconds = Number((hours * 3600 + minutes * 60 + seconds).toFixed(9));
        const wholeHours = Math.floor(totalSeconds / 3600);
        const wholeMinutes = Math.floor((totalSeconds - wholeHours * 3600) / 60);
        const remainingSeconds = totalSeconds - wholeHours * 3600 - wholeMinutes * 60;
        const secondsText = Number(remainingSeconds.toFixed(9)).toString();
        const formattedSeconds = remainingSeconds < 10 ? `0${secondsText}` : secondsText;
        const clock = [
            String(wholeHours).padStart(2, "0"),
            String(wholeMinutes).padStart(2, "0"),
            formattedSeconds
        ].join(":");

        return negative && totalSeconds !== 0 ? `-${clock}` : clock;
    }

    const parts: string[] = ([
        [years, "year"],
        [months, "month"],
        [weeks, "week"],
        [days, "day"],
        [hours, "hour"],
        [minutes, "minute"],
        [seconds, "second"]
    ] as [number, string][])
        .filter(([value]) => value !== 0)
        .map(([value, unit]) => `${value} ${unit}${Math.abs(value) === 1 ? "" : "s"}`);

    if (parts.length === 0) {
        return "0 seconds";
    }

    return `${negative ? "-" : ""}${parts.join(", ")}`;
}

export function getStringValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
        const doc = new DOMParser().parseFromString(value, "text/html");
        return doc.documentElement.textContent;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const stringValue = getStringValue(item);
            if (stringValue !== undefined) {
                return stringValue;
            }
        }
        return undefined;
    }

    if (typeof value === 'object' && value !== null) {
        if ('value' in value) {
            return getStringValue(value.value);
        }
        if ('url' in value) {
            return getStringValue(value.url);
        }
    }

    return undefined;
}

export function getSchemaText(value: unknown): string | undefined {
    if (typeof value === "number") {
        return String(value);
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const text = getSchemaText(item);
            if (text) {
                return text;
            }
        }
        return undefined;
    }

    if (isRecord(value)) {
        for (const property of ["text", "name", "value", "url", "contentUrl"]) {
            if (property in value) {
                const text = getSchemaText(value[property]);
                if (text) {
                    return text;
                }
            }
        }
    }

    return getStringValue(value);
}

export function getAuthorName(author: unknown): string | undefined {
    if (Array.isArray(author)) {
        for (const candidate of author) {
            const name = getAuthorName(candidate);
            if (name) {
                return name;
            }
        }
        return undefined;
    }

    if (typeof author === "object" && author !== null && "name" in author) {
        return getStringValue(author.name);
    }

    return getStringValue(author);
}

import type { Product } from "schema-dts";
import { getSchemaText, isRecord } from "./utils";

interface Props {
    object: Product;
}

function getRecords(value: unknown): Record<string, unknown>[] {
    if (Array.isArray(value)) {
        return value.flatMap(getRecords);
    }
    return isRecord(value) ? [value] : [];
}

function getImageUrl(value: unknown): string | undefined {
    if (Array.isArray(value)) {
        for (const image of value) {
            const url = getImageUrl(image);
            if (url) {
                return url;
            }
        }
        return undefined;
    }

    if (isRecord(value)) {
        for (const property of ["url", "contentUrl", "thumbnailUrl"]) {
            if (property in value) {
                const url = getSchemaText(value[property]);
                if (url) {
                    return url;
                }
            }
        }
    }

    return getSchemaText(value);
}

function formatPrice(price: string): string {
    return price.replace(/([.,]\d)$/, (decimal) => `${decimal}0`);
}

function getOfferPrice(value: unknown): string | undefined {
    for (const offer of getRecords(value)) {
        const currency = getSchemaText(offer.priceCurrency);
        const priceSpecification = getRecords(offer.priceSpecification);
        const price =
            getSchemaText(offer.price) ??
            priceSpecification.map((specification) => getSchemaText(specification.price)).find(Boolean) ??
            getSchemaText(offer.lowPrice) ??
            getSchemaText(offer.highPrice);

        if (price) {
            const formattedPrice = formatPrice(price);
            return currency ? `${currency} ${formattedPrice}` : formattedPrice;
        }
    }
    return undefined;
}

function getRating(value: unknown): string | undefined {
    const rating = getRecords(value)[0];
    if (!rating) {
        return undefined;
    }

    const ratingValue = getSchemaText(rating.ratingValue);
    if (!ratingValue) {
        return undefined;
    }

    const bestRating = getSchemaText(rating.bestRating);
    const ratingCount = getSchemaText(rating.ratingCount) ?? getSchemaText(rating.reviewCount);
    const scale = bestRating ? ` / ${bestRating}` : "";
    const count = ratingCount ? ` (${ratingCount} ratings)` : "";
    return `${ratingValue}${scale}${count}`;
}

export default function ProductView({ object }: Props) {
    const imageUrl = getImageUrl(object.image);
    const name = getSchemaText(object.name) ?? "Untitled product";
    const price = getOfferPrice(object.offers);
    const brand = getSchemaText(object.brand);
    const rating = getRating(object.aggregateRating);

    return (
        <article className="w-full overflow-hidden rounded-md border bg-card">
            {imageUrl ? (
                <img
                    className="aspect-[4/3] w-full bg-muted object-contain"
                    src={imageUrl}
                    alt={name}
                />
            ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-muted text-sm text-muted-foreground">
                    No image available
                </div>
            )}
            <div className="space-y-1 p-4">
                <h2 className="text-xl font-semibold leading-tight">{name}</h2>
                {price && <p className="text-lg font-semibold">{price}</p>}
                {brand && (
                    <p className="text-sm text-muted-foreground">Brand: {brand}</p>
                )}
                {rating && (
                    <p className="text-sm text-muted-foreground">Rating: {rating}</p>
                )}
            </div>
        </article>
    );
}

import type { Recipe } from "schema-dts";
import { convertDuration, getSchemaText, isRecord } from "./utils";

interface Props {
    object: Recipe;
}

function getListItems(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.flatMap(getListItems);
    }

    if (isRecord(value)) {
        if ("itemListElement" in value) {
            return getListItems(value.itemListElement);
        }
        if ("step" in value) {
            return getListItems(value.step);
        }
    }

    const text = getSchemaText(value);
    return text ? [text] : [];
}

export default function RecipeView({ object }: Props) {
    const name = getSchemaText(object.name) ?? "Untitled recipe";
    const yieldValue = getSchemaText(object.recipeYield);
    const totalTimeValue = getSchemaText(object.totalTime);
    const totalTime = totalTimeValue
        ? convertDuration(totalTimeValue, "words")
        : undefined;
    const imageUrl = getSchemaText(object.image);
    const ingredients = getListItems(object.recipeIngredient);
    const directions = getListItems(object.recipeInstructions);

    return (
        <article className="w-full overflow-hidden rounded-md border bg-card">
            <header className="px-4 pt-4 text-center">
                <h2 className="font-serif text-2xl font-bold leading-tight">
                    {name}
                </h2>
                {(yieldValue || totalTime) && (
                    <dl className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        {yieldValue && (
                            <div>
                                <dt className="font-semibold text-foreground">Yield</dt>
                                <dd>{yieldValue}</dd>
                            </div>
                        )}
                        {totalTime && (
                            <div>
                                <dt className="font-semibold text-foreground">Total time</dt>
                                <dd>{totalTime}</dd>
                            </div>
                        )}
                    </dl>
                )}
            </header>

            <div className="grid grid-cols-2 gap-4 p-4">
                <section>
                    {imageUrl && (
                        <img
                            className="mb-4 max-h-56 w-full rounded-md object-cover"
                            src={imageUrl}
                            alt={name}
                        />
                    )}
                    <h3 className="mb-2 border-b pb-1 font-serif text-lg font-semibold">
                        Ingredients
                    </h3>
                    <ul className="list-disc space-y-1 pl-4 text-sm">
                        {ingredients.map((ingredient, index) => (
                            <li key={index}>{ingredient}</li>
                        ))}
                    </ul>
                </section>
                <section>
                    <h3 className="mb-2 border-b pb-1 font-serif text-lg font-semibold">
                        Directions
                    </h3>
                    <ol className="list-decimal space-y-2 pl-4 text-sm">
                        {directions.map((direction, index) => (
                            <li key={index}>{direction}</li>
                        ))}
                    </ol>
                </section>
            </div>
        </article>
    );
}

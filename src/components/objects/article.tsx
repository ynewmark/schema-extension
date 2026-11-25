import type { Article } from "schema-dts";
import { getAuthorName, getStringValue } from "./utils";

interface Props {
    object: Article;
}

export default function ArticlePreview({ object }: Props) {
    const headline =
        getStringValue(object.headline) ??
        getStringValue(object.name) ??
        "Untitled article";
    const description = getStringValue(object.description);
    const author = getAuthorName(object.author);
    const body = getStringValue(object.articleBody);

    return (
        <article className="w-full rounded-md border bg-card px-4 py-4">
            <header className="border-b pb-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Article
                </p>
                <h2 className="mt-2 font-serif text-2xl font-bold leading-tight">
                    {headline}
                </h2>
                {description && (
                    <p className="mt-2 font-serif text-base italic leading-snug text-muted-foreground">
                        {description}
                    </p>
                )}
                {author && (
                    <p className="mt-3 text-xs text-muted-foreground">
                        By <span className="font-medium text-foreground">{author}</span>
                    </p>
                )}
            </header>
            {body && (
                <p className="mt-3 line-clamp-7 font-serif text-sm leading-6">
                    {body}
                </p>
            )}
        </article>
    );
}

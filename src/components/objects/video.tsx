import type { VideoObject } from 'schema-dts';
import { convertDuration, getAuthorName, getStringValue } from './utils';

interface Props {
    object: VideoObject;
}

export default function Video({ object }: Props) {
    const name = getStringValue(object.name) ?? 'Untitled video';
    const author = getAuthorName(object.author);
    const thumbnailUrl = getStringValue(object.thumbnailUrl);
    const duration = getStringValue(object.duration);

    return (
        <article className="w-full">
            <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                {thumbnailUrl ? (
                    <img
                        className="h-full w-full object-cover"
                        src={thumbnailUrl}
                        alt={name}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No thumbnail available
                    </div>
                )}
                {duration && (
                    <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                        {convertDuration(duration, 'short')}
                    </span>
                )}
            </div>
            <h3 className="mt-2 text-sm font-medium">{name}</h3>
            {author && (
                <p className="text-xs text-muted-foreground">By {author}</p>
            )}
        </article>
    );
}

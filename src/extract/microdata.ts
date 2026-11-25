import { Extractor, SchemaElement } from './types';

function extractValue($el: Element): string {
    if ($el.getAttribute('content')) return $el.getAttribute('content') ?? "";
    const tagName = $el.tagName.toLowerCase();
    if (tagName === 'meta') return $el.getAttribute('content') || '';
    if (['audio', 'embed', 'iframe', 'img', 'source', 'track', 'video'].includes(tagName)) return $el.getAttribute('src') || '';
    if (['a', 'area', 'link'].includes(tagName)) return $el.getAttribute('href') || '';
    if (tagName === 'object') return $el.getAttribute('data') || '';
    if (['data', 'meter'].includes(tagName)) return $el.getAttribute('value') || $el.textContent.trim();
    if (tagName === 'time') return $el.getAttribute('datetime') || $el.textContent.trim();

    return $el.textContent.trim();
}

function getExtractor(type: string, id: string, prop: string, itemAttr = type): Extractor {

    return function (document: Document): SchemaElement[] {
        const scopeSelector = `[${itemAttr}]`;

        function parseScope($scope: Element) {
            const item: Record<string, any> = {
                "@type": $scope.getAttribute(type) || "",
            };

            if ($scope.getAttribute(id)) {
                item["@id"] = $scope.getAttribute(id);
            }

            $scope.querySelectorAll(`[${prop}]`).forEach((el) => {
                if (el.parentElement?.closest(scopeSelector) !== $scope) {
                    return;
                }

                const propName = el.getAttribute(prop) ?? "";
                const value = el.matches(scopeSelector) ? parseScope(el) : extractValue(el);

                if (item.hasOwnProperty(propName)) {
                    if (!Array.isArray(item[propName])) {
                        item[propName] = [item[propName]];
                    }
                    item[propName].push(value);
                } else {
                    item[propName] = value;
                }
            });
            return item;
        }

        const items: any[] = [];
        document.querySelectorAll(scopeSelector).forEach((el) => {
            if (!el.parentElement?.closest(scopeSelector)) {
                items.push(parseScope(el));
            }
        });

        return items;
    }
}

export const extractMicrodata: Extractor = getExtractor('itemtype', 'itemid', 'itemprop', 'itemscope');
export const extractRdfa: Extractor = getExtractor('typeof', 'resource', 'property');

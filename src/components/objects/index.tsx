import { SchemaElement } from "@/extract/types";
import { isArticle, isProduct, isRecipe, isVideo } from "./utils";
import Video from "./video";
import Data from "./data";
import ArticlePreview from "./article";
import RecipeView from "./recipe";
import ProductView from "./product";

interface Props {
    object: SchemaElement,
    useSpecial: boolean
}

export default function View({object, useSpecial}: Props) {
    if (useSpecial) {
        if (isRecipe(object)) {
            return <RecipeView object={object}></RecipeView>
        }
        if (isVideo(object)) {
            return <Video object={object}></Video>
        }
        if (isProduct(object)) {
            return <ProductView object={object}></ProductView>
        }
        if (isArticle(object)) {
            return <ArticlePreview object={object}></ArticlePreview>
        }
    }
    return <Data object={object}></Data>
}

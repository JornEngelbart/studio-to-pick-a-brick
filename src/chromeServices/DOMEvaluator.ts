import { BrickQueryResult, BrickToPick, ElementData, GraphResp, PickResult } from "../types";

const getCookie = (name: string): string | null => {
    const nameLenPlus = (name.length + 1);
    return document.cookie
        .split(';')
        .map(c => c.trim())
        .filter(cookie => {
            return cookie.substring(0, nameLenPlus) === `${name}=`;
        })
        .map(cookie => {
            return decodeURIComponent(cookie.substring(nameLenPlus));
        })[0] || null;
}

// Function called when a new message is received
const messagesFromReactAppListener = (
    pickBricks: BrickToPick,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: PickResult) => void) => {

    const doListener = async () => {
        const queryResp = await fetch(
            "https://www.lego.com/api/graphql/PickABrickQuery",
            {
                method: "POST",
                headers: {
                    "x-locale": pickBricks.locale,
                    "content-type": "application/json",
                    "accept": "application/json",
                    "authorization": getCookie('gqauth') || "",
                },
                body: JSON.stringify(
                    {
                        "operationName": "PickABrickQuery",
                        "variables": {
                            "page": 1,
                            "perPage": 20,
                            "includeOutOfStock": false,
                            "sort": {
                                "key": "RELEVANCE",
                                "direction": "ASC"
                            },
                            "query": String(pickBricks.elementId),
                            "sku": null,
                            "locale": "nl-nl"
                        },
                        "query": "query PickABrickQuery($query: String, $page: Int!, $perPage: Int!, $sort: SortInput, $includeOutOfStock: Boolean, $filters: [Filter!], $sku: String) {\n  __typename\n  elements(\n    query: $query\n    page: $page\n    perPage: $perPage\n    filters: $filters\n    includeOutOfStock: $includeOutOfStock\n    sort: $sort\n  ) {\n    count\n    facets {\n      ...FacetData\n      __typename\n    }\n    sortOptions {\n      ...Sort_SortOptions\n      __typename\n    }\n    results {\n      ...ElementLeafData\n      __typename\n    }\n    set {\n      name\n      imageUrl\n      pieces\n      price {\n        formattedAmount\n        __typename\n      }\n      __typename\n    }\n    total\n    __typename\n  }\n}\n\nfragment FacetData on Facet {\n  id\n  key\n  name\n  labels {\n    count\n    key\n    name\n    ... on FacetValue {\n      value\n      __typename\n    }\n    ... on FacetRange {\n      from\n      to\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment Sort_SortOptions on SortOptions {\n  id\n  key\n  direction\n  label\n  analyticLabel\n  __typename\n}\n\nfragment ElementLeafData on Element {\n  id\n  name\n  categories {\n    name\n    key\n    parent {\n      name\n      __typename\n    }\n    __typename\n  }\n  spinsetMedia {\n    frames {\n      url\n      __typename\n    }\n    __typename\n  }\n  inStock\n  ... on SingleVariantElement {\n    variant {\n      ...ElementLeafVariant\n      __typename\n    }\n    __typename\n  }\n  ... on MultiVariantElement {\n    variants {\n      ...ElementLeafVariant\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment ElementLeafVariant on ElementVariant {\n  id\n  price {\n    centAmount\n    formattedAmount\n    __typename\n  }\n  attributes {\n    designNumber\n    colourId\n    deliveryChannel\n    maxOrderQuantity\n    system\n    quantityInSet(sku: $sku)\n    __typename\n  }\n  __typename\n}"
                    }
                )
            }
        )

        let cartType = "pab"
        if (queryResp.status === 200) {
            const queryList = await queryResp.json() as GraphResp<ElementData<BrickQueryResult>>
            if (queryList.data !== undefined) {
                if (queryList.data?.elements.results.length > 0) {
                    cartType = queryList.data?.elements.results[0].variant.attributes.deliveryChannel
                } else {
                    console.log(`Could not find element ${pickBricks.elementId} in Lego Shop`)
                    sendResponse({
                        brick: pickBricks,
                        brickNotFound: true,
                        success: false,
                    })
                    return
                }
            } else {
                console.log(`Could not find element ${pickBricks.elementId}`)
                sendResponse({
                    brick: pickBricks,
                    success: false,
                })
                return
            }
        } else {
            sendResponse({
                brick: pickBricks,
                success: false,
            })
            return
        }

        const resp = await fetch(
            "https://www.lego.com/api/graphql/AddToElementCart",
            {
                method: "POST",
                headers: {
                    "x-locale": pickBricks.locale,
                    "content-type": "application/json",
                    "accept": "application/json",
                    "authorization": getCookie('gqauth') || "",
                },
                body: JSON.stringify(
                    {
                        "operationName": "AddToElementCart",
                        "variables": {
                            "items": [
                                {
                                    "sku": String(pickBricks.elementId),
                                    "quantity": pickBricks.requestedQuantity
                                }
                            ],
                            "cartType": cartType
                        },
                        "query": "mutation AddToElementCart($items: [ElementInput!]!, $cartType: CartType) {\n  addToElementCart(input: {items: $items, cartType: $cartType}) {\n    ...BrickCartData\n    ...MinifigureCartData\n    __typename\n  }\n}\n\nfragment BrickCartData on BrickCart {\n  id\n  taxedPrice {\n    totalGross {\n      formattedAmount\n      formattedValue\n      currencyCode\n      __typename\n    }\n    __typename\n  }\n  totalPrice {\n    formattedAmount\n    formattedValue\n    currencyCode\n    __typename\n  }\n  lineItems {\n    ...LineItemData\n    __typename\n  }\n  subTotal {\n    formattedAmount\n    formattedValue\n    __typename\n  }\n  shippingMethod {\n    price {\n      formattedAmount\n      __typename\n    }\n    shippingRate {\n      formattedAmount\n      __typename\n    }\n    minimumFreeShippingAmount {\n      formattedAmount\n      formattedValue\n      __typename\n    }\n    isFree\n    __typename\n  }\n  __typename\n}\n\nfragment LineItemData on PABCartLineItem {\n  id\n  quantity\n  element {\n    id\n    name\n    __typename\n  }\n  price {\n    centAmount\n    currencyCode\n    __typename\n  }\n  elementVariant {\n    id\n    attributes {\n      designNumber\n      deliveryChannel\n      maxOrderQuantity\n      __typename\n    }\n    __typename\n  }\n  totalPrice {\n    formattedAmount\n    __typename\n  }\n  __typename\n}\n\nfragment MinifigureCartData on MinifigureCart {\n  id\n  taxedPrice {\n    totalGross {\n      formattedAmount\n      formattedValue\n      currencyCode\n      __typename\n    }\n    __typename\n  }\n  totalPrice {\n    formattedAmount\n    formattedValue\n    currencyCode\n    __typename\n  }\n  minifigureData {\n    ...MinifigureDataTupleData\n    __typename\n  }\n  __typename\n}\n\nfragment MinifigureDataTupleData on MinifigureDataTuple {\n  figureId\n  elements {\n    ...MinifigureLineItemData\n    __typename\n  }\n  __typename\n}\n\nfragment MinifigureLineItemData on PABCartLineItem {\n  id\n  elementVariant {\n    id\n    attributes {\n      indexImageURL\n      backImageURL\n      isShort\n      __typename\n    }\n    __typename\n  }\n  metadata {\n    minifigureCategory\n    bamFigureId\n    __typename\n  }\n  __typename\n}"
                    }
                )
            }
        )
        if (resp.status === 200) {
            const addToCartResponse = await resp.json() as GraphResp<any>
            if (addToCartResponse.errors !== undefined && addToCartResponse.errors?.length > 0) {
                // We want to try the next type of cart if possible
                console.log(`Could not find element ${pickBricks.elementId} with cart type ${cartType}`)
                sendResponse({
                    brick: pickBricks,
                    success: false,
                })
                return
            } else {
                // Found it, continue
                sendResponse({
                    brick: pickBricks,
                    bricksAdded: pickBricks.requestedQuantity,
                    success: true,
                })
                return
            }
        } else {
            // Some other error, no idea what happened?
            console.log(`Got an error for ${pickBricks.elementId} with cart type ${cartType}`)
            sendResponse({
                brick: pickBricks,
                success: false,
            })
            return
        }
    }
    doListener()
    return true;
}

/**
* Fired when a message is sent from either an extension process or a content script.
*/
chrome.runtime.onMessage.addListener(messagesFromReactAppListener);

export { }
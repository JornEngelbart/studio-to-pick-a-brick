export type BrickToPick = {
    elementId: string|null;
    colorId: string;
    partNumber: string;
    requestedQuantity: number;
    name?: string;
    color?: string;

    locale: string
}

export type ConsideredElement = {
    picked: boolean
    elementId: string
}

export type PickResult = {
    success: boolean;
    brick: BrickToPick
    bricksAdded?: number;
    brickNotFound?: boolean
}

export enum PickStatus {
    InProgress = "In Progress",
    Success = "Success",
    Failed = "Failed",
    TryingToFindBrick = "Trying to find Brick",
    Skipped = "Skipped"
}

export type PickedBrickRow = {
    specifiedBrick: BrickToPick
    pickResults: PickResult[]
    status: PickStatus
}

export type PickError = {
    reason: string
}

export type CSVLine = {
    ElementId?: string
    BLItemNo?: string
    LDrawColorId?: string
    Qty?: string
    PartName?: string
    ColorName?: string
}

export type GraphResp<T> = {
    errors? : any[]
    data?: T
}

export type ElementData<T> = {
    elements: ListData<T>
}

export type ListData<T> = {
    results: T[]
}

export type BrickQueryResult = {
    id: string
    variant: {
        id: string
        attributes: {
            deliveryChannel: string
        }
    }
}
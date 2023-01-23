import { PickStatus } from "./types";

export const colorForStatus = (s: PickStatus): string => {
    if (s == PickStatus.Success) return "success"
    if (s == PickStatus.Skipped) return "secondary"
    if (s == PickStatus.TryingToFindBrick) return "warning"
    if (s == PickStatus.Failed) return "danger"
    if (s == PickStatus.InProgress) return "primary"

    return "light"
}

export const textForStatus = (s: PickStatus): string => {
    if (s == PickStatus.Success) return "Success"
    if (s == PickStatus.Skipped) return "Skipped"
    if (s == PickStatus.TryingToFindBrick) return "Trying to find Brick"
    if (s == PickStatus.Failed) return "Failed"
    if (s == PickStatus.InProgress) return "In Progress"

    return "light"
}
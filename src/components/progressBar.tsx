import React from "react";
import { colorForStatus, textForStatus } from "../helpers";
import { BrickToPick, PickedBrickRow, PickStatus } from "../types";
 
const ProgressBar: React.FC<{
    bricksToPick: BrickToPick[];
    pickedBricks: PickedBrickRow[];
    filterUpdated: (status: PickStatus[]) => void;
}> = ({ bricksToPick, pickedBricks, filterUpdated }) => {
    const [statusFilter, setStatusFilter] = React.useState<PickStatus[]>([])

    const total = bricksToPick.length
    const bar = (s: PickStatus, percentage: number): JSX.Element => {
        if (percentage == 0) {
            return <></>
        }
        const p = percentage * 100;
        return <div className={`progress-bar bg-${colorForStatus(s)}`} role="progressbar" style={{ width: `${p}%` }} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}></div>
    }

    const button = (s: PickStatus, processed: number, percentage: number): JSX.Element => {
        if (percentage == 0) {
            return <></>
        }

        return <button type="button" className={`ml-1 btn btn-${colorForStatus(s)}`} onClick={() => toggleFilter(s)} disabled={isDisabled(s)}>{processed} {textForStatus(s)}</button>
    }

    const isDisabled = (s: PickStatus): boolean => {
        if (statusFilter.length == 0 || statusFilter.includes(s)) return false
        return true
    }

    const toggleFilter = (s: PickStatus) => {
        if (statusFilter.includes(s)) {
            setStatusFilter(oldArray => {
                const values = oldArray.filter(v => v != s)
                filterUpdated(values)
                return values
            })
        }else {
            setStatusFilter(oldArray => {
                const values = [...oldArray, s]
                filterUpdated(values)
                return values
            })
        }
    }

    return (
        <div>
            <div className="progress">
                {Object.values(PickStatus).map(s => {
                    const processed = pickedBricks.filter(v => v.status == s).length
                    const percentage = processed / total

                    return bar(s, percentage)
                })}
            </div>
            <p></p>
            <div>
                {Object.values(PickStatus).map(s => {
                    const processed = pickedBricks.filter(v => v.status == s).length
                    const percentage = processed / total

                    return button(s, processed, percentage)
                })}
                <button type="button" className={`ml-1 btn btn-light`} disabled={true}>{total} Total</button>
            </div>
            <p></p>
        </div>
    )
}

export default ProgressBar
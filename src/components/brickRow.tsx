import React from "react";
import { colorForStatus, textForStatus } from "../helpers";
import { BrickToPick, PickedBrickRow, PickStatus } from "../types";

const brickName = (brick: BrickToPick): JSX.Element =>
    <span>
        {brick.name || brick.elementId}
        {brick.color !== null ? <span> in color {brick.color}</span> : ""}
    </span>

const renderStatus = (s: PickStatus): JSX.Element => {
    return <span className={`badge bg-${colorForStatus(s)}`}>{textForStatus(s)}</span>
}

const BrickRow: React.FC<{
    row: PickedBrickRow;
}> = ({ row }) => {
    return (<>
        <div className="card mb-3">
            <div className="row g-0">
                <div className="col-md-2">
                    {row.status !== PickStatus.Skipped ? <img src={`https://cdn.rebrickable.com/media/parts/elements/${row.specifiedBrick!.elementId}.jpg`} className="img-fluid rounded-start" width="100px" /> : ""}
                </div>
                <div className="col-md-10">
                    <div className="card-body">
                        <h6 className="card-title">
                            {row.status === PickStatus.Skipped ?
                                <span>PartNumber: {row.specifiedBrick!.partNumber}, colorId: {row.specifiedBrick!.colorId}</span> :
                                <span>ElementID {row.specifiedBrick!.elementId} {renderStatus(row.status)}</span>}
                        </h6>
                        <p className="card-text">{brickName(row.specifiedBrick!)}</p>
                        <p className="card-text">
                            <small className="text-muted">
                                {
                                    row.pickResults.map(result =>
                                        result.success ? <div>Added {result.bricksAdded} of element {result.brick.elementId}.</div> : result.brickNotFound ?
                                            <div>Was not able to find element {result.brick.elementId}, trying to find an alternative on Bricklink.</div> :
                                            <div>Was not able to find element {result.brick.elementId}.</div>
                                    )}
                            </small>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </>)
}

export default BrickRow
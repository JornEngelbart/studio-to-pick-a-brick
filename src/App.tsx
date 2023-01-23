import React, { useEffect } from 'react';
import './App.css';
import { BrickToPick, CSVLine, PickedBrickRow, PickResult, PickStatus } from './types';
import Papa from 'papaparse';
import { REBRICKABLE_KEY } from './constants';
import ProgressBar from './components/progressBar';
import BrickRow from './components/brickRow';

const goToUrl = async (tab: chrome.tabs.Tab, url: string): Promise<void> => {
  if (tab.id) {
    chrome.tabs.update(tab.id, { url });
    return new Promise(resolve => {
      chrome.tabs.onUpdated.addListener(function onUpdated(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }
      });
    });
  }
}

const findAlternativeBricks = async (brickToPick: BrickToPick): Promise<BrickToPick[]> => {
  const resp = await fetch(`https://rebrickable.com/api/v3/lego/parts/${brickToPick.partNumber}/colors/${brickToPick.colorId}/`, {
    method: "GET",
    headers: {
      "accept": "application/json",
      "authorization": `key ${REBRICKABLE_KEY}`
    }
  })

  if (resp.status !== 200) {
    return []
  }

  const rebrickableResp = await resp.json() as {
    elements: string[]
  }

  const alternatives: BrickToPick[] = []
  for (const elem of rebrickableResp.elements) {
    if (elem !== brickToPick.elementId) {
      alternatives.push({
        elementId: elem,
        colorId: brickToPick.colorId,
        partNumber: brickToPick.partNumber,
        requestedQuantity: brickToPick.requestedQuantity,
        name: brickToPick.name,
        color: brickToPick.color,

        locale: brickToPick.locale
      })
    }
  }

  return alternatives
}

function App() {
  const [locale, setLocale] = React.useState<string>("en-us");
  const [isPickABrick, setIsPickABrick] = React.useState<boolean>(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [pickedBrickRows, setPickedBrickRows] = React.useState<PickedBrickRow[]>([]);
  const [bricksToPick, setBricksToPick] = React.useState<BrickToPick[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<PickStatus[]>([]);
  const [done, setDone] = React.useState<boolean>(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
      if (tabs[0].url !== undefined) {
        let url = new URL(tabs[0].url);

        if (url.host.endsWith("lego.com") && url.pathname.endsWith("pick-and-build/pick-a-brick")) {
          let locale = url.pathname.split("/")[1].split("-")
          setLocale(`${locale[0]}-${locale[1].toUpperCase()}`)
          setIsPickABrick(true)
        }
      }
    });
  }, []);

  const changeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files !== null && files.length > 0) {
      Papa.parse<CSVLine>(files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          setFileName(files[0].name)
          const bricksToPick: BrickToPick[] = []
          for (let line of results.data) {
            if (line.Qty === "" || line.BLItemNo === "" || line.LDrawColorId === "") {
              continue
            }
            let elementId = null
            if (line.ElementId !== "") {
              elementId = line.ElementId!
            }
            bricksToPick.push({
              elementId: elementId,
              colorId: line.LDrawColorId!,
              partNumber: line.BLItemNo!,
              requestedQuantity: Number(line.Qty),
              name: line.PartName,
              color: line.ColorName,

              locale: locale,
            })
          }
          setBricksToPick(bricksToPick)
          executeBrickPick(bricksToPick)
        },
      });
    }
  }

  const executeBrickPick = async (bricksToPick: BrickToPick[]): Promise<void> => {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })

    const pickResult: PickResult[] = []
    for (let brickToPick of bricksToPick) {
      let bricksToConsider = [brickToPick]
      if (brickToPick.elementId === null) {
        bricksToConsider = await findAlternativeBricks(brickToPick)
      }
      var i = 0
      let row: PickedBrickRow = {
        specifiedBrick: brickToPick,
        pickResults: [],
        status: PickStatus.InProgress,
      }
      setPickedBrickRows(oldArray => [...oldArray, row])
      const updateRow = () => {
        setPickedBrickRows(oldArray => [...oldArray.slice(0, -1), row])
      }

      if (bricksToConsider.length == 0) {
        row.status = PickStatus.Skipped
        updateRow()
        continue
      } else {
        brickToPick = bricksToConsider[0]
      }

      while (i < bricksToConsider.length) {
        await new Promise<void>(resolve => {
          chrome.tabs.sendMessage(
            tabs[0].id || 0,
            bricksToConsider[i],
            async (response: PickResult) => {
              row.pickResults.push(response)
              if (response.success) {
                row.status = PickStatus.Success
              }
              if (response.brickNotFound && bricksToConsider.length == 1) {
                row.status = PickStatus.TryingToFindBrick
                bricksToConsider.push(...await findAlternativeBricks(brickToPick))
              }
              updateRow()
              resolve()
            })
        });
        i++
      }
      if (row.status !== PickStatus.Success) {
        row.status = PickStatus.Failed
        updateRow()
      }
    }

    if (tabs[0].url !== undefined) {
      await goToUrl(tabs[0], tabs[0].url);
    }

    setDone(true)
  }

  return (
    <div className="container">
      {!isPickABrick ? <div className="alert alert-dark" role="alert">Go to lego.com/pick-and-build/pick-a-brick to get started!</div> : <>
        {fileName === null ?
          <>
            <p></p>
            <p>
              To import your <a href="https://stud.io">stud.io</a> model: 
            <ul>
              <li>Open your <i>.io</i> file in <i>stud.io</i></li>
              <li>Click <i>File</i>, then <i>Export as</i>, and then <i>Export as PartsList...</i></li>
              <li>Save your model as <i>.csv</i></li>
              <li>Select the <i>.csv</i> file in the file input below and get started!</li>
            </ul>
            </p>
            <form>
              <div className="mb-3">
                <label htmlFor="formFileMultiple" className="form-label">Stud.io PartList (csv)</label>
                <input className="form-control" type="file" name="file"
                  accept=".csv"
                  onChange={changeHandler} />
              </div>
            </form>
          </>
          : <div><p></p>
            {done ?
              <div className="alert alert-success" role="alert">
                All done parsing bricks in {fileName}!
              </div>
              :
              <div className="alert alert-dark" role="alert">
                Parsing all requested bricks in {fileName}. <br /> <small className="text-muted">Keep this popup open and don't leave the Pick a Brick tab!</small>
              </div>
            }
            <div>
              <ProgressBar bricksToPick={bricksToPick} pickedBricks={pickedBrickRows} filterUpdated={setStatusFilter} />
            </div>
            <>{pickedBrickRows.filter(v => statusFilter.length == 0 || statusFilter.includes(v.status)).map(
              row => <BrickRow row={row} />
            )}</>
          </div>
        }</>
      }
    </div>
  );
}

export default App;


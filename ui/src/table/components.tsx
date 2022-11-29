import { DataEditor, GridCell, GridCellKind, Item } from "@glideapps/glide-data-grid";
import { useEffect, useCallback } from "react";
import { tableReducer } from "./reducer";
import { TableState } from "./state";
import { GetTableAsyncAction } from "./async_actions"
import { useThunkReducer } from "../util/state"



export function RemoteDataTable(props: any) {
    const [state, dispatch] = useThunkReducer(
        tableReducer, new TableState({ columns: props.initialColumns }))
    useEffect(() => {
        dispatch(new GetTableAsyncAction(props.base_url))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const cellContent = useCallback((cell: Item): GridCell => {
        const [col_idx, row_idx] = cell
        const row = state.row_objects![row_idx]
        let cell_content = row[state.columns[col_idx].id as string]
        if (cell_content === undefined || cell_content === null) {
            cell_content = ""
        }
        return {
            kind: GridCellKind.Text,
            allowOverlay: false,
            displayData: cell_content,
            data: cell_content,
        }
    }, [state.row_objects])
    return <DataTable state={state} cellContent={cellContent} />

}
export function DataTable(props: any) {
    const state = props.state
    if (state.isLoading === undefined || state.isLoading === null || state.isLoading) {
        return <div className="cosmae-table-container-outer">
            <div className="cosmae-table-container-inner">
                <div className="shimmer"></div>
            </div>
        </div>
    } else if (!(state.errorMsg === undefined || state.errorMsg === null || state.errorMsg === "")) {
        return <div><p>Error: {state.errorMsg}</p></div>

    } else {
        return <div className="cosmae-table-container-outer">
            <div className="cosmae-table-container-inner">
                <DataEditor
                    rows={state.row_objects!.length}
                    columns={state.columns}
                    getCellContent={props.cellContent}
                    width="100%"
                    height="100%"
                />
            </div >
        </div >
    }
}

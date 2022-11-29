import { GridColumn } from '@glideapps/glide-data-grid'

export class TableState {
    columns: GridColumn[]
    isLoading?: boolean
    errorMsg?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row_objects?: any[]

    constructor({
        columns,
        isLoading = undefined,
        row_objects = undefined,
        errorMsg = undefined
    }: {
        columns: GridColumn[]
        isLoading?: boolean
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        row_objects?: any[]
        errorMsg?: string
    }) {
        this.columns = columns
        this.isLoading = isLoading
        this.errorMsg = errorMsg
        this.row_objects = row_objects
    }
}

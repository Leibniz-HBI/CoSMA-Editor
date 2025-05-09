import { Column } from '../../column_menu/state'
import { RemoteInterface } from '../../util/state'

export interface DisplayTxtManagementState {
    columns: RemoteInterface<Column[]>
}

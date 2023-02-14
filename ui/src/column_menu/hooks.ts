import { all_columns } from './columns'
import { ColumnDefinition } from './state'

export function useColumnMenu(): ColumnDefinition[] {
    return Object.entries(all_columns).map((tpl) => tpl[1])
}

import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../../store'
import { TagDefinition } from '../../column_menu/state'

function selectDisplayTxtManagement(state: RootState) {
    return state.displayTxtManagement
}

export const selectDisplayTxtTagDefinitions = createSelector(
    selectDisplayTxtManagement,
    (state) => state.tagDefinitions
)

export const selectDisplayTxtTagIdPersistentSet = createSelector(
    selectDisplayTxtTagDefinitions,
    (state) =>
        Object.fromEntries(
            state.value.map((tagDef: TagDefinition) => [tagDef.idPersistent, true])
        )
)

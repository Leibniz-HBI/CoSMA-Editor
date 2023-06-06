import { Remote, useThunkReducer } from '../../util/state'
import {
    ColumnDefinitionContributionSelectAction,
    SetColumnDefinitionFormTabAction
} from './actions'
import {
    LoadColumnDefinitionsContributionAction,
    PatchColumnDefinitionContributionAction
} from './async_actions'
import { columnDefinitionContributionReducer } from './reducer'
import {
    ColumnDefinitionContribution,
    ColumnDefinitionsContributionState,
    ColumnsTriple
} from './state'

export type ColumnDefinitionsContributionProps = {
    loadColumnDefinitionsContributionCallback: VoidFunction
    selectColumnDefinitionContributionCallback: (
        columnDefinition: ColumnDefinitionContribution
    ) => void
    selectColumnCreationTabCallback: (selectCreationTab: boolean) => void
    setExistingCallback: (idPersistent: string) => void
    discardCallback: (idPersistent: string, discard: boolean) => void
    definitions: Remote<ColumnsTriple | undefined>
    selectedColumnDefinition: Remote<ColumnDefinitionContribution | undefined>
    createTabSelected: boolean
}
export function useColumnDefinitionsContribution(
    idPersistent: string
): ColumnDefinitionsContributionProps {
    const [state, dispatch] = useThunkReducer(
        columnDefinitionContributionReducer,
        new ColumnDefinitionsContributionState({})
    )
    return {
        loadColumnDefinitionsContributionCallback: () => {
            if (!state.columns.isLoading) {
                dispatch(new LoadColumnDefinitionsContributionAction(idPersistent))
            }
        },
        selectColumnDefinitionContributionCallback: (
            columnDefinition: ColumnDefinitionContribution
        ) => {
            dispatch(new ColumnDefinitionContributionSelectAction(columnDefinition))
        },
        selectColumnCreationTabCallback: (selectCreationTab) =>
            dispatch(new SetColumnDefinitionFormTabAction(selectCreationTab)),
        setExistingCallback: (idPersistent) => {
            if (
                state.selectedColumnDefinition.value === undefined ||
                state.columns.value === undefined
            ) {
                return
            }
            dispatch(
                new PatchColumnDefinitionContributionAction({
                    idPersistent: state.selectedColumnDefinition.value.idPersistent,
                    idContributionPersistent:
                        state.columns.value.contributionCandidate.idPersistent,
                    idExistingPersistent: idPersistent
                })
            )
        },
        discardCallback: (idPersistent, discard) => {
            if (state.columns.value === undefined) {
                return
            }
            dispatch(
                new PatchColumnDefinitionContributionAction({
                    idPersistent: idPersistent,
                    idContributionPersistent:
                        state.columns.value.contributionCandidate.idPersistent,
                    discard: discard
                })
            )
        },
        definitions: state.columns,
        selectedColumnDefinition: state.selectedColumnDefinition,
        createTabSelected: state.createTabSelected
    }
}

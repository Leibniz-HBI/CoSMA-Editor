import {
    ColumnDefinitionContribution,
    newColumnDefinitionContribution,
    newValuePreview
} from './state'
import { errorMessageFromApi, exceptionMessage } from '../../util/exception'
import { ThunkWithFetch } from '../../util/type'
import {
    finalizeColumnAssignmentError,
    finalizeColumnAssignmentStart,
    finalizeColumnAssignmentSuccess,
    loadColumnDefinitionsContributionError,
    loadColumnDefinitionsContributionStart,
    loadColumnDefinitionsContributionSuccess,
    loadPreviewError,
    loadPreviewStart,
    loadPreviewSuccess,
    patchColumnDefinitionContributionError,
    patchColumnDefinitionContributionStart,
    patchColumnDefinitionContributionSuccess
} from './slice'
import { columnTypeMapApiToApp } from '../../column_menu/thunks'
import { addError, addSuccessVanish } from '../../util/notification/slice'
import {
    cosmaeContributionApiPostCompleteAssignment,
    cosmaeContributionColumnApiGetColumns,
    cosmaeContributionColumnApiPatchColumn,
    cosmaeContributionPreviewApiGetPreview
} from '../../openapi/cosmae'

export function loadColumnDefinitionsContribution(
    idPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(loadColumnDefinitionsContributionStart())
        try {
            const rsp = await cosmaeContributionColumnApiGetColumns({
                path: { id_contribution_persistent: idPersistent }
            })
            if (rsp.data) {
                const activeDefinitionsList: ColumnDefinitionContribution[] = []
                const discardedDefinitionsList: ColumnDefinitionContribution[] = []
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                rsp.data.column_list.forEach((column: any) => {
                    const columnDefinition = parseColumnContribution(column)
                    if (columnDefinition.discard) {
                        discardedDefinitionsList.push(columnDefinition)
                    } else {
                        activeDefinitionsList.push(columnDefinition)
                    }
                })
                dispatch(
                    loadColumnDefinitionsContributionSuccess({
                        activeDefinitionsList,
                        discardedDefinitionsList
                    })
                )
                return
            }
            dispatch(loadColumnDefinitionsContributionError())
            dispatch(addError(rsp.error.msg))
        } catch (e: unknown) {
            dispatch(loadColumnDefinitionsContributionError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function patchColumnDefinitionContribution({
    idPersistent,
    idContributionPersistent,
    idExistingPersistent = undefined,
    name = undefined,
    discard = undefined
}: {
    idPersistent: string
    idContributionPersistent: string
    idExistingPersistent?: string
    name?: string
    discard?: boolean
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(patchColumnDefinitionContributionStart())
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let body: any
            // discard is handled from a different component.
            if (discard !== undefined) {
                body = { discard: discard }
            } else if (idExistingPersistent !== undefined) {
                body = {
                    id_existing_persistent: idExistingPersistent
                }
            }
            if (name !== undefined) {
                body.name = name
            }
            const rsp = await cosmaeContributionColumnApiPatchColumn({
                path: {
                    id_contribution_persistent: idContributionPersistent,
                    id_persistent: idPersistent
                },
                body: body
            })
            if (rsp.data) {
                const changedColumnDefinition = parseColumnContribution(rsp.data)

                dispatch(
                    patchColumnDefinitionContributionSuccess(changedColumnDefinition)
                )
            } else {
                dispatch(patchColumnDefinitionContributionError())
                dispatch(addError(rsp.error.msg))
            }
        } catch (e: unknown) {
            dispatch(patchColumnDefinitionContributionError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function finalizeColumnAssignment(
    idCandidatePersistent: string
): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(finalizeColumnAssignmentStart())
        try {
            const rsp = await cosmaeContributionApiPostCompleteAssignment({
                path: { id_persistent: idCandidatePersistent }
            })
            if (rsp.response.status == 200) {
                dispatch(finalizeColumnAssignmentSuccess())
                dispatch(addSuccessVanish('Columns successfully assigned.'))
                return true
            } else {
                dispatch(finalizeColumnAssignmentError())
                if (rsp.error !== undefined) {
                    dispatch(addError(rsp.error.msg))
                }
            }
        } catch (e: unknown) {
            dispatch(finalizeColumnAssignmentError())
            dispatch(addError(exceptionMessage(e)))
        }
        return false
    }
}

export function loadPreview(
    idContributionCandidatePersistent: string,
    idColumnPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(loadPreviewStart())
        try {
            const rsp = await cosmaeContributionPreviewApiGetPreview({
                path: {
                    id_column_persistent: idColumnPersistent,
                    id_contribution_persistent: idContributionCandidatePersistent
                }
            })
            if (rsp.data) {
                dispatch(loadPreviewSuccess(parsePreviewFromApi(rsp.data)))
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
                dispatch(loadPreviewError())
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(loadPreviewError())
        }
    }
}

function parsePreviewFromApi(
    previewJson: any //eslint-disable-line @typescript-eslint/no-explicit-any
) {
    return newValuePreview(
        previewJson['contribution_values'] ?? [],
        previewJson['destination_values'] ?? []
    )
}

export function parseColumnContribution(
    column: any //eslint-disable-line @typescript-eslint/no-explicit-any
): ColumnDefinitionContribution {
    const name = column['name']
    const idPersistent = column['id_persistent']
    const idExistingPersistent = column['id_existing_persistent'] ?? undefined
    const idParentPersistent = column['id_parent_persistent']
    const type = columnTypeMapApiToApp.get(column['type'])
    const indexInFile = column['index_in_file']
    const discard = column['discard']
    return newColumnDefinitionContribution({
        name: name,
        idPersistent: idPersistent,
        idExistingPersistent: idExistingPersistent,
        idParentPersistent: idParentPersistent,
        type: type,
        indexInFile: indexInFile,
        discard: discard
    })
}

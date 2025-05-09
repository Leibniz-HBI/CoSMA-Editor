import { config } from '../../config'
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

export function loadColumnDefinitionsContribution(
    idPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(loadColumnDefinitionsContributionStart())
        try {
            const rsp = await fetch(
                config.api_path + `/contributions/${idPersistent}/columns`,
                { credentials: 'include' }
            )
            if (rsp.status == 200) {
                const activeDefinitionsList: ColumnDefinitionContribution[] = []
                const discardedDefinitionsList: ColumnDefinitionContribution[] = []
                const json = await rsp.json()
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                json['column_list'].forEach((column: any) => {
                    const columnDefinition =
                        parseColumnContribution(column)
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
            const json = await rsp.json()
            dispatch(loadColumnDefinitionsContributionError())
            dispatch(addError(json['msg']))
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
    return async (dispatch, _getState, fetch) => {
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
            const rsp = await fetch(
                config.api_path +
                    `/contributions/${idContributionPersistent}/columns/${idPersistent}`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    body: JSON.stringify(body)
                }
            )
            if (rsp.status == 200) {
                const json = await rsp.json()
                const changedColumnDefinition = parseColumnContribution(json)

                dispatch(
                    patchColumnDefinitionContributionSuccess(changedColumnDefinition)
                )
            } else {
                const json = await rsp.json()
                dispatch(patchColumnDefinitionContributionError())
                dispatch(addError(json['msg']))
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
    return async (dispatch, _getState, fetch) => {
        dispatch(finalizeColumnAssignmentStart())
        try {
            const rsp = await fetch(
                config.api_path +
                    `/contributions/${idCandidatePersistent}/column_assignment_complete`,
                { credentials: 'include', method: 'POST' }
            )
            if (rsp.status == 200) {
                dispatch(finalizeColumnAssignmentSuccess())
                dispatch(addSuccessVanish('Columns successfully assigned.'))
                return true
            } else {
                const json = await rsp.json()
                dispatch(finalizeColumnAssignmentError())
                dispatch(addError(json['msg']))
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
    return async (dispatch, getState, fetch) => {
        dispatch(loadPreviewStart())
        try {
            const rsp = await fetch(
                config.api_path +
                    `/contributions/${idContributionCandidatePersistent}/preview/${idColumnPersistent}`,
                { credentials: 'include' }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                dispatch(loadPreviewSuccess(parsePreviewFromApi(json)))
            } else {
                dispatch(addError(errorMessageFromApi(json)))
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
    const idExistingPersistent = column['id_existing_persistent']
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

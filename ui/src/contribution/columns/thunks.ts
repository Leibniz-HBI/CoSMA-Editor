import { config } from '../../config'
import { ColumnDefinitionContribution, newColumnDefinitionContribution } from './state'
import { exceptionMessage } from '../../util/exception'
import { ThunkWithFetch } from '../../util/type'
import {
    finalizeColumnAssignmentError,
    finalizeColumnAssignmentStart,
    finalizeColumnAssignmentSuccess,
    loadColumnDefinitionsContributionError,
    loadColumnDefinitionsContributionStart,
    loadColumnDefinitionsContributionSuccess,
    patchColumnDefinitionContributionError,
    patchColumnDefinitionContributionStart,
    patchColumnDefinitionContributionSuccess
} from './slice'
import { columnTypeMapApiToApp } from '../../column_menu/thunks'
import { addError } from '../../util/notification/slice'

export function loadColumnDefinitionsContribution(
    idPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(loadColumnDefinitionsContributionStart())
        try {
            const rsp = await fetch(
                config.api_path + `/contributions/${idPersistent}/tags`,
                { credentials: 'include' }
            )
            if (rsp.status == 200) {
                const activeDefinitionsList: ColumnDefinitionContribution[] = []
                const discardedDefinitionsList: ColumnDefinitionContribution[] = []
                const json = await rsp.json()
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                json['tag_definitions'].forEach((tagDefinition: any) => {
                    const columnDefinition =
                        parseTagDefinitionContribution(tagDefinition)
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
                    `/contributions/${idContributionPersistent}/tags/${idPersistent}`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    body: JSON.stringify(body)
                }
            )
            if (rsp.status == 200) {
                const json = await rsp.json()
                const changedColumnDefinition = parseTagDefinitionContribution(json)

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
): ThunkWithFetch<void> {
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
            } else {
                const json = await rsp.json()
                dispatch(finalizeColumnAssignmentError())
                dispatch(addError(json['msg']))
            }
        } catch (e: unknown) {
            dispatch(finalizeColumnAssignmentError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function parseTagDefinitionContribution(
    tagDefinition: any //eslint-disable-line @typescript-eslint/no-explicit-any
): ColumnDefinitionContribution {
    const name = tagDefinition['name']
    const idPersistent = tagDefinition['id_persistent']
    const idExistingPersistent = tagDefinition['id_existing_persistent']
    const idParentPersistent = tagDefinition['id_parent_persistent']
    const type = columnTypeMapApiToApp.get(tagDefinition['type'])
    const indexInFile = tagDefinition['index_in_file']
    const discard = tagDefinition['discard']
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

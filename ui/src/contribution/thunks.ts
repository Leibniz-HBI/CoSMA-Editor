import { parseColumnsFromApi } from '../column_menu/thunks'
import { addError, addSuccessVanish } from '../util/notification/slice'
import { exceptionMessage } from '../util/exception'
import { ThunkWithFetch } from '../util/type'
import {
    getContributionListEnd,
    getContributionListStart,
    getContributionStart,
    getContributionSuccess,
    patchSelectedContributionEnd,
    patchSelectedContributionStart,
    uploadContributionEnd,
    uploadContributionStart
} from './slice'
import { Contribution, ContributionStep, newContribution } from './state'
import {
    ContributionCandidatePatchRequest,
    cosmaeContributionApiContributionChunkGet,
    cosmaeContributionApiContributionGet,
    cosmaeContributionApiContributionPatch,
    cosmaeContributionApiContributionPost
} from '../openapi/cosmae'

export function getContributionList(): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getContributionListStart())
        try {
            const contributions: Contribution[] = []
            for (let i = 0; ; i += 5000) {
                const rsp = await cosmaeContributionApiContributionChunkGet({
                    path: { start: i, offset: 5000 }
                })

                if (rsp.error) {
                    dispatch(getContributionListEnd())
                    dispatch(
                        addError(
                            `Could not load contributions. Reason: "${rsp.error.msg}".`
                        )
                    )
                    return
                }
                const contributionsApi = rsp.data.contributions
                if (contributionsApi.length < 1) {
                    break
                }
                for (const contribution_json of contributionsApi) {
                    contributions.push(parseContributionFromApi(contribution_json))
                }
            }
            dispatch(getContributionListEnd(contributions))
        } catch (e: unknown) {
            dispatch(getContributionListEnd())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function loadContributionDetails(
    idContributionPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getContributionStart())
        try {
            const rsp = await cosmaeContributionApiContributionGet({
                path: { id_persistent: idContributionPersistent }
            })
            if (rsp.error) {
                dispatch(
                    addError(
                        `Could not load contribution details. Reason: "${rsp.error.msg}".`
                    )
                )
                return
            }
            const data = rsp.data
            const contribution = parseContributionFromApi(data)
            const errorMsg = data.error_msg
            if (errorMsg) {
                const errorDetails = data.error_details
                if (errorDetails) {
                    dispatch(addError(errorMsg + '\n' + errorDetails))
                } else {
                    dispatch(addError(errorMsg))
                }
            }
            dispatch(getContributionSuccess(contribution))
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
export function uploadContribution({
    name,
    description,
    hasHeader,
    emptyValues,
    idEditSessionPersistent,
    file
}: {
    name: string
    description: string
    hasHeader: boolean
    emptyValues: string
    idEditSessionPersistent: string
    file: File
}): ThunkWithFetch<string | undefined> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(uploadContributionStart())
        let idPersistent = undefined
        try {
            const rsp = await cosmaeContributionApiContributionPost({
                body: {
                    file: file,
                    name: name,
                    description: description,
                    empty_values: emptyValues,
                    has_header: hasHeader,
                    id_edit_session_persistent: idEditSessionPersistent
                }
            })
            if (rsp.data) {
                idPersistent = rsp.data.id_persistent
                dispatch(addSuccessVanish('Successfully added contribution.'))
            } else {
                dispatch(
                    addError(
                        `Could not upload contribution. Reason: "${rsp.error.msg}".`
                    )
                )
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        } finally {
            dispatch(uploadContributionEnd())
        }
        return idPersistent
    }
}

export function patchContributionDetails({
    idPersistent,
    name,
    description,
    hasHeader,
    emptyValues
}: {
    idPersistent: string
    name?: string
    description?: string
    emptyValues?: string

    hasHeader?: boolean
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch): Promise<void> => {
        dispatch(patchSelectedContributionStart())
        try {
            const body: { [key: string]: string | boolean } = {}
            if (name !== undefined) {
                body['name'] = name
            }
            if (description !== undefined) {
                body['description'] = description
            }
            if (hasHeader !== undefined) {
                body['has_header'] = hasHeader
            }
            if (emptyValues !== undefined) {
                body['empty_values'] = emptyValues
            }
            const rsp = await cosmaeContributionApiContributionPatch({
                body: body as ContributionCandidatePatchRequest,
                path: { id_persistent: idPersistent }
            })
            if (rsp.data) {
                dispatch(
                    patchSelectedContributionEnd(parseContributionFromApi(rsp.data))
                )
                return
            }
            dispatch(patchSelectedContributionEnd(undefined))
            dispatch(
                addError(`Could not update contribution. Reason: "${rsp.error.msg}".`)
            )
        } catch (e: unknown) {
            dispatch(patchSelectedContributionEnd(undefined))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseContributionFromApi(contribution_json: any): Contribution {
    return newContribution({
        name: contribution_json['name'],
        idPersistent: contribution_json['id_persistent'],
        description: contribution_json['description'],
        author: contribution_json['author'],
        step: contributionStepApiToUiMap[contribution_json['state']],
        hasHeader: contribution_json['has_header'],
        emptyValues: contribution_json['empty_values'],
        matchColumnList: contribution_json['match_column_list']?.map(
            (columnJson: unknown) => parseColumnsFromApi(columnJson)
        ),
        justification: contribution_json['justification_txt'] ?? undefined
    })
}

export const contributionStepApiToUiMap: { [key: string]: ContributionStep } = {
    UPLOADED: ContributionStep.Uploaded,
    COLUMNS_EXTRACTED: ContributionStep.ColumnsExtracted,
    COLUMNS_ASSIGNED: ContributionStep.ColumnsAssigned,
    VALUES_EXTRACTED: ContributionStep.ValuesExtracted,
    ENTITIES_MATCHED: ContributionStep.EntitiesMatched,
    ENTITIES_ASSIGNED: ContributionStep.EntitiesAssigned,
    VALUES_ASSIGNED: ContributionStep.ValuesAssigned,
    MERGED: ContributionStep.Merged
}

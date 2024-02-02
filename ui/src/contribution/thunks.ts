import { parseColumnDefinitionsFromApi } from '../column_menu/thunks'
import { config } from '../config'
import { addError, addSuccessVanish } from '../util/notification/slice'
import { exceptionMessage } from '../util/exception'
import { ThunkWithFetch } from '../util/type'
import {
    getContributionStart,
    getContributionSuccess,
    uploadContributionEnd,
    uploadContributionStart
} from './slice'
import { Contribution, ContributionStep, newContribution } from './state'

export function loadContributionDetails(
    idContributionPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getContributionStart())
        try {
            const rsp = await fetch(
                config.api_path + '/contributions/' + idContributionPersistent,
                {
                    credentials: 'include'
                }
            )
            const json = await rsp.json()
            if (rsp.status != 200) {
                dispatch(
                    addError(
                        `Could not load contribution details. Reason: "${json['msg']}".`
                    )
                )
                return
            }
            const contribution = parseContributionFromApi(json)
            const errorMsg = json['error_msg']
            if (errorMsg) {
                const errorDetails = json['error_details']
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
    file
}: {
    name: string
    description: string
    hasHeader: boolean
    file: File
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(uploadContributionStart())
        try {
            const form = new FormData()
            form.append('file', file)
            form.append('name', name)
            form.append('description', description)
            form.append('has_header', hasHeader.toString())
            const rsp = await fetch(config.api_path + '/contributions', {
                method: 'POST',
                credentials: 'include',
                body: form
            })
            if (rsp.status == 200) {
                dispatch(addSuccessVanish('Successfully added contribution.'))
            } else {
                const json = await rsp.json()
                dispatch(
                    addError(`Could not upload contribution. Reason: "${json['msg']}".`)
                )
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        } finally {
            dispatch(uploadContributionEnd())
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
        matchTagDefinitionList: contribution_json['match_tag_definition_list']?.map(
            (tagDefJson: unknown) => parseColumnDefinitionsFromApi(tagDefJson)
        )
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

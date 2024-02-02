import { Dispatch } from 'react'
import { AsyncAction } from '../util/async_action'
import {
    ContributionAction,
    LoadContributionsErrorAction,
    LoadContributionsStartAction,
    LoadContributionsSuccessAction
} from './actions'
import { exceptionMessage } from '../util/exception'
import { config } from '../config'
import { Contribution, ContributionStep, newContribution } from './state'
import { fetch_chunk_get } from '../util/fetch'
import { parseColumnDefinitionsFromApi } from '../column_menu/thunks'
import { AppDispatch } from '../store'
import { addError } from '../util/notification/slice'

export class LoadContributionsAction extends AsyncAction<ContributionAction, void> {
    async run(
        dispatch: Dispatch<ContributionAction>,
        reduxDispatch: AppDispatch
    ): Promise<void> {
        dispatch(new LoadContributionsStartAction())
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contributions: Contribution[] = []
            for (let i = 0; ; i += 5000) {
                const rsp = await fetch_chunk_get({
                    api_path: config.api_path + '/contributions/chunk',
                    offset: i,
                    limit: 5000
                })
                if (rsp.status !== 200) {
                    dispatch(new LoadContributionsErrorAction())
                    reduxDispatch(
                        addError(
                            `Could not load contributions. Reason: "${
                                (await rsp.json())['msg']
                            }".`
                        )
                    )
                    return
                }
                const json = await rsp.json()
                const contributions_json = json['contributions']
                if (contributions_json.length < 1) {
                    break
                }
                for (const contribution_json of contributions_json) {
                    contributions.push(parseContributionFromApi(contribution_json))
                }
            }
            dispatch(new LoadContributionsSuccessAction(contributions))
        } catch (e: unknown) {
            dispatch(new LoadContributionsErrorAction())
            reduxDispatch(addError(exceptionMessage(e)))
        }
    }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseContributionFromApi(contribution_json: any): Contribution {
    const matchTagDefinitionListJson = contribution_json['match_tag_definition_list']
    let matchTagDefinitionList = []
    if (
        !(
            matchTagDefinitionListJson === undefined ||
            matchTagDefinitionListJson === null
        )
    ) {
        matchTagDefinitionList = matchTagDefinitionListJson.map((tagDefJson: unknown) =>
            parseColumnDefinitionsFromApi(tagDefJson)
        )
    }
    return newContribution({
        name: contribution_json['name'],
        idPersistent: contribution_json['id_persistent'],
        description: contribution_json['description'],
        author: contribution_json['author'],
        step: contributionStepApiToUiMap[contribution_json['state']],
        hasHeader: contribution_json['has_header'],
        matchTagDefinitionList
    })
}

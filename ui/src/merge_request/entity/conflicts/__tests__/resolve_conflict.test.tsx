/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import { EntityMergeRequestConflictListItem } from '../components'
import { newEntityMergeRequestConflict } from '../state'
import { newRemote } from '../../../../util/state'
import { EntityMergeRequestStep, newEntityMergeRequest } from '../../state'
import { newEntity } from '../../../../entity/state'
import { newPublicUserInfo, UserPermissionGroup } from '../../../../user/state'
import { act } from 'react'
import userEvent from '@testing-library/user-event'

const mergeRequest = newEntityMergeRequest({
    idPersistent: 'merge_request_1',
    entityOrigin: newEntity({
        idPersistent: 'id_entity_origin',
        displayTxt: 'Entity Origin',
        disabled: false,
        version: 0
    }),
    entityDestination: newEntity({
        idPersistent: 'id_entity_destination',
        displayTxt: 'Entity Destination',
        disabled: false,
        version: 1
    }),
    createdBy: newPublicUserInfo({
        idPersistent: 'id_user',
        username: 'User',
        permissionGroup: 'EDITOR' as UserPermissionGroup
    }),
    state: 'OPEN' as EntityMergeRequestStep
})
const conflict = newRemote(
    newEntityMergeRequestConflict({
        column: {
            idPersistent: 'column1',
            namePath: ['Column 1'],
            curated: false,
            idParentPersistent: undefined,
            version: 2
        },
        valueOrigin: {
            value: 'new value',
            idPersistent: 'id_value_origin',
            version: 0
        },
        valueDestination: {
            value: 'existing value',
            idPersistent: 'id_value_destination',
            version: 1
        }
    })
)

describe('EntityMergeRequestConflictListItem', () => {
    const expectedCallbackArgs = {
        ...conflict.value,
        entityOrigin: mergeRequest.entityOrigin,
        entityDestination: mergeRequest.entityDestination
    }
    test('keep existing', async () => {
        const callback = vi.fn()
        render(
            <EntityMergeRequestConflictListItem
                conflict={conflict}
                resolveConflictCallback={callback}
                mergeRequest={mergeRequest}
            />
        )
        screen.getByRole('button', { name: 'Keep Existing Value' }).click()
        await waitFor(() => {
            expect(callback).toHaveBeenCalledWith({
                ...expectedCallbackArgs,
                replacementState: 'KEEP',
                replacementValue: undefined
            })
        })
    })
    test('use new', async () => {
        const callback = vi.fn()
        render(
            <EntityMergeRequestConflictListItem
                conflict={conflict}
                resolveConflictCallback={callback}
                mergeRequest={mergeRequest}
            />
        )
        screen.getByRole('button', { name: 'Use new Value' }).click()
        await waitFor(() => {
            expect(callback).toHaveBeenCalledWith({
                ...expectedCallbackArgs,
                replacementState: 'REPLACE',
                replacementValue: undefined
            })
        })
    })
    test('replacement value', async () => {
        const callback = vi.fn()
        render(
            <EntityMergeRequestConflictListItem
                conflict={conflict}
                resolveConflictCallback={callback}
                mergeRequest={mergeRequest}
            />
        )
        const input = screen.getByRole('textbox', { name: 'Replacement Value' })
        const user = userEvent.setup()
        const replacementValue = 'replacement value'
        await act(async () => {
            await user.type(input, replacementValue)
        })
        screen.getByRole('button', { name: 'Use Replacement Value' }).click()
        await waitFor(() => {
            expect(callback).toHaveBeenCalledWith({
                ...expectedCallbackArgs,
                replacementState: 'VALUE',
                replacementValue
            })
        })
    })
})

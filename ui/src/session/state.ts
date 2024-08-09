import { RemoteInterface, newRemote } from '../util/state'

export enum EditSessionParticipantType {
    internal = 'internal',
    orcid = 'orcid'
}

export interface EditSessionParticipant {
    id: string
    type: EditSessionParticipantType
    name: string | undefined
}
export interface EditSession {
    idPersistent: string
    name: string
    owner: EditSessionParticipant
    participantList: EditSessionParticipant[]
    participantMap: { [key: string]: number }
}

export interface EditSessionState {
    showEditSessionList: boolean
    currentEditSession: RemoteInterface<EditSession | undefined>
    editSessionOwnerList: RemoteInterface<EditSession[]>
    editSessionOwnerMap: { [key: string]: number }
    editSessionParticipantList: RemoteInterface<EditSession[]>
    editSessionParticipantMap: { [key: string]: number }
    participantSearchResults: RemoteInterface<EditSessionParticipant[] | undefined>
    addEditSessionParticipant: RemoteInterface<string | undefined>
    removeEditSessionParticipant: RemoteInterface<EditSessionParticipant | undefined>
}

export function newEditSessionState({
    showEditSessionList = false,
    currentEditSession = newRemote(undefined),
    editSessionOwnerList = newRemote([]),
    editSessionOwnerMap = {},
    editSessionParticipantList = newRemote([]),
    editSessionParticipantMap = {},
    participantSearchResults = newRemote(undefined),
    addEditSessionParticipant = newRemote(undefined),
    removeEditSessionParticipant = newRemote(undefined)
}: {
    showEditSessionList?: boolean
    currentEditSession?: RemoteInterface<EditSession | undefined>
    editSessionOwnerList?: RemoteInterface<EditSession[]>
    editSessionOwnerMap?: { [key: string]: number }
    editSessionParticipantList?: RemoteInterface<EditSession[]>
    editSessionParticipantMap?: { [key: string]: number }
    participantSearchResults?: RemoteInterface<EditSessionParticipant[] | undefined>
    addEditSessionParticipant?: RemoteInterface<string | undefined>
    removeEditSessionParticipant?: RemoteInterface<EditSessionParticipant | undefined>
}): EditSessionState {
    return {
        showEditSessionList,
        currentEditSession,
        editSessionOwnerList,
        editSessionOwnerMap,
        editSessionParticipantList,
        editSessionParticipantMap,
        participantSearchResults,
        addEditSessionParticipant,
        removeEditSessionParticipant
    }
}

export function newEditSession({
    idPersistent,
    name,
    owner,
    participantList,
    participantMap
}: {
    idPersistent: string
    name: string
    owner: EditSessionParticipant
    participantList: EditSessionParticipant[]
    participantMap: { [key: string]: number }
}): EditSession {
    return { idPersistent, name, owner, participantList, participantMap }
}

export function newEditSessionParticipant({
    id,
    type = EditSessionParticipantType.internal,
    name = undefined
}: {
    id: string
    type?: EditSessionParticipantType
    name?: string | undefined
}): EditSessionParticipant {
    return {
        id,
        type,
        name
    }
}

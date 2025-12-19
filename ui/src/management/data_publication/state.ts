import { newRemote, RemoteInterface } from '../../util/state'

export enum DataPublicationStep {
    Created = 'Created',
    DisplayText = 'DisplayText',
    Curated = 'Curated',
    User = 'User',
    Authors = 'Authors',
    Completed = 'Completed'
}

export interface DataPublicationMetadata {
    startDateString: string | undefined
    endDateString: string
    name: string
    idPersistent: string
    step: DataPublicationStep
    errorMessage?: string
    errorDetails?: string
    isWorking: boolean
}

export function newDataPublicationMetadata({
    startDateString,
    endDateString,
    name,
    idPersistent,
    errorMessage,
    errorDetails,
    isWorking,
    step
}: {
    startDateString: string | undefined
    endDateString: string
    name: string
    idPersistent: string
    step: DataPublicationStep
    errorMessage?: string | undefined
    errorDetails?: string | undefined
    isWorking: boolean
}): DataPublicationMetadata {
    return {
        startDateString,
        endDateString,
        name,
        idPersistent,
        errorMessage,
        errorDetails,
        isWorking,
        step
    }
}

export interface DataPublicationState {
    metaDataList: RemoteInterface<DataPublicationMetadata[] | undefined>
    submit: RemoteInterface<boolean | undefined>
}

export function newDataPublicationState({
    metaDataList = newRemote(undefined),
    submit = newRemote(undefined)
}: {
    metaDataList?: RemoteInterface<DataPublicationMetadata[] | undefined>
    submit?: RemoteInterface<boolean | undefined>
}): DataPublicationState {
    return { metaDataList, submit }
}

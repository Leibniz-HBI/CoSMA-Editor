import { loadColumnDefinitionsContributionStart } from '../../contribution/columns/slice'
import {
    cosmaeManagementDataPublicationApiGetDataPublicationMetadata,
    cosmaeManagementDataPublicationApiPutDataPublicationMetadata,
    DataPublicationMetadata as DataPublicationMetadataApi
} from '../../openapi/cosmae'
import { errorMessageFromApi, exceptionMessage } from '../../util/exception'
import { addError } from '../../util/notification/slice'
import { ThunkWithFetch } from '../../util/type'
import {
    loadDataPublicationMetadataEnd,
    loadDataPublicationMetadataListSuccess,
    submitDataPublicationEnd,
    submitDataPublicationStart,
    submitDataPublicationSuccess
} from './slice'
import { DataPublicationMetadata, newDataPublicationMetadata } from './state'

export function loadDataPublicationMetadataListThunk(): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(loadColumnDefinitionsContributionStart())
        try {
            const response =
                await cosmaeManagementDataPublicationApiGetDataPublicationMetadata()
            if (response.data) {
                const metadataList: DataPublicationMetadata[] =
                    response.data.metadata_list.map(dataPublicationMetadataApiToApp)
                dispatch(loadDataPublicationMetadataListSuccess(metadataList))
                return
            } else {
                dispatch(addError(errorMessageFromApi(response.error)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
        dispatch(loadDataPublicationMetadataEnd())
    }
}
export function submitDataPublicationThunk({
    name,
    startDate,
    endDate
}: {
    name: string
    startDate: Date | undefined
    endDate: Date
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(submitDataPublicationStart())
        if (startDate !== undefined) {
            startDate.setHours(0, 0, 0, 0)
        }
        endDate.setHours(23, 59, 59, 999)
        try {
            const response =
                await cosmaeManagementDataPublicationApiPutDataPublicationMetadata({
                    body: {
                        name,
                        start_time: startDate?.toISOString(),
                        end_time: endDate?.toISOString()
                    }
                })
            if (response.data) {
                dispatch(
                    submitDataPublicationSuccess(
                        dataPublicationMetadataApiToApp(response.data)
                    )
                )
            } else {
                dispatch(addError(errorMessageFromApi(response.error)))
                dispatch(submitDataPublicationEnd(false))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(submitDataPublicationEnd(false))
        }
    }
}

export function dataPublicationMetadataApiToApp(
    metadata: DataPublicationMetadataApi
): DataPublicationMetadata {
    return newDataPublicationMetadata({
        startDateString: metadata.start_time,
        endDateString: metadata.end_time,
        name: metadata.name,
        idPersistent: metadata.id_persistent,
        step: metadata.step as unknown as DataPublicationMetadata['step'],
        errorMessage: metadata.error ?? undefined,
        errorDetails: metadata.error_details ?? undefined,
        isWorking: metadata.is_working
    })
}

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    DataPublicationMetadata,
    DataPublicationState,
    newDataPublicationState
} from './state'
import { newRemote } from '../../util/state'

const dataPublicationSlice = createSlice({
    name: 'dataPublication',
    initialState: newDataPublicationState({}),
    reducers: {
        clearPublicationMetadataList(state: DataPublicationState) {
            state.metaDataList = newRemote(undefined)
        },
        loadDataPublicationMetadataEnd(state: DataPublicationState) {
            state.metaDataList = newRemote([])
        },
        loadDataPublicationMetadataList(state: DataPublicationState) {
            state.metaDataList.isLoading = true
        },
        loadDataPublicationMetadataListSuccess(
            state: DataPublicationState,
            action: PayloadAction<DataPublicationMetadata[]>
        ) {
            state.metaDataList = newRemote(action.payload)
        },
        submitDataPublicationEnd(
            state: DataPublicationState,
            action: PayloadAction<boolean | undefined>
        ) {
            state.submit = newRemote(action.payload)
        },
        submitDataPublicationStart(state: DataPublicationState) {
            state.submit.isLoading = true
        },
        submitDataPublicationSuccess(
            state: DataPublicationState,
            action: PayloadAction<DataPublicationMetadata>
        ) {
            state.submit = newRemote(true)
            state.metaDataList.value = [
                action.payload,
                ...(state.metaDataList.value || [])
            ]
        }
    }
})

export const dataPublicationReducer = dataPublicationSlice.reducer

export const {
    clearPublicationMetadataList,
    loadDataPublicationMetadataEnd,
    loadDataPublicationMetadataList,
    loadDataPublicationMetadataListSuccess,
    submitDataPublicationEnd,
    submitDataPublicationStart,
    submitDataPublicationSuccess
} = dataPublicationSlice.actions

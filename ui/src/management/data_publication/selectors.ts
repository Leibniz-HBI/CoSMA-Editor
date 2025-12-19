import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../store";

export function selectDataPublicationState(state: RootState) {
    return state.dataPublication;
}


export const selectDataPublicationMetadataList = createSelector(
    selectDataPublicationState,
    (dataPublicationState) => dataPublicationState.metaDataList
);

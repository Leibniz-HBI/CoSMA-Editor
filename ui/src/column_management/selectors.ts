import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { ColumnManagementState } from './state'

export const selectColumnManagement = (state: RootState) => state.columnManagement

export const selectColumnOwnershipRequests = createSelector(
    selectColumnManagement,
    (state: ColumnManagementState) => state.ownershipRequests
)

export const selectPutColumnOwnership = createSelector(
    selectColumnManagement,
    (state) => state.putOwnershipRequest
)

import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { TagManagementState } from './state'

export const selectTagManagement = (state: RootState) => state.tagManagement

export const selectTagOwnershipRequests = createSelector(
    selectTagManagement,
    (state: TagManagementState) => state.ownershipRequests
)

export const selectPutTagOwnership = createSelector(
    selectTagManagement,
    (state) => state.putOwnershipRequest
)

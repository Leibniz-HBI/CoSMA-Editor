import { ReactElement, useLayoutEffect } from 'react'
import { ColumnHierarchyContext, useRemoteColumnMenuData } from '../hooks'

export function ColumnMenuProvider({ children }: { children: ReactElement }) {
    const remoteColumnMenuData = useRemoteColumnMenuData()
    useLayoutEffect(
        () => {
            remoteColumnMenuData.getHierarchyCallback()
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )
    return (
        <ColumnHierarchyContext.Provider value={remoteColumnMenuData}>
            {children}
        </ColumnHierarchyContext.Provider>
    )
}

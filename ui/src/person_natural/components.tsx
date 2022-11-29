import { CosmaeConf } from '../config'
import { RemoteDataTable } from '../table/components'
//eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export function PersonTable(props: any) {
    const columns = [
        { id: 'names_personal', title: 'Personal Names' },
        { id: 'names_family', title: 'Family Names' },
        { id: 'display_txt', title: 'Display Text' }
    ]
    return (
        <RemoteDataTable
            base_url={CosmaeConf.get().api_base + '/persons'}
            initialColumns={columns}
        />
    )
}

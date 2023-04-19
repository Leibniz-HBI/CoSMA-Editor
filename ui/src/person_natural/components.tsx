import { RemoteDataTable } from '../table/components'
import { all_columns } from '../column_menu/columns'

//eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export function PersonTable(props: any) {
    const column_defs = [
        all_columns['Kategorie'],
        all_columns['Partei'],
        // all_columns['Soziale Medien'],
        // all_columns['SM_Twitter'],
        all_columns['SM_Twitter_id'],
        all_columns['SM_Twitter_user'],
        // all_columns['SM_Twitter_verifiziert'],
        // all_columns['SM_Facebook'],
        all_columns['SM_Facebook_id'],
        all_columns['SM_Facebook_user'],
        all_columns['SM_Facebook_verifiziert']
    ]
    return <RemoteDataTable base_url={props.api_base} column_defs={column_defs} />
}

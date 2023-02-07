import { ColumnType } from '../table/state'
export const all_columns = {
    Kategorie: {
        id_persistent: '1346fabe-e25e-4f4e-a89c-04c231f18299',
        id_parent_persistent: null,
        name: 'Parliament',
        version: 1,
        type: ColumnType.String,
        tag_path: 'Parliament'
    },
    Partei: {
        id_persistent: 'bc1d0ca4-bfc0-413d-8b5a-b7faaf68e606',
        id_parent_persistent: null,
        name: 'Party',
        version: 2,
        type: ColumnType.String,
        tag_path: 'Party'
    },
    SM_Facebook_user: {
        id_persistent: '06848fb3-1584-453c-a64f-bf896bbcb18e',
        id_parent_persistent: '8e56bb47-c2e5-4cbe-b4c3-2b864beaf7fa',
        name: 'user',
        version: 5,
        type: ColumnType.String,
        tag_path: 'Social Media.Facebook.user'
    },
    SM_Facebook_id: {
        id_persistent: 'ce3316ca-5d42-41f2-9ace-d5c4a5b29a76',
        id_parent_persistent: '8e56bb47-c2e5-4cbe-b4c3-2b864beaf7fa',
        name: 'id',
        version: 6,
        type: ColumnType.String,
        tag_path: 'Social Media.Facebook.id'
    },
    SM_Facebook_verifiziert: {
        id_persistent: '958e057e-2b4e-4d69-b297-a9ffaad73994',
        id_parent_persistent: '8e56bb47-c2e5-4cbe-b4c3-2b864beaf7fa',
        name: 'verified',
        version: 7,
        type: ColumnType.Boolean,
        tag_path: 'Social Media.Facebook.verified'
    },
    SM_Twitter_user: {
        id_persistent: '9faf62df-4015-4d95-b2c2-b4f13d22e448',
        id_parent_persistent: '56fafcb7-08ab-4cf2-8eb4-b0e37f91f123',
        name: 'user',
        version: 9,
        type: ColumnType.String,
        tag_path: 'Social Media.Twitter.user'
    },
    SM_Twitter_id: {
        id_persistent: 'ea643d2c-f23e-4dd0-840c-ea22c74cd55d',
        id_parent_persistent: '56fafcb7-08ab-4cf2-8eb4-b0e37f91f123',
        name: 'id',
        version: 10,
        type: ColumnType.String,
        tag_path: 'Social Media.Twitter.id'
    },
    SM_Twitter_verifiziert: {
        id_persistent: '08bac543-eb94-4b99-8654-842a1a0e166f',
        id_parent_persistent: '56fafcb7-08ab-4cf2-8eb4-b0e37f91f123',
        name: 'verified',
        version: 11,
        type: ColumnType.Boolean,
        tag_path: 'Social Media.Twitter.verified'
    },
    SM_Telegram_user: {
        id_persistent: 'a9325d92-6a7b-45c2-bbde-5f872b5607a1',
        id_parent_persistent: '1effddcc-17a0-453c-90cc-2a10d85e1275',
        name: 'user',
        version: 13,
        type: ColumnType.String,
        tag_path: 'Social Media.Telegram.user'
    },
    SM_Telegram_id: {
        id_persistent: '2e3f4d77-1a39-4bc9-bed9-14de1a71ec8e',
        id_parent_persistent: '1effddcc-17a0-453c-90cc-2a10d85e1275',
        name: 'id',
        version: 14,
        type: ColumnType.String,
        tag_path: 'Social Media.Telegram.id'
    },
    SM_Telegram_verifiziert: {
        id_persistent: '4d86457c-3a3b-4c7d-aab9-6fcac8e4e13c',
        id_parent_persistent: '1effddcc-17a0-453c-90cc-2a10d85e1275',
        name: 'verified',
        version: 15,
        type: ColumnType.Boolean,
        tag_path: 'Social Media.Telegram.verified'
    },
    SM_Youtube_user: {
        id_persistent: '51612bad-c1fd-4ab8-a2a0-0788e8afb9d9',
        id_parent_persistent: '07e0bf57-c3a5-4dd8-aa2f-b1e51a4286ad',
        name: 'user',
        version: 17,
        type: ColumnType.String,
        tag_path: 'Social Media.YouTube.user'
    },
    SM_Youtube_id: {
        id_persistent: 'c10dbf8a-33e9-49bb-9e10-4e62bf1d1f35',
        id_parent_persistent: '07e0bf57-c3a5-4dd8-aa2f-b1e51a4286ad',
        name: 'id',
        version: 18,
        type: ColumnType.String,
        tag_path: 'Social Media.YouTube.id'
    },
    SM_Youtube_verifiziert: {
        id_persistent: '4c17f7e5-b73b-4072-8357-06c8d4a15050',
        id_parent_persistent: '07e0bf57-c3a5-4dd8-aa2f-b1e51a4286ad',
        name: 'verified',
        version: 19,
        type: ColumnType.Boolean,
        tag_path: 'Social Media.YouTube.verified'
    },
    SM_Instagram_user: {
        id_persistent: '23a2511a-e5e1-4ef8-aa94-c8e11b65cbcd',
        id_parent_persistent: '30cbca0e-a80b-4e5c-8d6b-cfaed9636740',
        name: 'user',
        version: 21,
        type: ColumnType.String,
        tag_path: 'Social Media.Instagram.user'
    },
    SM_Instagram_id: {
        id_persistent: '52cdcd4d-3428-453d-abba-43948f13de8c',
        id_parent_persistent: '30cbca0e-a80b-4e5c-8d6b-cfaed9636740',
        name: 'id',
        version: 22,
        type: ColumnType.String,
        tag_path: 'Social Media.Instagram.id'
    },
    SM_Instagram_verifiziert: {
        id_persistent: 'aacca549-5651-4a41-951a-1f7f853717d5',
        id_parent_persistent: '30cbca0e-a80b-4e5c-8d6b-cfaed9636740',
        name: 'verified',
        version: 23,
        type: ColumnType.Boolean,
        tag_path: 'Social Media.Instagram.verified'
    }
}

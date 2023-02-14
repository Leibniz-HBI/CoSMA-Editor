import { ColumnDefinition, ColumnType } from './state'
export const all_columns = {
    Kategorie: new ColumnDefinition({
        idPersistent: '1346fabe-e25e-4f4e-a89c-04c231f18299',
        version: 1,
        columnType: ColumnType.String,
        namePath: ['Parliament']
    }),
    Partei: new ColumnDefinition({
        idPersistent: 'bc1d0ca4-bfc0-413d-8b5a-b7faaf68e606',
        version: 2,
        columnType: ColumnType.String,
        namePath: ['Party']
    }),
    SM_Facebook_user: new ColumnDefinition({
        idPersistent: '06848fb3-1584-453c-a64f-bf896bbcb18e',
        idParentPersistent: '8e56bb47-c2e5-4cbe-b4c3-2b864beaf7fa',
        version: 5,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Facebook', 'user']
    }),
    SM_Facebook_id: new ColumnDefinition({
        idPersistent: 'ce3316ca-5d42-41f2-9ace-d5c4a5b29a76',
        idParentPersistent: '8e56bb47-c2e5-4cbe-b4c3-2b864beaf7fa',
        version: 6,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Facebook', 'id']
    }),
    SM_Facebook_verifiziert: new ColumnDefinition({
        idPersistent: '958e057e-2b4e-4d69-b297-a9ffaad73994',
        idParentPersistent: '8e56bb47-c2e5-4cbe-b4c3-2b864beaf7fa',
        version: 7,
        columnType: ColumnType.Boolean,
        namePath: ['Social Media', 'Facebook', 'verified']
    }),
    SM_Twitter_user: new ColumnDefinition({
        idPersistent: '9faf62df-4015-4d95-b2c2-b4f13d22e448',
        idParentPersistent: '56fafcb7-08ab-4cf2-8eb4-b0e37f91f123',
        version: 9,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Twitter', 'user']
    }),
    SM_Twitter_id: new ColumnDefinition({
        idPersistent: 'ea643d2c-f23e-4dd0-840c-ea22c74cd55d',
        idParentPersistent: '56fafcb7-08ab-4cf2-8eb4-b0e37f91f123',
        version: 10,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Twitter', 'id']
    }),
    SM_Twitter_verifiziert: new ColumnDefinition({
        idPersistent: '08bac543-eb94-4b99-8654-842a1a0e166f',
        idParentPersistent: '56fafcb7-08ab-4cf2-8eb4-b0e37f91f123',
        version: 11,
        columnType: ColumnType.Boolean,
        namePath: ['Social Media', 'Twitter', 'verified']
    }),
    SM_Telegram_user: new ColumnDefinition({
        idPersistent: 'a9325d92-6a7b-45c2-bbde-5f872b5607a1',
        idParentPersistent: '1effddcc-17a0-453c-90cc-2a10d85e1275',
        version: 13,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Telegram', 'user']
    }),
    SM_Telegram_id: new ColumnDefinition({
        idPersistent: '2e3f4d77-1a39-4bc9-bed9-14de1a71ec8e',
        idParentPersistent: '1effddcc-17a0-453c-90cc-2a10d85e1275',
        version: 14,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Telegram', 'id']
    }),
    SM_Telegram_verifiziert: new ColumnDefinition({
        idPersistent: '4d86457c-3a3b-4c7d-aab9-6fcac8e4e13c',
        idParentPersistent: '1effddcc-17a0-453c-90cc-2a10d85e1275',
        version: 15,
        columnType: ColumnType.Boolean,
        namePath: ['Social Media', 'Telegram', 'verified']
    }),
    SM_Youtube_user: new ColumnDefinition({
        idPersistent: '51612bad-c1fd-4ab8-a2a0-0788e8afb9d9',
        idParentPersistent: '07e0bf57-c3a5-4dd8-aa2f-b1e51a4286ad',
        version: 17,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'YouTube', 'user']
    }),
    SM_Youtube_id: new ColumnDefinition({
        idPersistent: 'c10dbf8a-33e9-49bb-9e10-4e62bf1d1f35',
        idParentPersistent: '07e0bf57-c3a5-4dd8-aa2f-b1e51a4286ad',
        version: 18,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'YouTube', 'id']
    }),
    SM_Youtube_verifiziert: new ColumnDefinition({
        idPersistent: '4c17f7e5-b73b-4072-8357-06c8d4a15050',
        idParentPersistent: '07e0bf57-c3a5-4dd8-aa2f-b1e51a4286ad',
        version: 19,
        columnType: ColumnType.Boolean,
        namePath: ['Social Media', 'YouTube', 'verified']
    }),
    SM_Instagram_user: new ColumnDefinition({
        idPersistent: '23a2511a-e5e1-4ef8-aa94-c8e11b65cbcd',
        idParentPersistent: '30cbca0e-a80b-4e5c-8d6b-cfaed9636740',
        version: 21,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Instagram', 'user']
    }),
    SM_Instagram_id: new ColumnDefinition({
        idPersistent: '52cdcd4d-3428-453d-abba-43948f13de8c',
        idParentPersistent: '30cbca0e-a80b-4e5c-8d6b-cfaed9636740',
        version: 22,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Instagram', 'id']
    }),
    SM_Instagram_verifiziert: new ColumnDefinition({
        idPersistent: 'aacca549-5651-4a41-951a-1f7f853717d5',
        idParentPersistent: '30cbca0e-a80b-4e5c-8d6b-cfaed9636740',
        version: 23,
        columnType: ColumnType.Boolean,
        namePath: ['Social Media', 'Instagram', 'verified']
    })
}

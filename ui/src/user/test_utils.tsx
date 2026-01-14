
export const nameSshKey = 'ssh key name',
    typeSshKey = 'sshKeyType',
    idSshKey = 'ssh-key-id',
    nameSshKey1 = 'ssh key name 1',
    typeSshKey1 = 'sshKeyType1',
    idSshKey1 = 'ssh-key-id-1',
    sshKeyApi = {
        id_persistent: idSshKey,
        name: nameSshKey,
        type: typeSshKey
    },
    sshKeyApi1 = {
        id_persistent: idSshKey1,
        name: nameSshKey1,
        type: typeSshKey1
    },
    sshKeyListApi = { key_list: [sshKeyApi, sshKeyApi1] },
    noKeyApiResponse = { key_list: [] }

export function mkUpUntilDateColumnId(
    idPersistent: string,
    upUntilDate: Date | undefined
): string {
    if (upUntilDate === undefined || idPersistent.length != 36) {
        return idPersistent
    }
    return mkUpUntilSinceEpochNotNullPostfix(idPersistent, upUntilDate.getTime())
}

export function mkUpUntilSinceEpochColumnId(
    idPersistent: string,
    upUntilSinceEpoch: number | undefined
): string {
    if (upUntilSinceEpoch === undefined || idPersistent.length != 36) {
        return idPersistent
    }
    return mkUpUntilSinceEpochNotNullPostfix(idPersistent, upUntilSinceEpoch)
}

function mkUpUntilSinceEpochNotNullPostfix(
    idPersistent: string,
    upUntilSinceEpoch: number
): string {
    return idPersistent + ('@' + upUntilSinceEpoch.toString())
}

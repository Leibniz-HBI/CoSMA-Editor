import {
    CustomCell,
    GridCell,
    GridCellKind,
    ImageWindowLoader,
    Rectangle,
    Theme
} from '@glideapps/glide-data-grid'

export class LoadingType {}

export class AssignType {
    isNew: boolean
    active: boolean
    constructor(isNew: boolean, active: boolean) {
        this.isNew = isNew
        this.active = active
    }
}

export function drawCell(args: {
    cell: GridCell
    col: number
    ctx: CanvasRenderingContext2D
    highlighted: boolean
    hoverAmount: number
    hoverX: number | undefined
    hoverY: number | undefined
    imageLoader: ImageWindowLoader
    rect: Rectangle
    requestAnimationFrame: () => void
    row: number
    theme: Theme
}) {
    const { cell, rect, ctx, row, col, requestAnimationFrame } = args
    if (cell.kind == ('custom' as GridCellKind)) {
        const customCell = cell as CustomCell
        if (customCell.data instanceof LoadingType) {
            drawLoadingCell({
                rowIdx: row,
                colIdx: col,
                ctx,
                rect,
                requestAnimationFrame
            })
        } else if (customCell.data instanceof AssignType) {
            drawReplaceButtonCell(ctx, rect, customCell.data)
        }
        return true
    }
    return false
}

export function drawLoadingCell({
    rowIdx,
    colIdx,
    ctx,
    rect,
    requestAnimationFrame
}: {
    rowIdx: number
    colIdx: number
    ctx: CanvasRenderingContext2D
    rect: Rectangle
    requestAnimationFrame: () => void
}) {
    const time = Date.now()
    const time_milliseconds = (time + 200 * rowIdx + 200 * colIdx) % 1000
    const alpha = 2 / 15 + (4 / 15) * (time_milliseconds / 999)
    const { x, y, width, height } = rect
    ctx.fillStyle = `rgba(0,0,0,${alpha})`
    ctx.fillRect(x, y, width, height)
    ctx.fillStyle = '#ff0000'
    requestAnimationFrame()
}

export function drawReplaceButtonCell(
    ctx: CanvasRenderingContext2D,
    rect: Rectangle,
    data: AssignType
) {
    const label = data.isNew ? 'Assign Duplicate' : 'Create New Entity'
    let fillColor = '#eceff4'
    let borderColor = '#197374'

    if (data.active) {
        fillColor = '#197374'
        borderColor = '#eceff4'
    }
    const { x, y, width, height } = rect
    ctx.fillStyle = fillColor
    ctx.lineWidth = 3
    ctx.strokeStyle = borderColor
    ctx.beginPath()
    ctx.roundRect(x + 3, y + 3, width - 6, height - 6, 8)
    ctx.closePath()
    ctx.stroke()
    ctx.fill()
    ctx.textAlign = 'center'
    ctx.fillStyle = borderColor
    ctx.fillText(label, x + width / 2, y + height / 2, width - 40)
}

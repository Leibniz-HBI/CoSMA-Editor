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
            replaceButtonDrawer.drawReplaceButtonCell(ctx, rect, customCell.data)
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

export class ReplaceButtonDrawer {
    drawReplaceButtonCell(
        ctx: CanvasRenderingContext2D,
        rect: Rectangle,
        data: AssignType
    ) {
        if (data.isNew) {
            if (data.active) {
                this.drawReplaceButtonIsNewActive(rect, ctx)
            } else {
                this.drawReplaceButtonIsNewInactive(rect, ctx)
            }
        } else {
            if (data.active) {
                this.drawReplaceButtonIsExistingActive(rect, ctx)
            } else {
                this.drawReplaceButtonIsExistingInactive(rect, ctx)
            }
        }
    }

    private drawButtonToCanvas(
        rect: Rectangle,
        ctx: CanvasRenderingContext2D,
        fillColor: string,
        borderColor: string,
        label: string
    ) {
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

    drawReplaceButtonIsNewActive(rect: Rectangle, ctx: CanvasRenderingContext2D) {
        this.drawButtonToCanvas(rect, ctx, '#197374', '#eceff4', 'Assign Duplicate')
        this.drawReplaceButtonIsNewActive = mkCanvasCopyFunction(rect, ctx)
    }
    drawReplaceButtonIsNewInactive(rect: Rectangle, ctx: CanvasRenderingContext2D) {
        this.drawButtonToCanvas(rect, ctx, '#eceff4', '#197374', 'Assign Duplicate')
        this.drawReplaceButtonIsNewInactive = mkCanvasCopyFunction(rect, ctx)
    }
    drawReplaceButtonIsExistingActive(rect: Rectangle, ctx: CanvasRenderingContext2D) {
        this.drawButtonToCanvas(rect, ctx, '#197374', '#eceff4', 'Create New Entity')
        this.drawReplaceButtonIsExistingActive = mkCanvasCopyFunction(rect, ctx)
    }
    drawReplaceButtonIsExistingInactive(
        rect: Rectangle,
        ctx: CanvasRenderingContext2D
    ) {
        this.drawButtonToCanvas(rect, ctx, '#eceff4', '#197374', 'Create New Entity')
        this.drawReplaceButtonIsExistingInactive = mkCanvasCopyFunction(rect, ctx)
    }
}
const replaceButtonDrawer = new ReplaceButtonDrawer()

export function mkCanvasCopyFunction(rect: Rectangle, ctx: CanvasRenderingContext2D) {
    const imageData = ctx.getImageData(rect.x, rect.y, rect.width, rect.height)
    return (rect: Rectangle, ctx: CanvasRenderingContext2D) => {
        ctx.putImageData(imageData, rect.x, rect.y)
    }
}

import {
    CustomCell,
    CustomRenderer,
    GridCell,
    GridCellKind,
    ImageWindowLoader,
    Rectangle,
    Theme
} from '@glideapps/glide-data-grid'

export class AssignType {
    isNew: boolean
    active: boolean
    constructor(isNew: boolean, active: boolean) {
        this.isNew = isNew
        this.active = active
    }
}

export function drawCell(
    args: {
        cell: GridCell
        col: number
        ctx: CanvasRenderingContext2D
        highlighted: boolean
        hoverAmount: number
        hoverX: number | undefined
        hoverY: number | undefined
        imageLoader: ImageWindowLoader
        rect: Rectangle
        row: number
        theme: Theme
    },
    drawContent: VoidFunction
) {
    const { cell, rect, ctx } = args
    if (cell.kind == ('custom' as GridCellKind)) {
        const customCell = cell as CustomCell
        if (customCell.data instanceof AssignType) {
            replaceButtonDrawer.drawReplaceButtonCell(ctx, rect, customCell.data)
        }
    }
    drawContent()
}

export interface LoadingCellProps {
    readonly kind: 'custom-loading-cell'
    rowIdx: number
    colIdx: number
}
export type LoadingCell = CustomCell<LoadingCellProps>

export const loadingCellRenderer: CustomRenderer<LoadingCell> = {
    kind: 'custom' as GridCellKind.Custom,
    isMatch: (cell: CustomCell): cell is LoadingCell => {
        console.log(cell.data)
        return (cell.data as LoadingCellProps).kind === 'custom-loading-cell'
    },
    provideEditor: () => undefined,
    draw: (
        args: {
            ctx: CanvasRenderingContext2D
            rect: Rectangle
            requestAnimationFrame: VoidFunction
        },
        cell: LoadingCell
    ) => {
        console.log('loadingCell render')
        const time = Date.now()
        const { ctx, rect, requestAnimationFrame } = args
        const cellData = cell.data
        const rowIdx = cellData.rowIdx
        const colIdx = cellData.colIdx
        const time_milliseconds = (time + 200 * rowIdx + 200 * colIdx) % 1000
        const alpha = 2 / 15 + (4 / 15) * (time_milliseconds / 999)
        const { x, y, width, height } = rect
        ctx.fillStyle = `rgba(0,0,0,${alpha})`
        ctx.fillRect(x, y, width, height)
        ctx.fillStyle = '#ff0000'
        requestAnimationFrame()
    }
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
        this.drawButtonToCanvas(rect, ctx, '#197374', '#eceff4', 'Merge with Existing')
        // when drawing fails, using a cache will not recover.
        // this.drawReplaceButtonIsNewActive = mkCanvasCopyFunction(rect, ctx)
    }
    drawReplaceButtonIsNewInactive(rect: Rectangle, ctx: CanvasRenderingContext2D) {
        this.drawButtonToCanvas(rect, ctx, '#eceff4', '#197374', 'Merge with Existing')
        // when drawing fails, using a cache will not recover.
        // this.drawReplaceButtonIsNewInactive = mkCanvasCopyFunction(rect, ctx)
    }
    drawReplaceButtonIsExistingActive(rect: Rectangle, ctx: CanvasRenderingContext2D) {
        this.drawButtonToCanvas(rect, ctx, '#197374', '#eceff4', 'Create New Entity')
        // when drawing fails, using a cache will not recover.
        // this.drawReplaceButtonIsExistingActive = mkCanvasCopyFunction(rect, ctx)
    }
    drawReplaceButtonIsExistingInactive(
        rect: Rectangle,
        ctx: CanvasRenderingContext2D
    ) {
        this.drawButtonToCanvas(rect, ctx, '#eceff4', '#197374', 'Create New Entity')
        // when drawing fails, using a cache will not recover.
        // this.drawReplaceButtonIsExistingInactive = mkCanvasCopyFunction(rect, ctx)
    }
}
const replaceButtonDrawer = new ReplaceButtonDrawer()

export function mkCanvasCopyFunction(rect: Rectangle, ctx: CanvasRenderingContext2D) {
    const imageData = ctx.getImageData(rect.x, rect.y, rect.width, rect.height)
    return (rect: Rectangle, ctx: CanvasRenderingContext2D) => {
        ctx.putImageData(imageData, rect.x, rect.y)
    }
}

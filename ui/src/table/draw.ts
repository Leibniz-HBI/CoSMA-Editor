import {
    CustomCell,
    CustomRenderer,
    GridCellKind,
    Rectangle
} from '@glideapps/glide-data-grid'

export function newReplaceButtonCellData(
    isNew: boolean,
    active: boolean,
    isDiscard: boolean
): ReplaceButtonCellProps {
    return {
        isNew,
        active,
        isDiscard,
        kind: 'replace-button-cell'
    }
}

interface LoadingCellProps {
    readonly kind: 'custom-loading-cell'
    rowIdx: number
    colIdx: number
}

export type LoadingCell = CustomCell<LoadingCellProps>

export const loadingCellRenderer: CustomRenderer<LoadingCell> = {
    kind: 'custom' as GridCellKind.Custom,
    isMatch: (cell: CustomCell): cell is LoadingCell =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cell.data as any).kind === 'custom-loading-cell',

    draw: (
        {
            ctx,
            rect,
            requestAnimationFrame
        }: {
            ctx: CanvasRenderingContext2D
            rect: Rectangle
            requestAnimationFrame: VoidFunction
        },
        cell: LoadingCell
    ) => {
        const { colIdx, rowIdx } = cell.data
        const time = Date.now()
        const time_milliseconds = (time + 200 * rowIdx + 200 * colIdx) % 1000
        const alpha = 2 / 15 + (4 / 15) * (time_milliseconds / 999)
        const { x, y, width, height } = rect
        ctx.fillStyle = `rgba(0,0,0,${alpha})`
        ctx.fillRect(x, y, width, height)
        ctx.fillStyle = '#ff0000'
        requestAnimationFrame()
    },
    provideEditor: () => undefined
}
interface ReplaceButtonCellProps {
    readonly kind: 'replace-button-cell'
    /**
     * Indicate that the button in the cell is currently active selection.
     */
    active: boolean
    /**
     * Indicate that the button in the cell toggles whether a new entity is created.
     */
    isNew: boolean
    /**
     * Indicate that the current cell tracks discard state.
     */
    isDiscard: boolean
}

export type ReplaceButtonCell = CustomCell<ReplaceButtonCellProps>

export const ReplaceButtonCellRenderer: CustomRenderer<ReplaceButtonCell> = {
    kind: 'custom' as GridCellKind.Custom,
    isMatch: (cell: CustomCell): cell is ReplaceButtonCell =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cell.data as any).kind === 'replace-button-cell',
    draw: (
        { ctx, rect }: { ctx: CanvasRenderingContext2D; rect: Rectangle },
        cell: ReplaceButtonCell
    ) => {
        replaceButtonDrawer.drawReplaceButtonCell(ctx, rect, cell.data)
    },
    provideEditor: () => undefined
}

export class ReplaceButtonDrawer {
    drawReplaceButtonCell(
        ctx: CanvasRenderingContext2D,
        rect: Rectangle,
        data: ReplaceButtonCellProps
    ) {
        if (data.isNew) {
            if (data.active) {
                this.drawReplaceButtonIsNewActive(rect, ctx)
            } else {
                this.drawReplaceButtonIsNewInactive(rect, ctx)
            }
        } else if (data.isDiscard) {
            if (data.active) {
                this.drawReplaceButtonIsDiscardActive(rect, ctx)
            } else {
                this.drawReplaceButtonIsDiscardInactive(rect, ctx)
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
        const textAlign = ctx.textAlign
        ctx.textAlign = 'center'
        ctx.fillStyle = borderColor
        ctx.fillText(label, x + width / 2, y + height / 2, width - 60)
        ctx.textAlign = textAlign
    }

    drawReplaceButtonIsNewActive(rect: Rectangle, ctx: CanvasRenderingContext2D) {
        this.drawButtonToCanvas(rect, ctx, '#197374', '#eceff4', 'Create New Entity')
        // when drawing fails, using a cache will not recover.
        // this.drawReplaceButtonIsNewActive = mkCanvasCopyFunction(rect, ctx)
    }
    drawReplaceButtonIsNewInactive(rect: Rectangle, ctx: CanvasRenderingContext2D) {
        this.drawButtonToCanvas(rect, ctx, '#eceff4', '#197374', 'Create New Entity')
        // when drawing fails, using a cache will not recover.
        // this.drawReplaceButtonIsNewInactive = mkCanvasCopyFunction(rect, ctx)
    }
    drawReplaceButtonIsExistingActive(rect: Rectangle, ctx: CanvasRenderingContext2D) {
        this.drawButtonToCanvas(rect, ctx, '#197374', '#eceff4', 'Merge with Existing')
        // when drawing fails, using a cache will not recover.
        // this.drawReplaceButtonIsExistingActive = mkCanvasCopyFunction(rect, ctx)
    }
    drawReplaceButtonIsExistingInactive(
        rect: Rectangle,
        ctx: CanvasRenderingContext2D
    ) {
        this.drawButtonToCanvas(rect, ctx, '#eceff4', '#197374', 'Merge with Existing')
        // when drawing fails, using a cache will not recover.
        // this.drawReplaceButtonIsExistingInactive = mkCanvasCopyFunction(rect, ctx)
    }
    drawReplaceButtonIsDiscardActive(rect: Rectangle, ctx: CanvasRenderingContext2D) {
        this.drawButtonToCanvas(rect, ctx, '#ea5e5f', '#eceff4', 'Discard Entity')
    }
    drawReplaceButtonIsDiscardInactive(rect: Rectangle, ctx: CanvasRenderingContext2D) {
        this.drawButtonToCanvas(rect, ctx, '#eceff4', '#ea5e5f', 'Discard Entity')
    }
}
const replaceButtonDrawer = new ReplaceButtonDrawer()

export function mkCanvasCopyFunction(rect: Rectangle, ctx: CanvasRenderingContext2D) {
    const imageData = ctx.getImageData(rect.x, rect.y, rect.width, rect.height)
    return (rect: Rectangle, ctx: CanvasRenderingContext2D) => {
        ctx.putImageData(imageData, rect.x, rect.y)
    }
}

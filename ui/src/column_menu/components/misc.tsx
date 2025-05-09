import { ReactElement } from 'react'
import { Column } from '../state'
import { OverlayTrigger, ProgressBar, Tooltip } from 'react-bootstrap'
import { PatchCheckFill } from 'react-bootstrap-icons'
import { useColumn } from '../hooks'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ColumnAddButton(props: any) {
    return (
        <div
            className="cosmae-column-add-button"
            onClick={props.onClick}
            aria-label="show additional columns"
        >
            {props.children}
        </div>
    )
}

export function ColumnNamePathFromId({
    idColumnPersistent
}: {
    idColumnPersistent: string
}) {
    const column = useColumn(idColumnPersistent)
    if (column.isLoading) {
        return <ProgressBar animated={true} />
    }
    if (column.value === undefined) {
        return <span></span>
    }
    return <ColumnNamePath column={column.value} />
}

export function ColumnNamePath({
    column
}: {
    column: Column
}) {
    const allSpans = constructFullColumnTitleSpans(column.namePath)
    const partialSpans =
        allSpans.length > 3
            ? [
                  allSpans[0],
                  <span className="pre-wrap" key="dots">
                      <span className="pre-wrap" key="path-part">
                          ...
                      </span>
                      <span className="pre-wrap" key="arrow">
                          {' -> '}
                      </span>
                  </span>,
                  ...allSpans.slice(-2)
              ]
            : [...allSpans]
    if (column.curated) {
        partialSpans.push(
            <span className="icon test-primary pre-wrap" key="curated">
                <span className="pre-wrap" key="space">
                    {' '}
                </span>
                <span className="pre-wrap" key="check">
                    <PatchCheckFill />
                </span>
            </span>
        )
    }
    const popover = (
        <Tooltip>
            <span>{allSpans}</span>
        </Tooltip>
    )
    return (
        <OverlayTrigger overlay={popover}>
            <span>{partialSpans}</span>
        </OverlayTrigger>
    )
}

export function constructFullColumnTitleSpans(namePath: string[]): ReactElement[] {
    if (namePath === undefined || namePath.length == 0) {
        return [<span>UNKNOWN</span>]
    }
    const spans = namePath.flatMap((pathPart, idx) => [
        <span className="pre-wrap" key={idx}>
            <span className="pre-wrap" key="path-part">
                {pathPart}
            </span>
            <span className="pre-wrap" key="separator">
                {' -> '}
            </span>
        </span>
    ])
    spans.splice(
        -1,
        1,
        <span className="pre-wrap" key="last">
            {namePath.at(-1)}
        </span>
    )
    return spans
}

export function constructColumnTitleSpans(namePath: string[]): ReactElement[] {
    if (namePath === undefined || namePath.length == 0) {
        return [<span>UNKNOWN</span>]
    }
    const pathSpans = [
        <span className="pre-wrap" key="path-part-0">
            {namePath[0] + ' '}
        </span>,
        <span className="pre-wrap" key="path-part-1">
            {'-> ... '}
        </span>,
        <span className="pre-wrap" key="path-part-2">
            {'-> ' + namePath[namePath.length - 2] + ' '}
        </span>,
        <span className="pre-wrap" key="path-part-3">
            {'-> ' + namePath[namePath.length - 1] + ' '}
        </span>
    ]
    if (namePath.length < 4) {
        pathSpans.splice(1, 4 - namePath.length)
    }

    return pathSpans
}

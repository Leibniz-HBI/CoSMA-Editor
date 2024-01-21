// reduceEachLeadingCommentRange.tsx
// } else if (action instanceof ResizeColumnAction) {
//     return new TableState({
//         ...state,
//         columnStates: [
//             ...state.columnStates.slice(0, action.columnIndex),
//             new ColumnState({
//                 ...state.columnStates[action.columnIndex],
//                 width: action.newSize
//             }),
//             ...state.columnStates.slice(action.columnIndex + 1)
//         ]
//     })
// } else if (action instanceof FlipRowSelectionAction) {
//     return new TableState({
//         ...state,
//         selectedRows: mergeSelection(state.selectedRows, action.rowIdxs)
//     })
// } else if (action instanceof SelectRangeAction) {
//     return new TableState({ ...state, selectedRange: action.range })
// }

// actions.tsx

// import { Rectangle } from '@glideapps/glide-data-grid'
// export class ResizeColumnAction {
//     columnIndex: number
//     newSize: number
//     constructor(columnIndex: number, newSize: number) {
//         this.columnIndex = columnIndex
//         this.newSize = newSize
//     }
// }

// export class FlipRowSelectionAction {
//     rowIdxs: number[]
//     constructor(rowIdxs: number[]) {
//         this.rowIdxs = rowIdxs
//     }
// }

// export class SelectRangeAction {
//     range: Rectangle
//     constructor(range: Rectangle) {
//         this.range = range
//     }
// }

//state.tsx
// import { Rectangle } from '@glideapps/glide-data-grid'

// selectedRows: number[]
// selectedRange: Rectangle

// selectedRows = [],
// selectedRange = { x: 0, y: 0, width: 0, height: 0 },

// selectedRows?: number[]
// selectedRange?: Rectangle

// this.selectedRows = selectedRows
// this.selectedRange = selectedRange

//components.tsx

// const buttonDisabled = state.isLoading || state.isLoadingColumn()
// <div className="cosmae-table-page-header">
//     <button
//         disabled={buttonDisabled}
//         onClick={() => {
//             window.alert(
//                 `You have selected ${state.selectedRows.length} of ${state.entities.length} rows.`
//             )
//         }}
//     >
//         Donwload
//     </button>
//     <button
//         disabled={buttonDisabled}
//         onClick={() => {
//             window.alert('CSV upload is not yet implemented.')
//         }}
//     >
//         Upload
//     </button>
// </div>

// GridSelection,
// CompactSelection,
// import {
//     ResizeColumnAction,
//     FlipRowSelectionAction,
//     SelectRangeAction
// } from './actions'

// function onColumnResize(args: any) {
//     const { colIndex, newSizeWithGrow } = args
//     dispatch(new ResizeColumnAction(colIndex, newSizeWithGrow))
// }

// const selectedColumns = CompactSelection.empty()
// let selectedRows = CompactSelection.empty()
// for (const rowIdx of props.selectedRows) {
//     selectedRows = selectedRows.add(rowIdx)
// }
// const selection = {
//     columns: selectedColumns,
//     current: {
//         cell: [
//             props.selectedRange.x as number,
//             props.selectedRange.y as number
//         ] as Item,
//         range: props.selectedRange,
//         rangeStack: []
//     },
//     rows: selectedRows
// }

// compontents.tsx dataeditor props

// selectedRows={state.selectedRows}
// selectRows={(rows: number[]) =>
//     dispatch(new FlipRowSelectionAction(rows))
// }
// selectedRange={state.selectedRange}
// onSelectRange={(range: Rectangle) =>
//     dispatch(new SelectRangeAction(range))
// gridSelection={selection}
// rowMarkers="checkbox"
// rowSelect="multi"
// onGridSelectionChange={(selection: GridSelection) => {
//     if (selection.current !== undefined) {
//         props.onSelectRange(selection.current.range)
//         return
//     }
//     if (selection.columns.length > 0) {
//         return
//     }
//     props.selectRows(selection.rows.toArray())
// }}
// onColumnResize={props.onColumnResize}
// }

// export function mergeSelection(current: number[], newSelection: number[]): number[] {
//     if (current.length == 0) {
//         return newSelection
//     }
//     if (newSelection.length == 0) {
//         return []
//     }
//     const ret = []
//     let currentIdx = 0
//     let newIdx = 0
//     for (;;) {
//         if (currentIdx < current.length) {
//             if (
//                 newIdx >= newSelection.length ||
//                 current[currentIdx] < newSelection[newIdx]
//             ) {
//                 ret.push(current[currentIdx++])
//             } else if (current[currentIdx] > newSelection[newIdx]) {
//                 ret.push(newSelection[newIdx++])
//             } else {
//                 currentIdx++
//                 newIdx++
//             }
//         } else if (newIdx < newSelection.length) {
//             ret.push(newSelection[newIdx++])
//         } else {
//             break
//         }
//     }
//     return ret
// }

/**
 * Taken from https://github.com/twbs/icons which is licensed under MIT license.
 */
// import React, { forwardRef } from 'react'
// import PropTypes from 'prop-types'
// import { IconProps } from 'react-bootstrap-icons'

// const _excluded = ['color', 'size', 'title']

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// function _extends(...source_list: { [key: string]: any }[]) {
//     // eslint-disable-next-line no-func-assign
//     const target = Object.assign(source_list[0])
//     for (let i = 1; i < source_list.length; i++) {
//         const source = source_list[i]
//         for (const key in source) {
//             if (Object.prototype.hasOwnProperty.call(source, key)) {
//                 target[key] = source[key]
//             }
//         }
//     }
//     return target
// }

// function _objectWithoutProperties(
//     source: { [key: string]: unknown },
//     excluded: string[]
// ) {
//     if (source == null) return {}
//     const target = _objectWithoutPropertiesLoose(source, excluded)
//     let key, i
//     if (Object.getOwnPropertySymbols) {
//         const sourceSymbolKeys = Object.getOwnPropertySymbols(source)
//         for (i = 0; i < sourceSymbolKeys.length; i++) {
//             key = sourceSymbolKeys[i]
//             if (excluded.indexOf(key.toString()) >= 0) continue
//             if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue
//             target[key.toString()] = source[key.toString()]
//         }
//     }
//     return target
// }

// function _objectWithoutPropertiesLoose(
//     source: { [key: string]: unknown },
//     excluded: string[]
// ) {
//     if (source == null) return {}
//     const target: { [key: string]: unknown } = {}
//     const sourceKeys = Object.keys(source)
//     let key, i
//     for (i = 0; i < sourceKeys.length; i++) {
//         key = sourceKeys[i]
//         if (excluded.indexOf(key) >= 0) continue
//         target[key] = source[key]
//     }
//     return target
// }

// const PatchEmpty = /*#__PURE__*/ forwardRef(function (_ref: IconProps, ref) {
//     const color = _ref.color,
//         size = _ref.size,
//         title = _ref.title,
//         rest = _objectWithoutProperties({ ..._ref }, _excluded)

//     return /*#__PURE__*/ React.createElement(
//         'svg',
//         _extends(
//             {
//                 ref: ref,
//                 xmlns: 'http://www.w3.org/2000/svg',
//                 viewBox: '0 0 16 16',
//                 width: size,
//                 height: size,
//                 fill: color
//             },
//             rest
//         ),
//         title ? /*#__PURE__*/ React.createElement('title', null, title) : null,
//         /*#__PURE__*/ React.createElement('path', {
//             d: 'm10.273 2.513-.921-.944.715-.698.622.637.89-.011a2.89 2.89 0 0 1 2.924 2.924l-.01.89.636.622a2.89 2.89 0 0 1 0 4.134l-.637.622.011.89a2.89 2.89 0 0 1-2.924 2.924l-.89-.01-.622.636a2.89 2.89 0 0 1-4.134 0l-.622-.637-.89.011a2.89 2.89 0 0 1-2.924-2.924l.01-.89-.636-.622a2.89 2.89 0 0 1 0-4.134l.637-.622-.011-.89a2.89 2.89 0 0 1 2.924-2.924l.89.01.622-.636a2.89 2.89 0 0 1 4.134 0l-.715.698a1.89 1.89 0 0 0-2.704 0l-.92.944-1.32-.016a1.89 1.89 0 0 0-1.911 1.912l.016 1.318-.944.921a1.89 1.89 0 0 0 0 2.704l.944.92-.016 1.32a1.89 1.89 0 0 0 1.912 1.911l1.318-.016.921.944a1.89 1.89 0 0 0 2.704 0l.92-.944 1.32.016a1.89 1.89 0 0 0 1.911-1.912l-.016-1.318.944-.921a1.89 1.89 0 0 0 0-2.704l-.944-.92.016-1.32a1.89 1.89 0 0 0-1.912-1.911l-1.318.016z'
//         })
//     )
// })
// PatchEmpty.propTypes = {
//     color: PropTypes.string,
//     size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
//     title: PropTypes.string
// }
// PatchEmpty.defaultProps = {
//     color: 'currentColor',
//     size: '1em',
//     title: undefined
// }
// export default PatchEmpty

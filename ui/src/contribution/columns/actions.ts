import { Contribution } from '../state'
import { ColumnDefinitionContribution } from './state'

/**
 * Indicates the start of loading column definitions of contributions
 */
export class LoadColumnDefinitionsContributionStartAction {}

/**
 * Indicates success when loading column definition of contributions.
 */
export class LoadColumnDefinitionsContributionSuccessAction {
    active: ColumnDefinitionContribution[]
    discarded: ColumnDefinitionContribution[]
    contribution: Contribution

    constructor(
        active: ColumnDefinitionContribution[],
        discarded: ColumnDefinitionContribution[],
        contribution: Contribution
    ) {
        this.active = active
        this.discarded = discarded
        this.contribution = contribution
    }
}

/**
 * Indicates an error during loading of column definitions of contributions
 */

export class LoadColumnDefinitionsContributionErrorAction {
    msg: string

    constructor(msg: string) {
        this.msg = msg
    }
}

/**
 * Indicate that a column definition of a contribution was selected
 */
export class ColumnDefinitionContributionSelectAction {
    columnDefinition: ColumnDefinitionContribution
    constructor(columnDefinition: ColumnDefinitionContribution) {
        this.columnDefinition = columnDefinition
    }
}

/**
 * Indicate that the tab of the column definition assignment for has been chosen
 */
export class SetColumnDefinitionFormTabAction {
    createTabSelected: boolean
    constructor(createTabSelected: boolean) {
        this.createTabSelected = createTabSelected
    }
}

/**
 * Indicate the start of updating a column definition of a contribution
 */
export class PatchColumnDefinitionContributionStartAction {}

/** Indicate success in updating a colum definition of a contribution */
export class PatchColumnDefinitionContributionSuccessAction {
    columnDefinition: ColumnDefinitionContribution
    constructor(columnDefinition: ColumnDefinitionContribution) {
        this.columnDefinition = columnDefinition
    }
}

/**
 * Indicate an error during updating a column definition of a contribution
 */
export class PatchColumnDefinitionContributionErrorAction {
    msg: string
    constructor(msg: string) {
        this.msg = msg
    }
}
export type ColumnDefinitionsContributionAction =
    | LoadColumnDefinitionsContributionStartAction
    | LoadColumnDefinitionsContributionSuccessAction
    | LoadColumnDefinitionsContributionErrorAction
    | ColumnDefinitionContributionSelectAction
    | SetColumnDefinitionFormTabAction
    | PatchColumnDefinitionContributionStartAction
    | PatchColumnDefinitionContributionSuccessAction
    | PatchColumnDefinitionContributionErrorAction

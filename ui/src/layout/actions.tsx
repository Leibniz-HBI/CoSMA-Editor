import { ComponentBuilder } from './state'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LayoutAction {}
export class SetOverlayAction implements LayoutAction {
    blueprint: ComponentBuilder

    constructor(blueprint: ComponentBuilder) {
        this.blueprint = blueprint
    }
}

export class CloseOverlayAction implements LayoutAction {}

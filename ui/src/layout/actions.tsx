import { ComponentBuilder, LayoutState } from "./state";


export interface LayoutAction { }
export class SetOverlayAction implements LayoutAction {
    blueprint: ComponentBuilder

    constructor(blueprint: ComponentBuilder) {
        this.blueprint = blueprint
    }

}

export class CloseOverlayAction implements LayoutAction {
}

import { Dispatch } from "react";
import { ComponentBuilder } from "./state";
import { CloseOverlayAction, LayoutAction, SetOverlayAction } from "./actions";

export class OverlayContext{
    dispatch: Dispatch<LayoutAction>

    constructor(dispatch: Dispatch<LayoutAction>){
        this.dispatch = dispatch
    }

    showOverlay(blueprint:ComponentBuilder) {
        this.dispatch(new SetOverlayAction(blueprint))
    }

    hideOverlay(){
        this.dispatch(new CloseOverlayAction())
    }
}

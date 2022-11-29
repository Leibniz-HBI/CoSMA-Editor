import { LayoutState, OverlayBuilder } from "./state";
import { LayoutAction, SetOverlayAction, CloseOverlayAction } from "./actions";

export function layoutReducer(state: LayoutState, action: LayoutAction): LayoutState {
    if (action instanceof SetOverlayAction) {
        return new LayoutState(
            state.mainBuilder,
            new OverlayBuilder( action.blueprint.hook, action.blueprint.props))
    }
    else if (action instanceof CloseOverlayAction) {
        return new LayoutState( state.mainBuilder)
    }
    else {
        return state
    }
}

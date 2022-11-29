import { FunctionComponent, ComponentClass, createElement} from "react";

type ComponentHook = FunctionComponent | ComponentClass | string;
const emptyObject = {}
function mkEmptyDiv(props: any) {
    return <div></div>
}

export class ComponentBuilder {
    hook: ComponentHook
    props: any

    constructor(hook: ComponentHook, props: any) {
        this.hook = hook
        this.props = props
    }
}

export const emptyBuilder = new ComponentBuilder(mkEmptyDiv, emptyObject)

export class OverlayBuilder extends ComponentBuilder {

    constructor(hook: ComponentHook, props: any) {
        super((props_inner) =>
            <div className="cosmae-overlay">{createElement(hook, props_inner)}</div>, props)
    }
}



export class LayoutState {
    mainBuilder: ComponentBuilder
    overlayBuilder: ComponentBuilder

    public constructor(mainBuilder: ComponentBuilder, overlayBuilder?: ComponentBuilder) {
        this.mainBuilder = mainBuilder
        if (overlayBuilder) {
            this.overlayBuilder = overlayBuilder
        }
        else {
            this.overlayBuilder = emptyBuilder
        }
    }
}

import { FunctionComponent, ComponentClass, createElement } from 'react'

type ComponentHook = FunctionComponent | ComponentClass | string
const emptyObject = {}
//eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function mkEmptyDiv(props: any) {
    return <div></div>
}

export class ComponentBuilder {
    hook: ComponentHook
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    props: any

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(hook: ComponentHook, props: any) {
        this.hook = hook
        this.props = props
    }
}

export const emptyBuilder = new ComponentBuilder(mkEmptyDiv, emptyObject)

export class OverlayBuilder extends ComponentBuilder {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(hook: ComponentHook, props: any) {
        super(
            (props_inner) => (
                <div className="cosmae-overlay">{createElement(hook, props_inner)}</div>
            ),
            props
        )
    }
}

export class LayoutState {
    mainBuilder: ComponentBuilder
    overlayBuilder: ComponentBuilder

    public constructor(
        mainBuilder: ComponentBuilder,
        overlayBuilder?: ComponentBuilder
    ) {
        this.mainBuilder = mainBuilder
        if (overlayBuilder) {
            this.overlayBuilder = overlayBuilder
        } else {
            this.overlayBuilder = emptyBuilder
        }
    }
}

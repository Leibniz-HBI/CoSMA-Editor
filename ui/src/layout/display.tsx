import { LayoutState } from "./state";
import { layoutReducer } from "./reducer";
import { ComponentBuilder } from "./state";
import { createContext, createElement, useContext, useReducer, useState } from "react";
import { OverlayContext } from "./context";
import { Form } from "../person_natural/editor";
import { PersonTable } from "../person_natural/components";


export const overlayContext = createContext<OverlayContext | null>(null)



export function RenderLayout(builder: ComponentBuilder) {
    const [state, dispatch] = useReducer(layoutReducer, new LayoutState( builder))
    const overlayContextValue = new OverlayContext(dispatch)
    return (
        <div>
            <overlayContext.Provider value={overlayContextValue}>
                {createElement(state.mainBuilder.hook, state.mainBuilder.props)}
                {createElement(state.overlayBuilder.hook, state.overlayBuilder.props)}
            </overlayContext.Provider>
        </div>
    )
    // TODO add context for closing overlay
}

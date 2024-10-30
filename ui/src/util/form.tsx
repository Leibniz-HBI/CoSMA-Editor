import { Button, Col, Form, Row } from 'react-bootstrap'
import { HandleChange } from './type'
import { AriaRole, ChangeEvent, ElementType, forwardRef, useState } from 'react'

export const FormField = forwardRef(function FormField(
    {
        type = 'text',
        name,
        label,
        value,
        isTouched,
        error,
        handleChange,
        as = undefined,
        className = '',
        role = undefined
    }: {
        type?: string
        name: string
        label: string
        value: string
        isTouched?: boolean
        error?: string
        handleChange: HandleChange
        as?: ElementType
        className?: string
        role?: AriaRole
    },
    ref
) {
    const isInvalid = isTouched && !!error
    const field_id = 'formField-' + name
    return (
        <Form.FloatingLabel label={label} className="mb-1">
            <Form.Control
                type={type}
                name={name}
                placeholder={label}
                id={field_id}
                value={value}
                onChange={handleChange}
                isValid={isTouched && !error}
                isInvalid={isInvalid}
                as={as}
                className={className}
                role={role}
                ref={ref}
            />
            <Form.Control.Feedback type="invalid">
                <span>{error}</span>
            </Form.Control.Feedback>
            {!isInvalid && <span className="text-transparent">&#8203;</span>}
            <label htmlFor={field_id}>{label}</label>
        </Form.FloatingLabel>
    )
})

export function TextConfirmedSubmit({
    requiredInput,
    onSubmit
}: {
    requiredInput: string
    onSubmit: VoidFunction
}) {
    const [input, setInput] = useState<string | undefined>(undefined)
    const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined)
    return (
        <Row>
            <Col className="w-200px">
                <FormField
                    handleChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setInput(e.target.value)
                    }
                    error={errorMsg}
                    label="Confirm"
                    name="Confirm"
                    value={input ?? ''}
                    isTouched={input !== undefined}
                />
            </Col>
            <Col xs="auto">
                <Button
                    onClick={() => {
                        if (requiredInput == input) {
                            setErrorMsg(undefined)
                            onSubmit()
                        } else {
                            setErrorMsg(`Your input does not match ${requiredInput}.`)
                        }
                    }}
                >
                    Submit
                </Button>
            </Col>
        </Row>
    )
}

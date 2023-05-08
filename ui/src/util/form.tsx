import { Form } from 'react-bootstrap'
import { HandleChange } from './type'
import { ElementType } from 'react'

export function FormField({
    type = 'text',
    name,
    label,
    value,
    isTouched,
    error,
    handleChange,
    as = undefined,
    className = ''
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
}) {
    const isInvalid = isTouched && !!error
    const field_id = 'formField-' + name
    return (
        <Form.FloatingLabel label={label} className="mb-2">
            <Form.Control
                type={type}
                name={name}
                id={field_id}
                value={value}
                onChange={handleChange}
                isValid={isTouched && !error}
                isInvalid={isInvalid}
                as={as}
                className={className}
            />
            <Form.Control.Feedback type="invalid">
                <span>{error}</span>
            </Form.Control.Feedback>
            {!isInvalid && <span className="text-transparent">&#8203;</span>}
            <label htmlFor={field_id}>{label}</label>
        </Form.FloatingLabel>
    )
}

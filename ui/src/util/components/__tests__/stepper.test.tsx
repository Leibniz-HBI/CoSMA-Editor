/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react'
import { StepHeader, StepTitle } from '../stepper'

describe('stepper title', () => {
    test('active smaller', async () => {
        const { container } = render(<StepTitle idx={1} activeIdx={2} name="test" />)
        const paths = container.getElementsByTagName('path')
        expect(paths.length).toEqual(1)
        expect(paths[0].getAttribute('d')).toEqual(
            // path for filed circle with 1
            'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0ZM9.283 4.002H7.971L6.072 5.385v1.271l1.834-1.318h.065V12h1.312V4.002Z'
        )
    })
    test('active smaller', async () => {
        const { container } = render(<StepTitle idx={0} activeIdx={0} name="test" />)
        const paths = container.getElementsByTagName('path')
        expect(paths.length).toEqual(2)
        // paths for filed circle with 0
        expect(paths[0].getAttribute('d')).toEqual(
            'M8 4.951c-1.008 0-1.629 1.09-1.629 2.895v.31c0 1.81.627 2.895 1.629 2.895s1.623-1.09 1.623-2.895v-.31c0-1.8-.621-2.895-1.623-2.895Z'
        )
        expect(paths[1].getAttribute('d')).toEqual(
            'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-8.012 4.158c1.858 0 2.96-1.582 2.96-3.99V7.84c0-2.426-1.079-3.996-2.936-3.996-1.864 0-2.965 1.588-2.965 3.996v.328c0 2.42 1.09 3.99 2.941 3.99Z'
        )
    })
    test('inactive', async () => {
        const { container } = render(<StepTitle idx={2} activeIdx={0} name="test" />)
        const paths = container.getElementsByTagName('path')
        expect(paths.length).toEqual(1)
        expect(paths[0].getAttribute('d')).toEqual(
            'M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8Zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0ZM6.646 6.24v.07H5.375v-.064c0-1.213.879-2.402 2.637-2.402 1.582 0 2.613.949 2.613 2.215 0 1.002-.6 1.667-1.287 2.43l-.096.107-1.974 2.22v.077h3.498V12H5.422v-.832l2.97-3.293c.434-.475.903-1.008.903-1.705 0-.744-.557-1.236-1.313-1.236-.843 0-1.336.615-1.336 1.306Z'
        )
    })
})

describe('Stepper Header', () => {
    test('renders correctly', async () => {
        const step1 = 'Step Number 1'
        const step2 = 'Step Number 2'
        const { container } = render(
            <StepHeader stepNames={[step1, step2]} activeIdx={0} />
        )
        const elements = container.getElementsByClassName('justify-content-center')
        expect(elements.length).toEqual(1)
        const children = elements[0].children
        expect(children.length).toEqual(3)
        expect(Array.from(children[0].classList)).toEqual(
            'align-self-start ms-2 me-2 col-sm-auto'.split(' ')
        )
        expect(children[0].textContent).toEqual(step1)
        expect(Array.from(children[1].classList)).toEqual(
            'align-self-center col-sm-1'.split(' ')
        )
        expect(Array.from(children[2].classList)).toEqual(
            'align-self-start ms-2 me-2 col-sm-auto'.split(' ')
        )
        expect(children[2].textContent).toEqual(step2)
    })
})

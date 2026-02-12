import { waitFor, screen } from '@testing-library/react'
import { UserEvent } from '@testing-library/user-event'

export async function setDate(user: UserEvent, input: HTMLElement, day: number) {
    await user.click(input)
    const dayButtonList = await waitFor(
        () => {
            return screen.getAllByRole('gridcell')
        },
        { timeout: 3000 }
    )
    expect(dayButtonList.length).toBeGreaterThanOrEqual(28)
    const firstOfMonthIndex = dayButtonList.findIndex(
        (element: HTMLElement) => element.textContent === '1'
    )
    dayButtonList.splice(0, firstOfMonthIndex)
    user.click(dayButtonList[day - 1])
}

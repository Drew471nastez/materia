# Countdown timers in Materia

Materia counts down in several places: the **Countdown timer** and **Countdown badge** blocks in Main product and Featured product, the countdown sections (Countdown flip, Countdown inline, Countdown timer 2 and 3, Countdown popup), the Announcement bar Pro 4 countdown, the hero product badges and the Coming soon page.

## Setting the end date

### Product blocks (Main product, Featured product)

Under **Date setup**:

- **Date and time** (the default): fill **End date** as `YYYY-MM-DD`, then **Hour** (0 to 23), **Minute** and **UTC offset** such as `+02:00`. The timer ends at that exact moment for every visitor, wherever they are.
- **Advanced ISO**: one field, for example `2027-12-31T23:59:59+02:00`.

A timer made before **Date and time** existed keeps its old advanced date until you type a date in **End date**, so nothing changes on a live page by itself.

**Date source** set to **Product field** reads the product's `custom.countdown_timer` field instead, so every product can end at its own time.

### Countdown sections

- Countdown flip and Countdown inline: **End date and time**, `2026-12-31T23:59:00`. Add an offset (`+02:00`) for one moment everywhere; without it the timer counts to that time on each visitor's own clock.
- Countdown timer 2 and Announcement bar Pro 4: **End date** `YYYY-MM-DD` and **End time** `HH:MM`, on the visitor's own clock.
- Countdown timer 3: **Countdown end date** in `MM-DD-YYYY`.
- Coming soon: **Countdown Date**. A date alone ends at midnight UTC at the start of that day; write `2026-12-31T23:59:00+02:00` for an exact moment.

## Daylight saving

A UTC offset is fixed; a time zone is not. Romania is `+03:00` from the last Sunday of March to the last Sunday of October and `+02:00` the rest of the year. Use the offset in force **on the end date**, not today's. For a sale ending 1 December at 23:59 in Bucharest, write `+02:00`.

## What the visitor sees

| Case | Result |
| --- | --- |
| A real date in the future | Days, hours, minutes and seconds count down. |
| Midnight (`00:00`) | Ends at the very start of that day. For the end of a day use 23:59. |
| 29 February | Allowed in leap years (2028, 2032). In other years it is an impossible date. |
| An impossible date (`2026-02-30`, `2026-04-31`, month 13) | The timer is hidden on the live site. In the builder the product blocks say *Choose a valid end date and time*. Browsers would otherwise roll it silently into March. |
| The date has passed | The timer stops at zero, or hides, or shows its ended message, as **When the countdown ends** says. |

## In the builder

A changed date applies as soon as you leave the field. Only that section is drawn again; product media and other sections are left alone. Timers stop counting while the tab is in the background and pick up the right time when you come back.

## Checking it

1. Set the date one or two minutes ahead and watch it reach zero in the builder.
2. Publish, open the live page in a private window and check the same.
3. Set the date back to the real one.

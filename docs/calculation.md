# How the calculation works

All calculations use integer cents. A selected period is inclusive, from its
first month through its last month, with a maximum of 60 months.

For each month:

```text
income = recurring income + one-off income due that month + active trial income
savings contribution = income − everyday spending
net change = savings contribution − bills and reserves − tax reserve
ending balance = previous balance + net change
```

The deadline result is the last balance inside the selected period. The gap is
the target minus that balance, bounded below at zero. Existing savings are added
once, at the start; negative forecast balances are displayed honestly.

## Monthly saving goal and payday plan

The first result is the **total monthly net saving needed**, not just the extra
income that would close a gap:

```text
monthly goal = max(0, target − existing savings − in-period one-off income) / months
```

It rounds up to the nearest cent. In-period one-off income includes an applied
target-month trial; out-of-period receipts do not reduce this amount. The current
monthly average excludes those one-off receipts and deducts spending, dated bills,
reserves and tax. The separate monthly gap is the deadline shortfall divided by
the number of months, rounded up. Trial income remains explicitly labelled.

The payday month selector uses the original forecast rows. For that month, it
shows income, everyday spending, bills plus tax reserves, and the remaining net
saving. It does not spread utility payments across months. Annual insurance and
rates remain monthly reserves under the existing model. Bonus counts only in its
receipt month; the full entered tax reserve stays in the first month. If costs
exceed income, the saving transfer is zero and the required drawdown is shown.
This is a budget allocation based on the entered cash flow, not a bank transfer
or a promise that a shortfall has been solved.

## Choose one bill method

A monthly total is a flat estimate charged once every month. A detailed breakdown
replaces that estimate; both are never charged together. Switching from detail
to total carries a valid breakdown sum into the total field. Selecting a monthly
total for an existing detailed plan deliberately replaces its payment schedule.

In a breakdown, rent, management, phone, internet and other monthly bills recur
each month. Electricity, water and gas use the entered per-payment amount, repeat
interval and next payment month. Their monthly equivalents appear in summaries,
but cash flow deducts the whole payment only when due. Defaults are editable
estimates, not confirmation of a user's actual utility schedule.

Quarterly rates/ground rent and annual insurance are **monthly reserves**, rounded
to cents. They are not presented as their actual payment dates. Insurance can
also be entered as a monthly payment.

## Income and tax

Bonus and one-off income count once, in the chosen month. Additional monthly
income repeats. Amounts should represent cash available to save; if using pretax
amounts, enter an appropriate tax reserve separately. The user-entered tax reserve
is deducted in the first selected month. No tax assessment is inferred.

Optional trial income is included only when applied. A target-month one-off trial
stays in that month even if the chart continues beyond the deadline.

## Goal date and chart

The line continues through the later of the selected deadline or first projected
goal achievement, bounded at 120 months and calendar year 2200. The original
period totals and deadline gap do not change when the chart extends.

Recurring income/spending and selected bill schedules continue. Dated receipts
are not repeated. If the goal is not reached within the supported horizon, the
app says so instead of inventing a date. Reaching the goal in one month does not
promise the balance will stay above it after later bills.

There are no investment returns, inflation assumptions, exchange-rate conversions,
automatic tax calculations or bank transfers. The currency selector changes
formatting only. This is a scenario calculator, not a financial recommendation.

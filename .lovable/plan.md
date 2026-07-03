Replace the `window.open(...).print()` in the Account Detail dialog's Print button with the same download-anchor pattern the Budget uses:

- Build the PDF blob via `pdf(<AccountDetailPdfDocument .../>).toBlob()`
- Create an `<a>` with `href = URL.createObjectURL(blob)` and `download = "AccountDetail-{code}-{yyyy-MM-dd}.pdf"`
- `link.click()` then revoke the object URL

No new tab, no popup, no browser block. File just downloads — exactly like Print Budget.

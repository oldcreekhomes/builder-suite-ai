## Final Step: Swap Publishable Key to Live

Update `src/components/PaywallDialog.tsx` line 17:
- Replace `pk_test_51TL5mD2OJCoyD632I78ZLOABNArQ3j0vjFOIDJxojGuktR4wIGPZeq5HDRlyjtPqNruAa7HDRRQWTmA6N1aKFHck00850Qmh79`
- With `pk_live_51TL5lp2M261MnJZCV9lA2C13cHAdkFVfuFZAWjQN7vLFmmikKEXhV5d8JNghePa3nNwUWfuuFiULGOhnM3cXyLY2002fDEt9S4`

After approval, you're fully live: secret key ✅, webhook secret ✅, publishable key ✅. Run a small real-card test to confirm checkout + webhook delivery (`200` in Stripe Dashboard → live webhook endpoint).

# Health-policy check

Health and wellness apps carry rules that ordinary apps don't. This check finds the points a
person must verify. It never says the app or the plan is compliant, and never gives legal
advice: it lists what to check, why, and who should check it.

## What to look at

1. **Claims** in the store listing, screenshots, ads and planned copy.
   - Wellness claims ("track your sleep", "log your meals") are usually fine.
   - Medical claims (diagnose, treat, predict a condition, replace a doctor, dosage, measure a
     body value with hardware the phone doesn't have) need evidence and extra store review.
     Apple's App Review Guidelines 1.4.1 hold medical apps to a higher bar for accuracy claims.
   - Store metadata must describe the app accurately (Apple 2.3): no features it doesn't have.
   - Subscriptions: price, period and what is included must be clear before purchase
     (Apple 3.1.2).
2. **Health data and advertising.** If the app shares health information with ad platforms
   (for example through an analytics or advertising SDK, or a tracking pixel on screens where a
   person enters health information), that sharing may count as a breach under the US FTC Health
   Breach Notification Rule, as updated in 2024. Flag every planned use of health-screen events
   for ad targeting or measurement.
3. **Store declarations.** Google Play asks health apps to complete a health apps declaration.
   Flag it when the plan changes features or listing text in a way that touches the declaration.
4. **Markets.** Other markets have their own rules (for example health-data rules in the EU).
   Name the markets in the profile and say rules there were not checked, unless the person gave them.

## How to write it

A table in the step file under `## Health-policy check` (S4) or inside
`## External factors and health policy` (S1):

| Point | Where it appears | Why it needs checking | Check by |
|---|---|---|---|
| "Predicts your fertile days" | store description, planned ad | a medical-style prediction claim: Apple 1.4.1 review, evidence needed | the person, with legal or clinical advice |
| Ad SDK events on the symptom-logging screen | current analytics set-up (from the person) | sharing health data with ad platforms: FTC rule risk | the person, with privacy counsel |

Close with one line: "This is a list of points to verify, not a compliance review."
If nothing was found, say what was checked, and that nothing was found in what was read.

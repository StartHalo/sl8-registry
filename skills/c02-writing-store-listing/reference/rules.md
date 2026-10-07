Source: https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information · Apple (App Store Connect Help) · undated page, read 2026-10-07 · platform rules

# Store-listing field limits and metadata rules

| Field | Limit | Source (all read 2026-10-07; none of these pages shows a date) |
|---|---|---|
| Apple name | 30 characters (min 2) | Apple, App Store Connect Help "App information": https://developer.apple.com/help/app-store-connect/reference/app-information/app-information ; App Review Guideline 2.3.7: "App names must be limited to 30 characters" |
| Apple subtitle | 30 characters | same App information page; Apple product page guidance https://developer.apple.com/app-store/product-page/ |
| Apple promotional text | 170 characters; editable without a new version; "does not affect search ranking" | Platform version information page; product-page guidance |
| Apple keywords | **100 bytes**, comma-separated, no spaces after commas | Platform version information: "up to 100 bytes". Product-page guidance says "100 characters". Sources differ: count bytes (non-Latin text uses more) |
| Apple description | 4000 characters, plain text | Platform version information |
| Google Play title | 30 characters | Play Console Help "Create and set up your app": https://support.google.com/googleplay/android-developer/answer/9859152 ; Metadata policy https://support.google.com/googleplay/android-developer/answer/9898842 |
| Play short description | 80 characters | answer/9859152 |
| Play full description | 4000 characters | answer/9859152 |

Play note (answer/9859152): limits count full-width and half-width characters alike.

## Metadata rules (quoted)
- Apple 2.3.7: "don't try to pack any of your metadata with trademarked terms, popular app names, pricing information, or other irrelevant phrases just to game the system"; subtitles "should not ... reference other apps, or make unverifiable product claims." https://developer.apple.com/app-store/review/guidelines/ (undated here)
- Apple 2.3.1(a): promoting "a false price" or services the app does not offer is grounds for removal.
- Apple product-page guidance: subtitle: avoid "world's best app"; description: "Don't add unnecessary keywords"; "Avoid including specific prices"; put accolades "at the end or as promotional text"; first sentence "is the most important". Keywords: no plurals of a singular already included, no category names or "app", no duplicates, no competitor names.
- Google Play Metadata policy: title/icon/developer name: "Don't use emojis, emoticons, or repeated special characters"; no store ranking text ("#1", "App of the year"), no price or promotion ("10% off"), no "Editor's choice"; no ALL CAPS (unless brand name); "Avoid using repetitive or unrelated keywords"; word blocks and word lists are violations; "unattributed or anonymous user testimonials" not allowed in the description; excessive length or repetition can be a violation. The fetched summary did not show whether ranking and price bans extend to the description; check the page before relying on it.
- Play (answer/9859152): repetitive or irrelevant keywords in name or descriptions "can ... result in an app being suspended".

**Script-check note:** 100 bytes is not 100 characters; a character-count check on Apple keywords can pass text that fails.

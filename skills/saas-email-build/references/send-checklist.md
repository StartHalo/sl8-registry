# The send checklist

Sources: Litmus, "The Ultimate Email Checklist" (2022-09-20); Email on Acid, pre-send checklist
(2021-03-02); FTC, CAN-SPAM Act compliance guide (2024-01); Google, Email sender guidelines
(2024-02); Yahoo, sender best practices (2024-02); Mailchimp, Postmark and Litmus on Apple Mail
Privacy Protection. Fill it for this campaign; drop rows that don't apply; never claim compliance.

## Before you send (blocking first)

- A `[TBD]` sender or postal address: what to send the bot to fill it ("Email campaign: Postal
  address: …"), which rebuilds the emails.
- Anything `check.mjs` still fails.

## Your tests (in your own email tool)

- Send a test of every email to yourself; open it in Gmail, Outlook and Apple Mail (phone and
  desktop) and in dark mode.
- Click every link and the button; check the merge tokens became real names (the setup sheet maps
  them), and that an empty first name reads well (set a fallback such as "there").
- Run your tool's spam or inbox-placement test if it has one.
- Check the plain-text version is attached (most tools generate or accept one).

## Deliverability (your sending domain)

- **SPF** and **DKIM** set up for the domain you send from, in your tool's domain settings.
  Google requires at least one for all senders; Yahoo asks for both for bulk senders.
- **DMARC** published for the domain (start with `p=none`). Required by Google and Yahoo for
  bulk senders (5,000+ a day to Gmail), worth having at any size.
- **One-click unsubscribe:** your tool adds the `List-Unsubscribe` headers (RFC 8058); keep the
  visible unsubscribe link the bot put in every footer.
- Send from your own domain, not a free address; keep complaints under 0.3% (aim for 0.1%).
- For a list that hasn't been emailed in months: send to your most engaged contacts first, and
  remove bounces after the first send.

## The law where you send

| Region | What to check yourself |
|---|---|
| US (CAN-SPAM) | Accurate From and subject; your postal address in every email; a working unsubscribe honoured within 10 business days. You are responsible even if a tool or agency sends |
| UK (PECR, UK GDPR) | Individuals need consent or a soft opt-in; company addresses may be emailed with an opt-out; sole traders count as individuals |
| EU (GDPR, ePrivacy) | Consent or a lawful basis for each contact; check your country's rules |
| Canada (CASL) | Express or implied consent before you send; identification and an unsubscribe in every email |

## Sending

You press send, from your own tool, when the items above are done. The bot never sends,
schedules or uploads anything.

## After you send

Track the conversion event first (demos booked, trials started, replies), then clicks,
unsubscribes, complaints and bounces. Opens are inflated by Apple Mail Privacy Protection: report
them, don't judge by them. Send the figures back as "Email campaign: results for <campaign>: …".

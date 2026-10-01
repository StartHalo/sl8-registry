# Merge tokens in each email tool

The pack uses two neutral tokens. The founder replaces them with their tool's own tags (find and
replace in the HTML and text files, or in the tool's editor). Checked against each vendor's own
help pages on 2026-10-01; a cell marked "check in your tool" was not confirmed there.

| Tool | `{{first_name}}` becomes | With a fallback for an empty name | `{{unsubscribe_url}}` becomes | Bringing custom HTML in |
|---|---|---|---|---|
| Mailchimp | `*\|FNAME\|*` | `*\|IF:FNAME\|*Hi *\|FNAME\|*,*\|ELSE:\|*Hi there,*\|END:IF\|*` (no inline default; a conditional) | `*\|UNSUB\|*` (required in custom templates) | Email templates → Code your own: paste, import an HTML file, or a ZIP under 1 MB (Standard plan or higher) |
| Kit (ConvertKit) | `{{ subscriber.first_name }}` | `{{ subscriber.first_name \| strip \| default: "there" }}` (body only, not subjects) | `{{ unsubscribe_url }}` | An HTML email template, which must also hold `{{ message_content }}` and `{{ address }}`: put the email's body inside your template, or paste per broadcast |
| HubSpot | `{{ contact.firstname }}` | `{{ contact.firstname\|default("there", true) }}` (the `true` covers empty names) | `{{ unsubscribe_link }}` | A coded email template (HTML + HubL, Marketing Hub Pro or Enterprise), or "upload external email template", which rebuilds the design with AI (check in your tool) |
| Brevo | `{{ contact.FIRSTNAME }}` | `{{ contact.FIRSTNAME\|default:"there" }}` | `{{ unsubscribe }}` | New campaign → HTML custom code: paste the HTML |
| ActiveCampaign | `%FIRSTNAME%` | no inline fallback: set a default value on the First name field | `%UNSUBSCRIBELINK%` | Email → HTML builder: paste the HTML |
| Customer.io | `{{customer.first_name}}` | `{{customer.first_name \| default: "there"}}` | `{% unsubscribe_url %}` | Code editor or a layout with `{{content}}` (check in your tool) |
| Loops | `{firstName}` | no inline fallback: set it in the editor's side panel | `{unsubscribe_link}` | Takes a ZIP of MJML (`index.mjml` + `img/`), not HTML: rebuild the email in Loops' editor from the HTML preview, or paste the text version |
| Any other tool | its first-name tag | its default or fallback setting | its unsubscribe-link tag | "Code your own", "custom HTML" or "HTML editor" |

Sources: mailchimp.com/help (merge tags cheat sheet; conditional merge tag blocks; import a custom
HTML template) · help.kit.com (Liquid personalization FAQ; customize unsubscribe; HTML templates)
· developers.hubspot.com/docs/cms/reference/hubl (variables, filters) · help.brevo.com (articles
360001008200, 4405381108626, 209553645, 4672127581074) · help.activecampaign.com (220709307,
115001060664, 115001398790) · docs.customer.io/journeys/liquid/tag-list · loops.so/docs
(personalizing emails; uploading custom email).

In `sequence-setup.md`, put the founder's tool first (from the profile), show its two
replacements and its fallback, then the rest of the table.

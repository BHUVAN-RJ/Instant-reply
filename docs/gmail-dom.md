# Gmail DOM notes

Observed from a live thread view (September 2026). Gmail class names are obfuscated and can change; prefer attributes where they exist.

## Thread

| What | Selector | Notes |
|---|---|---|
| Subject and thread id | `h2.hP[data-thread-perm-id]` | `data-thread-perm-id="thread-f:<id>"` is the stable key for sessions. `data-legacy-thread-id` is the hex form. |
| Main toolbar | `[gh="mtb"] .G-tF` | Sticky gray toolbar (Archive, Delete...), present in list and thread views. No longer used; the on/off switch moved into the reply box. |
| Top right thread actions | `.bHJ` | Holds Expand all, Print all, In new window. |
| Expand all button | `.bHJ button[aria-label="Expand all"]`, `button[jsname="tRarif"]` | Label is localized; jsname is the fallback. |
| Message list | `div[role="list"] > div[role="listitem"]` | One per message. `aria-expanded` tells collapsed vs open. |
| Expanded message | `div.adn[data-message-id]` | Collapsed messages (`div.adf`) only carry a truncated snippet (`.iA.g6`), so expand before reading. |
| Sender | `span.gD[email][name]` | |
| Recipients | `span.g2[email]` | `name="me"` marks the user. |
| Timestamp | `span.g3[title]` | `title` holds the full date. |
| Body | `div.a3s` | Read with `innerText` so `display:none` preheaders are skipped. Remove `.gmail_quote` (quoted history) and security banners (Proofpoint `pfptBanner`) before use. |

The reply box's hidden `input[name="uet"]` holds the quoted conversation as HTML; it is the fallback when messages cannot be read. The account email is taken from the tab title.

## Reply box

| What | Selector | Notes |
|---|---|---|
| Reply or compose box | `div.aoI[role="region"][data-compose-id]` | One per open reply or compose window. |
| Thread id | `input[name="rt"]` inside the box | Value `#thread-f:<id>`, matches the subject's `data-thread-perm-id` after stripping `#`. Empty for a new email. |
| Draft id | `input[name="draft"]` | `#msg-a:r<id>`, usable as the key for new emails. |
| Editor | `[contenteditable="true"][role="textbox"]` | `aria-label="Message Body"` is localized, so match on role. |
| Subject | `input[name="subject"]` | |
| Signature | `.gmail_signature`, `[data-smartmail="gmail_signature"]` | Left untouched when reading or writing the box. |
| Send group | `.dC` | Holds Send (`.T-I.aoO`, tooltip "Send (⌘Enter)") and the arrow (`.T-I.hG`, "More send options"). Refactor mounts right after it; so does the switch while off. |
| Reply card | `td.I5` | The visible white card. `div.aoI` > `table.aoP.HM` > `tr` > `td.I5`. The box is wider than the card (it holds the avatar column). |
| Body table | `td.I5 > table.iN` | Everything in the card above it is the To line (collapsed recipients `.aoD.hl`, "Type of response" button). |
| Editor chain | `table.iN` ... `td.Ap` > `div.Ar.Au` > `div.aO7` > `div.Am` | `td.Ap` has its own white background. |
| Footer buttons | `[role="button"][data-tooltip]` | Tooltips seen: Attach files, Insert link (⌘K), Insert emoji (⌘⇧2), Insert files using Drive, Insert photo, Insert signature, Set up a time to meet, More options, Discard draft (⌘⇧D). Buttons are `div.wG.J-Z-I` in `td` cells; the switch gets its own `td` before Discard's. The formatting toggle (`.J-Z-I-KO`) has no label. |
| Avatar | left of `td.I5` | The user's round avatar; not reliably inside `div.aoI`, so it is found by position. |

Measured on one live box (September 2026): card 621x289, To line about 52px tall, body table starting 52px below the card top.

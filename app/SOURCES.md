# Sources and implementation boundaries

## Useful engagement and lower effort (23 September 2026)

- Nielsen, *Progressive Disclosure*, Nielsen Norman Group: https://www.nngroup.com/articles/progressive-disclosure/ . Keep frequent actions immediately available; defer occasional controls. Too many sequential screens can itself create friction. Applied here by opening a Today suggestion in one tap and removing the practice introduction from the normal learning path.
- Budiu, *Memory Recognition and Recall in User Interfaces*, Nielsen Norman Group (2024): https://www.nngroup.com/articles/recognition-and-recall/ . Visible, recognisable choices reduce the need to remember hidden functionality. Home now previews the suggested action; labelled navigation remains visible and an unfinished practice card resumes locally.
- Nielsen Norman Group, *User Control and Freedom*: https://www.nngroup.com/articles/user-control-and-freedom/ . Keep exits and changes available. Check-in and personalisation remain optional; users can choose a different need, adjust circumstances, change approach or undo completion.
- Ryan & Deci (2000), *Self-Determination Theory and the Facilitation of Intrinsic Motivation, Social Development, and Well-Being*: https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf . Supports autonomy and competence as motivational needs. This is a general framework, not a measured retention effect for Steady. No streak pressure, reward loops or added notifications were introduced.

These are design rationales, not proof that these changes increase retention. The immediate verifiable outcomes are fewer navigation taps, preserved work, understandable icons and clear user control. Steady has no usage analytics; usefulness and real-world benefit require user feedback over time.

## Guidance

- Gollwitzer & Sheeran (2006), *Implementation Intentions and Goal Achievement: A Meta-analysis of Effects and Processes*. https://doi.org/10.1016/S0065-2601(06)38002-1 . Supports specific if–then planning. Steady’s exact action cards are practical adaptations, not validated interventions.
- NCCIH, *Relaxation Techniques: What You Need To Know*. https://www.nccih.nih.gov/health/relaxation-techniques-what-you-need-to-know . Evidence varies by technique and setting. Comfortable pauses are optional and not presented as treatment.
- Roediger & Karpicke (2006), *Test-Enhanced Learning*. https://pubmed.ncbi.nlm.nih.gov/16507066/ ; DOI https://doi.org/10.1111/j.1467-9280.2006.01693.x . The experiments support retrieval of studied material for later retention. They do not directly validate Steady’s multiple-choice cards, its 1/3/7-day review schedule, or improvements in general intelligence. The app labels this a supported principle rather than an efficacy claim for Steady.
- Remaining action cards are labelled “Personal experiment.” No clinical efficacy is asserted. Their local rankings use subjective feedback, not causal estimates.

The general guidance engine is a fixed editorial library with deterministic ranking, not a language model. It adapts action wording to a chosen goal; adjusts duration and preparation to time, energy, surroundings and obstacles; adds framing for selected aspirations, values and worldview; and ranks alternatives using explicitly rated past outcomes. Interests and difficulty control learning cards. It does not infer a complete understanding of a person, forecast life outcomes, or validate beliefs automatically. Scripture matching uses a few keywords and category scores, so its explanations name the matched word or identify the fallback instead of claiming semantic understanding.

## Scripture

Seven complete chapter pairs and their selected passages are bundled with primary publisher links to eBible.org (`eng-web`, the Classic World English Bible, and `eng-asv`, the American Standard Version of 1901). Exact publisher URLs are retained in `public/chapters.js` and `public/scriptures.js`. Whitespace is normalised, and navigation, footnote links and editorial headings are excluded. Context paragraphs are Steady’s editorial text, separate from the quoted verses.

Audit on 24 September 2026: all fourteen selected quotations and verse references were checked against eBible.org. The ASV 1 Thessalonians HTML endpoint was unavailable to the research tool, so 5:18 was checked against the publisher’s PDF, https://ebible.org/pdf/eng-asv/eng-asv_1TH.pdf (page viii). No selected quotation needed correction. Automated integrity checks confirm the 372 bundled chapter verses have consecutive numbering, the expected chapter lengths, matching translation/source links, and exact agreement between every selected quotation and its chapter verse. This is not a claim that this audit independently re-transcribed or theologically reviewed every verse in all fourteen chapter versions.

Full-text lookup update (25 September 2026): `public/bible-data.js` contains the 66 shared Old/New Testament books in Classic WEB and ASV (1,189 chapters per translation). Additional deuterocanonical books are not included. `public/bible-sources.json` records source archives, retrieval date, book coverage and SHA-256 checksums; `tools/import-bible.cjs` is the reproducible importer. The importer retains numbered verse text, not publisher headings or footnotes. Empty main-text slots caused by manuscript variants are explicitly disclosed, never filled with generated text. Existing curated chapter wording is checked for exact agreement with the larger corpus. Lookup is local and no question is transmitted to the publisher.

Both publisher licence notices were checked on 25 September 2026: https://ebible.org/eng-web/copyright.htm and https://ebible.org/eng-asv/copyright.htm. They identify the texts as public domain. World English Bible is the publisher's trademark; Steady preserves its quotation wording and distinguishes its own notes from Scripture.

The nine reading notes in `public/scripture-study.js` cite Matthew 7 and 13, Romans 1 and 8, John 3 and 13, Jeremiah 29, Philippians 4, and the official USCCB Hebrews introduction (https://bible.usccb.org/bible/hebrews/0). Notes distinguish direct textual observations from interpretation and acknowledge uncertainty where relevant. Each supports one prepared deeper follow-up; this is not open-ended theological conversation. No note infers a reader's beliefs or a divine explanation for their circumstances.

World English Bible: https://ebible.org/eng-web/webfaq.htm
American Standard Version (1901): https://ebible.org/details.php?id=eng-asv

This is a small thematic library, not a full Bible search or a claim to discern divine instruction. Users can choose a different theme, read the complete chapter locally, or open the publisher’s page. The app never sends notes to an API.

Scripture Help update (25 September 2026): 18 situation-specific editorial guides reuse exact ranges from these seven chapter pairs. Quotes are assembled from the bundled verse arrays, never written or generated as new Scripture. Automated tests verify all 36 guide/translation combinations, references and full-chapter range highlighting. Context was checked against the primary WEB chapter pages: Matthew 7 and 11, James 1, Galatians 6, 1 Thessalonians 5, Psalm 34 and Ephesians 4. Editorial context and optional practical responses are visibly separate from quotations. The phrase matcher is deterministic and bounded, not conversational AI; it does not answer arbitrary theological questions or guarantee recognition of distress. New unmatched requests ask for clarification. Existing saved passages remain stable.

Human-support wording is informed by Samaritans, [What to do if someone you know is suicidal](https://www.samaritans.org/how-we-can-help/support-and-information/worried-about-someone-else/what-do-if-someone-you-know-suicidal/), and the NHS, [Where to get urgent help for mental health](https://www.nhs.uk/nhs-services/mental-health-services/where-to-get-urgent-help-for-mental-health/), checked 25 September 2026. The app uses general local-emergency/crisis-support wording rather than guessing the user's country. This is not an emergency service, clinical assessment or exhaustive risk detector. Scripture is offered alongside human support, never instead of it.

Urgent replies offer an optional external link to [Find A Helpline](https://findahelpline.com/), a country-selectable directory of crisis and other support lines, checked 25 September 2026. It opens only on the reader's action; no note, inferred topic, country or other query data is included in the URL. Matching, passages and guidance themselves require no network requests.

The optional Scripture reflection choices and short prayers are Steady's editorial writing. They invite a response to the passage's existing chapter context; they are not quotations, clinical advice, or claims about what God is directing an individual to do. Reflection can be as simple as sitting with the passage. A saved choice records reflection, not completion of the suggested real-world action.

## Fonts

Locally bundled from Fontsource packages, with SIL Open Font License files in `public/fonts`:

- OpenDyslexic, `@fontsource/opendyslexic` 5.2.5, regular and bold Latin files.
- DM Sans, `@fontsource-variable/dm-sans` 5.2.8, Latin variable file.
- Manrope, `@fontsource-variable/manrope` 5.2.8, Latin variable file.

OpenDyslexic is an optional preference, with no promise that one typeface works best for every reader.

## Optional charity links (checked 24 September 2026)

These are optional independent organisations, not endorsements of every policy or formal partnerships. Donations are processed by the organisations, not Steady.

- World Vision: https://www.wvi.org/about-us and https://www.wvi.org/about-us/our-structure ; donation destination https://www.wvi.org/donate . Christian relief organisation serving across faiths.
- Mercy Ships: https://www.mercyships.org/our-mission/ and the official website's nonprofit registration footer; donation destination https://www.mercyships.org/?form=donate ; regional offices https://www.mercyships.org/international/ . Free surgery and local healthcare training.
- WaterAid: https://www.wateraid.org/global/about-us/how-we-are-run ; donation destination https://www.wateraid.org/global?form=donate . International nonprofit federation focused on water, sanitation and hygiene.
- Doctors Without Borders / MSF: https://www.msf.org/donate and https://www.msf.org/who-we-are . Nonprofit humanitarian medical work; donation page selects regional offices.

Scripture-linked practical actions are Steady's editorial applications of the bundled passages, not evidence-tested interventions or divine instructions. Feedback records the user's own experience and does not establish causality.

'use strict';
// Editorial reading notes. They describe the cited text, not a personal message
// from God. The complete Bible text lives separately and is never generated.
const SteadyStudy = (() => {
  const notes = {
    parables: {
      reference:'Matthew 13:10-17',
      title:'Why did Jesus teach in parables?',
      copy:'The disciples ask this very question in Matthew 13. Jesus connects parables with receiving the mysteries of the kingdom, but also with hearing without understanding. His quotation of Isaiah makes this more demanding than stories made easy. Read the sower’s story and its explanation together (13:1–23). Christians differ on how to understand the relationship between revelation, hardened hearts and judgment here.',
      more:'Notice the movement of Matthew 13: first the story of the sower (1–9), then the disciples’ question (10–17), then Jesus’ explanation (18–23). The different soils describe different responses to the message, including pressure, worry and wealth. This helps explain why hearing a story is not the same as understanding it. The passage does not give Steady a way to diagnose someone’s heart or explain why a particular person struggles with belief.',
      source:'https://ebible.org/eng-web/MAT13.htm'
    },
    romans: {
      reference:'Romans 1:1-7',
      title:'Who wrote Romans, and to whom?',
      copy:'The letter identifies its sender as Paul (1:1) and addresses those in Rome who are loved by God and called to be saints (1:7). Paul says he has wanted to visit them and hopes for mutual encouragement (1:8–15). This is a letter to a community, not a set of isolated sayings.',
      more:'Read Romans 1:8–17 after the greeting. Paul thanks God for the readers, describes his wish to visit, and says that encouragement would go both ways (11–12). He then introduces the gospel as God’s power for salvation, naming both Jew and Greek (16–17). These are useful signposts for the letter’s argument. They do not, on their own, settle every later question about faith, works or predestination.',
      source:'https://ebible.org/eng-web/ROM01.htm'
    },
    john3: {
      reference:'John 3:14-18',
      title:'John 3:16 in context',
      copy:'The chapter begins with Nicodemus visiting Jesus at night and asking about new birth. Verses 14–21 connect the Son being lifted up with life, God’s love, belief and judgment. Verse 16 presents God’s giving of the Son; verse 17 describes his saving purpose. Read both alongside 18–21, where belief and coming into the light matter too. This is the chapter’s Christian claim, not an assumption about what its reader already believes.',
      more:'Verses 14–15 compare the Son being lifted up with Moses lifting up the serpent in the wilderness. Verse 16 develops the themes of God’s love, the giving of the Son and life through belief. Verses 17–21 then hold together salvation, judgment and the response to light. Keeping those parts together avoids reducing the verse either to a slogan with no response, or to condemnation detached from the saving purpose described in verse 17.',
      source:'https://ebible.org/eng-web/JHN03.htm'
    },
    romans8: {
      reference:'Romans 8:26-30',
      title:'Romans 8:28 in context',
      copy:'Paul is speaking about hope amid suffering, not a life without suffering. Earlier in Romans 8, creation and believers groan (18–25), and the Spirit helps in weakness (26–27). Verse 28 speaks of God working for good for those who love him; verse 29 connects God’s purpose with becoming like his Son. It is not a promise that every event is good, or that a painful situation will quickly turn into success.',
      more:'Follow the chapter’s sequence: suffering and patient hope (18–25), help when words for prayer fail (26–27), God’s purpose (28–30), and assurance of love through hardship (31–39). Verse 35 still names real dangers; they are not erased by verse 28. Christians differ over the foreknowledge and predestination language in 29–30. The passage does not identify why a particular tragedy happened or authorize someone to call another person’s harm good.',
      source:'https://ebible.org/eng-web/ROM08.htm'
    },
    washingFeet: {
      reference:'John 13:12-17',
      title:'Why did Jesus wash the disciples’ feet?',
      copy:'In John 13, Jesus washes his disciples’ feet during supper, before his betrayal. He then explains the act: if their Lord and Teacher has served them this way, they should serve one another (12–17). His exchange with Peter also concerns receiving what Jesus does for him (6–10). The story joins Jesus’ authority to humble service; it is more than advice to appear modest. Read the act and his explanation together.',
      more:'John first places the act within Jesus’ love for his own (13:1). Peter resists being washed, and Jesus says receiving this matters for sharing in him (6–10). Afterward Jesus gives the disciples an example to follow (12–17). Later, his command to love one another echoes that pattern (34–35). Christians differ over whether literal foot-washing should be a continuing church practice, but the text explicitly calls the disciples to serve one another.',
      source:'https://ebible.org/eng-web/JHN13.htm'
    },
    hebrewsAuthor: {
      reference:'Hebrews 1:1-4',
      title:'Who wrote Hebrews?',
      copy:'Hebrews does not name its author. For a long time people linked it with Paul, but that link is doubted and should not be stated as certain. The ending mentions Timothy (13:23), which is a clue about the writer’s circle, not proof of a name. The honest answer is that the author is unknown. The opening itself begins with God speaking through the Son, rather than with a named sender’s greeting.',
      more:'Compare Hebrews 1:1–4 with the named greeting in Romans 1:1–7. Hebrews starts directly with its message. Its closing remarks mention Timothy and greetings from people associated with Italy (13:23–24), but still do not identify the writer. Proposed names are hypotheses, not facts stated by the document. Uncertainty about authorship should be kept distinct from explaining what a particular passage actually says.',
      source:'https://bible.usccb.org/bible/hebrews/0'
    },
    psalm23: {
      reference:'Psalm 23:1-4',
      title:'Psalm 23 in context',
      copy:'This psalm pictures God as a shepherd who provides, guides and accompanies. Green pastures and still waters come before the valley of the shadow of death; the psalm does not promise a life without dark valleys. The comfort it names is presence (“you are with me”) alongside rod and staff, not an explanation of why a particular hardship happened.',
      more:'Read the whole psalm, not only verse 4. It moves from provision (1–2) through guidance and presence in difficulty (3–4) to a table prepared in the presence of enemies and a full cup (5), ending with goodness and mercy followed by dwelling in God’s house (6). Christians often read it at funerals and in times of fear. It does not set a timetable for relief or replace practical support.',
      source:'https://ebible.org/eng-web/PSA023.htm'
    },
    jeremiah29: {
      reference:'Jeremiah 29:10-14',
      title:'Jeremiah 29:11 in context',
      copy:'This promise is part of Jeremiah’s letter to people exiled from Jerusalem to Babylon, not an immediate personal success forecast. The surrounding instructions are to build homes, plant, and seek the city’s welfare (4–7); the promised return follows a long wait (10). Verse 11 belongs to that hope of restoration. It can be read as Christian encouragement, but its original setting should not be replaced with a guarantee about someone’s career, health or timetable.',
      more:'Read the letter’s address in verses 1–4 before the familiar promise. Verses 8–9 warn against misleading prophecy; verse 10 names seventy years rather than a quick escape. Verses 12–14 speak of seeking God and being gathered back from exile. Together they locate the hope within a community’s long experience of displacement. Steady cannot use this passage to predict the outcome or timing of an individual reader’s plans.',
      source:'https://ebible.org/eng-web/JER29.htm'
    },
    philippians4: {
      reference:'Philippians 4:10-14',
      title:'Philippians 4:13 in context',
      copy:'Paul has just described learning contentment both in plenty and in need, including hunger (11–12). The strength he speaks of in verse 13 belongs to those changing circumstances, not a guarantee of winning or achieving anything imaginable. He immediately thanks the Philippians for sharing his trouble (14). Dependence on Christ and receiving practical help appear together here; needing support is not presented as failed faith.',
      more:'The paragraph begins with thanks for renewed concern (10), moves through contentment in contrasting conditions (11–13), and returns to the Philippians’ support (14–18). Paul does not say that his needs were unreal. He names hunger and hardship while valuing their gifts. Read verse 13 inside that exchange: it concerns strength in the circumstances he describes, not a test of whether someone believes strongly enough to get a chosen result.',
      source:'https://ebible.org/eng-web/PHP04.htm'
    },
    judging: {
      reference:'Matthew 7:1-5',
      title:'What does “Don’t judge” mean here?',
      copy:'Matthew 7 begins with a warning about judging others and the measure used in doing so. Jesus then describes someone noticing a speck in another person’s eye while ignoring a beam in their own (3–5). The emphasis is on hypocrisy and examining oneself before trying to correct another person. Later in the chapter he still asks listeners to recognize false prophets by their fruit (15–20), so the chapter does not remove all discernment.',
      more:'Verse 5 describes dealing with one’s own beam first, so that one can see clearly to help with the other person’s speck. That sequence matters: self-examination precedes correction. Read it beside the chapter’s warning about false prophets (15–20), rather than using a single line to forbid recognizing harm. This note is about the passage’s argument, not permission to shame someone or pressure them to remain in an unsafe relationship.',
      source:'https://ebible.org/eng-web/MAT07.htm'
    },
    grace: {
      reference:'Ephesians 2:8-10',
      title:'Grace in Ephesians 2',
      copy:'Paul describes salvation in Christ as God’s gift, received through faith rather than earned by good works (8–9). Verse 10 then speaks of good works as the life that follows; it does not make them the price of grace. This is what grace means in this passage, not a complete account of every way the Bible uses the word.',
      more:'Read verses 1–10 together. Paul first describes a movement from death to life and grounds it in God’s mercy and love (4–5). The contrast between gift and boasting in verses 8–9 matters, as does verse 10: grace is not presented as permission to stop caring how we live. The text does not give Steady grounds to measure a particular person’s standing with God.',
      source:'https://ebible.org/eng-web/EPH02.htm'
    },
    faith: {
      reference:'Hebrews 11:1-13',
      title:'Faith in Hebrews 11',
      copy:'Hebrews portrays faith as trust in what God has promised, lived out before the outcome is visible. Abraham sets out without knowing where he will go (8), and verse 13 says some died without receiving the promises. This chapter is not a guarantee of quick results or a way to dismiss someone’s honest questions.',
      more:'The opening speaks of hope and what is not seen (1–3), then gives examples of people acting on trust. Read beyond verse 13 too: the chapter includes both deliverance and severe hardship. Its examples do not make pain evidence that a person lacks faith, nor do they tell Steady what will happen in an individual life.',
      source:'https://ebible.org/eng-web/HEB11.htm'
    },
    forgiveness: {
      reference:'Ephesians 4:25-32',
      title:'Forgiveness in Ephesians 4',
      copy:'Paul addresses a Christian community, joining truth-telling and constructive speech with kindness and forgiveness grounded in God’s forgiveness in Christ (32). This call does not require silence about harm, renewed trust, reconciliation, or remaining in an unsafe situation.',
      more:'The passage asks people to speak truth (25), deal with anger without letting it become destructive (26–27), and use words that build others up (29). Forgiveness appears within those practices, not as an instruction to pretend harm did not happen. The text does not specify a timetable for recovery or require someone to restore access to a person who hurt them.',
      source:'https://ebible.org/eng-web/EPH04.htm'
    },
    wisdom: {
      reference:'James 1:2-8',
      title:'Wisdom in James 1',
      copy:'James writes to believers facing trials and invites anyone who lacks wisdom to ask God, who gives without reproach (5). The surrounding verses call for steadiness in trust. This is not a method for getting an instant answer or proof that honest uncertainty is a personal failure.',
      more:'Verses 2–4 connect testing and endurance before the invitation to ask for wisdom. Verses 6–8 warn against divided trust; they are not a way for Steady to diagnose why a particular decision feels hard. Later in the chapter, James also calls people to listen carefully and put what they hear into practice (19–22).',
      source:'https://ebible.org/eng-web/JAS01.htm'
    },
    love: {
      reference:'1 Corinthians 13:4-7',
      title:'Love in 1 Corinthians 13',
      copy:'Paul describes love by its character: patient, kind, without envy or pride, keeping no record of wrongs (4–5). Love rejoices with the truth and endures (6–7). This is a portrait of how love acts, written to a divided community, not a test for scoring a relationship or a promise about romance.',
      more:'Read chapters 12–14 together. Paul places this portrait between teaching on spiritual gifts and orderly worship: gifts without love gain nothing (13:1–3). The chapter ends with faith, hope and love remaining, love the greatest (13). Christians apply this to marriage, friendship and church life; the passage itself addresses a community.',
      source:'https://ebible.org/eng-web/1CO13.htm'
    },
    lordsprayer: {
      reference:'Matthew 6:9-13',
      title:'The Lord’s prayer in Matthew 6',
      copy:'Jesus gives this prayer after warning against showy or empty repetition (5–8). It addresses God as Father, seeks his name, kingdom and will, then asks for daily bread, forgiveness as forgiven, and deliverance from temptation (9–13). It is a pattern for prayer, not magic words whose wording earns an answer.',
      more:'Luke records a shorter form of this teaching (Luke 11:1–4), given when the disciples ask to be taught. Matthew sets it within the Sermon on the Mount. The petitions move from God’s honour to daily needs to relationships and protection. Verses 14–15 return to forgiving others. The shared petitions matter more than any one translation.',
      source:'https://ebible.org/eng-web/MAT06.htm'
    },
    psalm91: {
      reference:'Psalm 91:1-2',
      title:'Psalm 91 on refuge',
      copy:'The psalm opens by calling God refuge and fortress for whoever dwells with him (1–2). Later verses speak of shelter under wings, a shield of faithfulness, and rescue in trouble (4, 14–15). This is language of trust in danger, not a guarantee that no harm will ever come; read the whole psalm rather than one line alone.',
      more:'Verses 5–8 name night terrors, arrows and plague without denying their reality. Verses 11–12 speak of angelic guard; the Gospels show these words misused to demand spectacle. Verses 14–16 answer with presence, deliverance and honour rather than a promise to keep all harm away. The psalm comforts through promised nearness, not control over events.',
      source:'https://ebible.org/eng-web/PSA091.htm'
    },
    romans3: {
      reference:'Romans 3:23-24',
      title:'“all have sinned” in Romans 3',
      copy:'Paul writes that all have sinned and fall short of God’s glory (23), and are justified freely by his grace through Christ (24). The surrounding verses present this as shared need and gift, apart from works of the law (21–22, 28). It is not a ranking of sinners or permission to stop caring how we live.',
      more:'Read 3:21–31 together. Paul argues that God’s righteousness comes through faith for all who believe, with no distinction (22–23). Boasting is excluded (27); God is God of Gentiles as well as Jews (29–30). The passage establishes shared need and shared grace. It does not identify anyone’s particular standing.',
      source:'https://ebible.org/eng-web/ROM03.htm'
    },
    creation: {
      reference:'Genesis 1:1-5',
      title:'Creation in Genesis 1',
      copy:'Genesis opens with God creating the heavens and the earth (1). Light is spoken into darkness and called good; evening and morning mark the first day (3–5). The chapter presents creation as ordered and purposeful. Christians differ over its days and timescales; the text itself names God as maker, not a mechanism.',
      more:'The chapter proceeds through sky, land, vegetation, lights, creatures and humanity (6–27), with repeated approval and a final “very good” (31). Humanity is made in God’s image and put in charge of caring for the earth (26–28). Read it as the Bible’s opening claim about who creates and why it matters, distinct from settling questions Steady cannot answer.',
      source:'https://ebible.org/eng-web/GEN01.htm'
    },
    doubt: {
      reference:'Mark 9:24',
      title:'Doubt in Mark 9',
      copy:'A father asking Jesus for his son’s healing says he believes and asks for help with his unbelief in the same breath (24). Jesus does not turn him away for the doubt. The story holds honest uncertainty and a real request together, without making doubt the same as settled refusal.',
      more:'Read verses 14–29 together. The disciples could not help the boy, the father describes long suffering, and Jesus speaks of all things being possible for one who believes (23). The father’s cry answers that call honestly. The passage welcomes struggling trust; it does not celebrate doubt as an end point or shame it as failure.',
      source:'https://ebible.org/eng-web/MRK09.htm'
    },
    supper: {
      reference:'1 Corinthians 11:23-26',
      title:'The Lord’s supper in 1 Corinthians 11',
      copy:'Paul passes on what he received: on the night of betrayal Jesus took bread and wine as his body and blood, asking his followers to repeat the meal in remembrance of him (23–26). Churches practice this differently. The passage centers remembrance and Christ’s death, not a test of worthiness to approach.',
      more:'Read verses 17–34 together. Paul corrects a divided meal where some go hungry, then recalls the words of institution and their meaning: proclaiming the Lord’s death until he comes (26). Self-examination here concerns care for others at the table (28–29). The text does not settle every church disagreement about method, age, or timing.',
      source:'https://ebible.org/eng-web/1CO11.htm'
    },
    baptism: {
      reference:'Romans 6:3-4',
      title:'Baptism in Romans 6',
      copy:'Paul describes baptism as burial and rising with Christ: dying to the old life to walk in newness of life (3–4). The passage concerns what baptism means for those baptized into Christ. It does not settle every church disagreement about method, age, or timing.',
      more:'Read 6:1–14 together. Paul answers whether grace means continuing in wrongdoing: baptism joins believers to Christ’s death and resurrection, so the old self no longer rules (5–7). The chapter then urges offering oneself to God rather than to wrong (12–14). Meaning and practice belong together here.',
      source:'https://ebible.org/eng-web/ROM06.htm'
    },
    worry: {
      reference:'Philippians 4:6-7',
      title:'Worry in Philippians 4',
      copy:'Paul tells the Philippians not to be anxious but to bring requests to God with thanksgiving (6). The peace of God, beyond understanding, will guard hearts and minds (7). This is an invitation to prayer in anxiety, not a claim that worry ends on command or that anxious people lack faith.',
      more:'Read verses 4–9 together. Rejoicing, gentleness and prayer come before the promise of peace; right thinking and practiced calm follow it (8–9). Paul writes this from need himself, and thanks the Philippians for real help (10–14). The passage joins prayer, community support and daily practice.',
      source:'https://ebible.org/eng-web/PHP04.htm'
    },
    strength: {
      reference:'2 Corinthians 12:9',
      title:'Strength in weakness in 2 Corinthians 12',
      copy:'Paul reports Christ’s answer to his repeated prayer: grace is sufficient, and power is made perfect in weakness (9). Paul therefore accepts weakness as the place where Christ’s strength shows. The passage does not explain why a particular hardship was given or promise its quick removal.',
      more:'Read verses 1–10 together. Paul describes visions he will not boast about, then a thorn that keeps him from pride (7). Three prayers meet one answer about grace (8–9). Strength here is Christ’s, shown through human limits. The text comforts without diagnosing anyone’s situation.',
      source:'https://ebible.org/eng-web/2CO12.htm'
    },
    trust: {
      reference:'Proverbs 3:5-6',
      title:'Trust in Proverbs 3',
      copy:'The proverb calls for trusting the Lord with the whole heart rather than leaning on one’s own understanding (5). In all ways acknowledge him, and he will direct the paths (6). This commends dependent trust over self-reliance; it is not a promise that every plan made with good intentions succeeds.',
      more:'Read verses 1–12 together. The surrounding sayings join loyalty and kindness, honest gain, and accepting discipline with trust (3–4, 9–12). Proverbs offer general wisdom for life, not guarantees for each case. Trust here means bringing decisions to God rather than deciding alone.',
      source:'https://ebible.org/eng-web/PRO03.htm'
    },
    'person-jesus': {
      reference:'John 1:1-3',
      title:'Who is Jesus?',
      copy:'Jesus of Nazareth is presented in the Gospels as God’s Son and promised Messiah, the Christ. John’s Gospel opens by calling him the Word who was with God and was God, through whom all things were made (1–3). Christians believe his death and resurrection save. This states the claim; it does not argue it.',
      more:'Read John 1:1–18 together. The passage moves from the Word’s standing before creation (1–2) through making all things (3), life and light (4–5), witness (6–8), rejection and welcome (10–12), to the Word becoming flesh (14). Verse 18 closes with the Son making God known.',
      source:'https://ebible.org/eng-web/JHN01.htm'
    },
    'person-moses': {
      reference:'Exodus 3:10',
      title:'Who was Moses?',
      copy:'Moses led Israel out of slavery in Egypt after meeting God at the burning bush, where he was sent to Pharaoh (Exodus 3:10). He received the law at Sinai and led the people for forty years without entering the land himself. The books from Exodus to Deuteronomy tell his story.',
      more:'Read Exodus 3:1–12 together. Moses objects that he is nobody, and God answers with presence and a sign (11–12). His story joins courage with reluctance: he argues, delays and still goes. Later passages show his limits too, including the incident that kept him from the land.',
      source:'https://ebible.org/eng-web/EXO03.htm'
    },
    'person-abraham': {
      reference:'Genesis 12:1-3',
      title:'Who was Abraham?',
      copy:'Abraham is presented as the father of Israel and of all who share his faith. Called out of his homeland, he received promises of land, offspring and blessing for all nations (12:1–3). Genesis 12–25 tells his story, including long waiting and real mistakes.',
      more:'Read Genesis 12:1–9 and 15:1–6 together. Abraham goes as told, then years pass before a son. Verse 15:6 says he believed God, and it was counted as righteousness. Paul returns to this in Romans 4. The story holds promise and patience together.',
      source:'https://ebible.org/eng-web/GEN12.htm'
    },
    'person-david': {
      reference:'1 Samuel 16:13',
      title:'Who was David?',
      copy:'David, shepherd boy turned king of Israel, was anointed by Samuel (1 Samuel 16:13). He is remembered as warrior, psalm-writer and flawed man after God’s own heart. His story runs through Samuel, Kings and Chronicles into the Psalms, failures included.',
      more:'Read 1 Samuel 16:1–13 together. God warns Samuel against judging by height and looks; David, the overlooked youngest, is chosen (7, 11–13). Later chapters show both his trust and his serious wrongs, including honest confession. The text neither hides him nor excuses him.',
      source:'https://ebible.org/eng-web/1SA16.htm'
    },
    'person-mary': {
      reference:'Luke 1:28',
      title:'Who was Mary, mother of Jesus?',
      copy:'Mary of Nazareth, mother of Jesus, received the angel’s greeting and said yes to her part (Luke 1:28, 38). The Gospels show her from the manger to the cross to prayer with the early church (Acts 1:14). Luke notes that she treasured these things in her heart (2:19).',
      more:'Read Luke 1:26–38 together. Mary asks a plain question, hears the answer about the Holy Spirit, and consents (34–38). Her song of praise follows (46–55). The passage presents willing trust, not full understanding in advance.',
      source:'https://ebible.org/eng-web/LUK01.htm'
    },
    'person-magdalene': {
      reference:'John 20:16',
      title:'Who was Mary Magdalene?',
      copy:'Mary Magdalene, freed by Jesus from seven demons (Luke 8:2), stayed by the cross and first met the risen Jesus, who called her by name (John 20:16). She carried the news to the disciples. She is not the same person as the sinful woman of Luke 7, though art often mixes them.',
      more:'Read John 20:11–18 together. Weeping, she mistakes Jesus for the gardener until one word—her name—opens her eyes (16). “Don’t hold me” sends her as messenger (17–18). Grief turning to witness is the shape of her story.',
      source:'https://ebible.org/eng-web/JHN20.htm'
    },
    'person-peter': {
      reference:'Matthew 16:18',
      title:'Who was Peter?',
      copy:'Peter, fisherman turned leading disciple, confessed Jesus as Messiah and heard that the church would be built on this rock (Matthew 16:18). He denied Jesus, was restored (John 21), and preached at Pentecost. Two New Testament letters bear his name.',
      more:'Read Matthew 16:13–23 together. Peter’s true confession (16) is followed within verses by a sharp rebuke when he resists the cross (23). Confidence and failure sit side by side in his story, which may encourage readers who share both.',
      source:'https://ebible.org/eng-web/MAT16.htm'
    },
    'person-paul': {
      reference:'Acts 9:15',
      title:'Who was Paul?',
      copy:'Paul, once a persecutor of Christians, met the risen Jesus on the Damascus road and became the apostle to the Gentiles (Acts 9:15). His letters form much of the New Testament. Acts 9–28 traces his journeys, arrest and witness in Rome.',
      more:'Read Acts 9:1–19 together. A persecutor is stopped, blinded and led by the hand; a frightened disciple is sent to him (10–17). Scales fall, he is baptized and begins preaching (18–20). The chapter presents change as God’s work received, not self-improvement achieved.',
      source:'https://ebible.org/eng-web/ACT09.htm'
    },
    'person-solomon': {
      reference:'1 Kings 3:12',
      title:'Who was Solomon?',
      copy:'Solomon, son of David, asked God for wisdom rather than riches and received it with wealth besides (1 Kings 3:12). He built the temple. Later disobedience darkened the story that follows; Proverbs, Ecclesiastes and Song are linked with his name.',
      more:'Read 1 Kings 3:5–14 together. Offered anything, Solomon asks for an understanding heart to govern (9). God gives wisdom plus what was not asked (11–13), with a condition of continued faithfulness (14). Gifts and obedience belong together here.',
      source:'https://ebible.org/eng-web/1KI03.htm'
    },
    'person-esther': {
      reference:'Esther 4:14',
      title:'Who was Esther?',
      copy:'Esther, Jewish queen of Persia, risked her life to plead for her people before the king (Esther 4:14). The book tells how the danger passed. God is not named in it, yet readers see providence in its turns.',
      more:'Read Esther 4:10–17 together. Mordecai warns that silence will not save her either, and suggests she came to royalty for such a time (13–14). Esther calls for fasting, then acts (15–16). Courage here is prepared, supported and timed.',
      source:'https://ebible.org/eng-web/EST04.htm'
    },
    'person-ruth': {
      reference:'Ruth 1:16',
      title:'Who was Ruth?',
      copy:'Ruth, a Moabite widow, stayed with her mother-in-law Naomi and her God, gleaning to live (Ruth 1:16). She married Boaz and became an ancestor of David and of Jesus (Matthew 1:5). Her short book tells loyalty rewarded.',
      more:'Read Ruth 1:16–17 together. Her pledge covers going, lodging, people, God and death—holding nothing back. The rest of the book shows ordinary kindnesses, from gleaning to marriage, carrying a larger purpose the characters cannot yet see.',
      source:'https://ebible.org/eng-web/RUT01.htm'
    },
    'person-noah': {
      reference:'Genesis 6:9',
      title:'Who was Noah?',
      copy:'Noah, called righteous in his time, built the ark at God’s warning and survived the flood with his family and the animals (Genesis 6:9–9:17). The story ends with God’s covenant promise. Jesus and the apostles refer back to it.',
      more:'Read Genesis 6:9–22 together. Corruption fills the scene, Noah walks with God, and detailed instructions follow (14–16). Verse 22 closes simply: he did all God commanded. Obedience here is concrete and costly, not merely felt.',
      source:'https://ebible.org/eng-web/GEN06.htm'
    },
    'person-elijah': {
      reference:'1 Kings 18:36',
      title:'Who was Elijah?',
      copy:'Elijah confronted Baal’s prophets on Carmel, and fire answered his plain prayer (1 Kings 18:36–39). Taken up without dying (2 Kings 2), he appears with Moses at the Transfiguration. James cites his earnest prayer (James 5:17–18).',
      more:'Read 1 Kings 18:30–39 together. Elijah repairs the altar, soaks it three times over, and prays briefly—no frenzy like the other side (26–29). The short prayer and full answer contrast human striving with asked-for help.',
      source:'https://ebible.org/eng-web/1KI18.htm'
    },
    'person-daniel': {
      reference:'Daniel 6:22',
      title:'Who was Daniel?',
      copy:'Daniel, exile in Babylon, kept praying though it meant the lions’ den, and God shut the lions’ mouths (Daniel 6:22). His book mixes court stories with visions. Jesus names him when speaking of hard days ahead.',
      more:'Read Daniel 6:10–23 together. Knowing the decree, Daniel prays openly as before (10). The king cannot save him despite wanting to (14–15). Deliverance answers steady habit, not last-minute panic. The chapter ends with a pagan king honouring God.',
      source:'https://ebible.org/eng-web/DAN06.htm'
    },
    refuge: {
      reference:'Psalm 46:1-2',
      title:'Refuge in Psalm 46',
      copy:'The psalm opens by calling God refuge and strength, a very present help in trouble (1–2). It pictures shaking earth and roaring seas that do not move those who trust (2–3). This is confidence for danger, not a claim that trouble stays away; verse 10 ends with stillness before God.',
      more:'Read the whole psalm. Its three parts each end with a pause: God’s presence (1–3), the city’s safety (4–7), and his rule over wars (8–11). “Be still” comes after the noise, not instead of it. The comfort is nearness, not exemption.',
      source:'https://ebible.org/eng-web/PSA046.htm'
    },
    fearnot: {
      reference:'Isaiah 41:10',
      title:'“Fear not” in Isaiah 41',
      copy:'God tells fearful Israel not to fear or be dismayed, because he is with them and will strengthen and uphold them (10). The promise is presence and help in fear, not a life without frightening things. Verse 13 repeats the hold: do not fear, I will help you.',
      more:'Read verses 8–13 together. Israel is addressed as chosen servant (8–9); fear is answered with five holds: with you, your God, strengthen, help, uphold (10). The passage suits trembling hands, not settled hearts proving their courage.',
      source:'https://ebible.org/eng-web/ISA041.htm'
    },
    beatitudes: {
      reference:'Matthew 5:3-6',
      title:'The Beatitudes in Matthew 5',
      copy:'Jesus opens the Sermon on the Mount by calling the poor in spirit, mourners, the meek and justice-hungry blessed (3–6). Each blessing pairs a low condition with a promised comfort. These describe kingdom values running opposite to the world’s honours, not steps to earn blessing.',
      more:'Read verses 3–12 together. The blessings continue through mercy, purity, peacemaking and persecution (7–10). Salt and light follow (13–16): blessed people show. The passage comforts the lowly before it instructs anyone.',
      source:'https://ebible.org/eng-web/MAT05.htm'
    },
    commandments: {
      reference:'Exodus 20:1-17',
      title:'The Ten Commandments in Exodus 20',
      copy:'The ten words: no other gods, no idols, no misuse of God’s name, keep the Sabbath, honour parents, no murder, no adultery, no stealing, no false witness, no coveting (Exodus 20:3–17). Given to Israel at Sinai, they shape love of God and neighbour; Jesus sums them so.',
      more:'Read verses 1–21 together. The commands open with who speaks: the God who brought Israel out of Egypt (2). The people tremble and ask Moses to mediate (18–19). Law here follows rescue, not the other way round.',
      source:'https://ebible.org/eng-web/EXO20.htm'
    },
    fruit: {
      reference:'Galatians 5:22-23',
      title:'The fruit of the Spirit in Galatians 5',
      copy:'Paul names the Spirit’s fruit: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness and self-control (22–23). Against such there is no law. Fruit grows; it is not manufactured by effort alone, though verse 16 urges walking by the Spirit.',
      more:'Read verses 16–25 together. The works of the flesh are listed first as warning (19–21); those who belong to Christ have crucified them with passions and desires (24). Verse 25 closes the loop: live by the Spirit, keep in step with the Spirit.',
      source:'https://ebible.org/eng-web/GAL05.htm'
    },
    armor: {
      reference:'Ephesians 6:10-11',
      title:'The armor of God in Ephesians 6',
      copy:'Paul tells believers to put on God’s full armor to stand firm (10–11). Belt of truth, breastplate of righteousness, gospel shoes, shield of faith, helmet of salvation and the Spirit’s sword follow (14–17). The image is readiness in struggle, not fear of attack.',
      more:'Read verses 10–20 together. Strength comes from the Lord, not self (10). Prayer caps the list and is asked for Paul himself (18–19). The struggle named is spiritual rather than human (12); the posture is standing, repeated three times.',
      source:'https://ebible.org/eng-web/EPH06.htm'
    },
    resurrection: {
      reference:'1 Corinthians 15:3-4',
      title:'The resurrection in 1 Corinthians 15',
      copy:'Paul passes on what matters most: Christ died for sins, was buried, and rose on the third day, seen by many (3–8). Christianity stands or falls here; Paul says so himself (14, 17). This states the claim the church makes, witnessed and written.',
      more:'Read verses 1–11 together. Paul lists witnesses: Peter, the Twelve, five hundred at once, James, then himself last of all (5–8). Verses 12–19 face the stakes plainly. Belief here rests on testimony, not on private feeling alone.',
      source:'https://ebible.org/eng-web/1CO15.htm'
    },
    heaven: {
      reference:'Revelation 21:4',
      title:'Heaven in Revelation 21',
      copy:'Revelation pictures God dwelling with people, wiping every tear, with death, mourning, crying and pain gone (3–4). A new heaven and new earth replace the first (1). This is hope in images, not a travel guide; the book speaks in visions throughout.',
      more:'Read 21:1–7 together. The sea is gone, the holy city comes down, and a loud voice announces the dwelling (1–3). Thirsty comers drink freely (6). The chapter comforts grieving readers with an ending, not an explanation of every loss.',
      source:'https://ebible.org/eng-web/REV21.htm'
    },
    prodigal: {
      reference:'Luke 15:20',
      title:'The prodigal son in Luke 15',
      copy:'A son wastes everything, comes home rehearsing apology, and his father runs to meet him while he is still far off (20). Robe, ring and feast follow (22–23). The story shows welcome before worthiness; the elder brother’s anger gets its own hearing too (28–32).',
      more:'Read verses 11–32 whole. Two lost things precede it—a sheep and a coin—each ending in found joy (1–10). The younger son’s plan meets embrace; the older son’s record meets invitation (28, 31). Neither son earns the father’s character.',
      source:'https://ebible.org/eng-web/LUK15.htm'
    },
    neighbor: {
      reference:'Luke 10:30-35',
      title:'The good Samaritan in Luke 10',
      copy:'Asked who counts as neighbour, Jesus tells of a Samaritan who stops, binds wounds, pays the innkeeper and promises return (30–35). The expert is sent to go and do likewise (37). Neighbour here means showing mercy across old hatreds, not feeling warmly.',
      more:'Read verses 25–37 together. The question tests Jesus (25); a priest and Levite pass by (31–32). Samaritans and Jews despised each other, which is the point. The story answers “who” with “Go and do likewise.”',
      source:'https://ebible.org/eng-web/LUK10.htm'
    },
    eagle: {
      reference:'Isaiah 40:31',
      title:'Renewed strength in Isaiah 40',
      copy:'Isaiah promises that those who wait for the Lord shall renew their strength, mounting up with wings like eagles, running without weariness (31). It follows a portrait of God’s tirelessness beside our tiredness (28–30). Waiting here means hoping toward God, not merely pausing.',
      more:'Read verses 27–31 together. Jacob complains his way is hidden (27); the answer names God everlasting Creator who never faints (28). Strength is given, not summoned; even young runners tire (30). The passage suits exhaustion better than hurry.',
      source:'https://ebible.org/eng-web/ISA040.htm'
    },
    shepherd: {
      reference:'John 10:11',
      title:'The good shepherd in John 10',
      copy:'Jesus calls himself the good shepherd who lays down his life for the sheep (11). Hired hands run; he knows his own by name (12–14). The passage presents care that costs the carer, contrasting use with love.',
      more:'Read verses 7–18 together. Door, pasture and abundant life come first (7–10); the laying down follows three times (11, 15, 17–18). One flock and one shepherd widen the fold (16). The claim centers his voluntary gift, not our grip.',
      source:'https://ebible.org/eng-web/JHN10.htm'
    },
    vine: {
      reference:'John 15:5',
      title:'The vine in John 15',
      copy:'Jesus names himself the vine and his followers the branches: remaining in him bears much fruit, while apart nothing lasting grows (5). Pruning grieves but serves fruitfulness (2). The passage locates growth in connection maintained, not effort redoubled.',
      more:'Read verses 1–11 together. The Father tends as gardener (1–2); words cleanse (3); remaining brings answered prayer shaped by his words (7). Joy completes the picture (11). Fruit is the outcome; remaining is the calling.',
      source:'https://ebible.org/eng-web/JHN15.htm'
    },
    psalm1: {
      reference:'Psalm 1:1-3',
      title:'The two ways in Psalm 1',
      copy:'The psalm contrasts two ways: the blessed one avoids the seat of mockers and delights in God’s law day and night (1–2). Like a tree by streams, that life bears fruit in season (3). The wicked, by contrast, are chaff in wind (4). Two paths, two endings, stated plainly.',
      more:'Read the whole short psalm. Six verses hold the full contrast: rooted life versus driven chaff (4), standing versus falling in judgment (5), watched way versus perishing way (6). It opens the Psalms as a doorway text.',
      source:'https://ebible.org/eng-web/PSA001.htm'
    },
    seasons: {
      reference:'Ecclesiastes 3:1',
      title:'A time for everything in Ecclesiastes 3',
      copy:'There is a time for every matter under heaven: birth and death, planting and harvest, weeping and laughing, mourning and dancing (1–4, 8). The poem steadies restless hearts with seasons rather than emergencies. Verse 11 adds that God makes everything beautiful in its time.',
      more:'Read verses 1–15 together. The catalogue runs through work, silence, love and war (1–8), then asks what gain toil brings (9). Eternity set in the heart meets unanswered whys (11). The chapter ends commending present joy received as gift (12–13).',
      source:'https://ebible.org/eng-web/ECC003.htm'
    },
    goldenrule: {
      reference:'Matthew 7:12',
      title:'The golden rule in Matthew 7',
      copy:'Jesus sums the Law and Prophets: do to others what you would have them do to you (12). It follows asking, seeking and knocking, and the Father’s good gifts (7–11). Simple to state, searching to practice; it judges every interaction by one question.',
      more:'Read verses 7–14 together. Asking receives, seeking finds, knocking opens (7–8); earthly fathers giving good gifts picture the Father (9–11). Then the narrow gate warning (13–14): the rule is walked, not merely admired.',
      source:'https://ebible.org/eng-web/MAT07.htm'
    },
    gifts: {
      reference:'1 Corinthians 12:4-7',
      title:'Spiritual gifts in 1 Corinthians 12',
      copy:'Paul writes of varieties of gifts from the same Spirit, given to each for the common good (4–7). Wisdom, knowledge, faith, healing, miracles, prophecy, discernment and tongues follow (8–10). No gift ranks its holder above another; all serve one body (12–13).',
      more:'Read chapter 12 whole. The body image runs through it: many parts, one body, weaker parts honoured (14–26). Chapter 13 then sets love above every gift. Gifts differ by design; envy and pride both miss the point.',
      source:'https://ebible.org/eng-web/1CO12.htm'
    },
    jesusbaptism: {
      reference:'Matthew 3:16',
      title:'The baptism of Jesus in Matthew 3',
      copy:'Jesus comes to John to be baptized, fulfilling all righteousness (13–15). As he comes up, the heavens open, the Spirit descends like a dove, and a voice names him beloved Son (16–17). The sinless one joins sinners’ rite, and heaven answers.',
      more:'Read verses 13–17 together. John resists, then consents (14–15). All three persons appear at once: Son baptized, Spirit descending, Father speaking. The church reads this as Jesus’ anointing for the work ahead, including the wilderness that follows.',
      source:'https://ebible.org/eng-web/MAT03.htm'
    },
    tempted: {
      reference:'Matthew 4:1',
      title:'The temptation of Jesus in Matthew 4',
      copy:'Led by the Spirit into the wilderness, Jesus fasts forty days and faces three testings around bread, spectacle and kingdoms (1–10). Each answer comes from Scripture quoted in context. Hebrews notes he sympathizes, having been tempted without sin.',
      more:'Read verses 1–11 together. Stones to bread tests sonship by appetite (3–4); the temple leap tests it by spectacle (5–7); the kingdoms offer a shortcut past the cross (8–10). Angels minister afterward (11). Testing here proves, not merely probes.',
      source:'https://ebible.org/eng-web/MAT04.htm'
    },
    pentecost: {
      reference:'Acts 2:4',
      title:'Pentecost in Acts 2',
      copy:'At Pentecost the disciples are filled with the Holy Spirit and speak in other tongues as enabled (4). The crowd hears its own languages and asks what it means (6–12). Peter answers with Joel and the risen Christ, and about three thousand believe (14–41).',
      more:'Read chapter 2 whole. Wind, fire and speech open it (1–4); confusion turns to questioning (12); Peter preaches repentance and baptism (38). The church is born speaking and listening across barriers, not in one tribe’s tongue.',
      source:'https://ebible.org/eng-web/ACT02.htm'
    },
    nativity: {
      reference:'Matthew 2:1-2',
      title:'The birth of Jesus in Matthew 2',
      copy:'Wise men from the east arrive asking for the newborn king of the Jews, having seen his star (1–2). Herod is troubled; chief priests point to Bethlehem from prophecy (3–6). Matthew presents Jesus’ birth as announced, opposed and foretold, not accidental.',
      more:'Read verses 1–12 together. The star, the troubled city, the prophecy and the worship belong together (2, 6, 11). Gifts follow inquiry here. The chapter continues with flight and return (13–23): glory arrives amid real danger.',
      source:'https://ebible.org/eng-web/MAT02.htm'
    },
    cross: {
      reference:'John 19:30',
      title:'“It is finished” in John 19',
      copy:'Dying, Jesus says “It is finished!” and gives up his spirit (30). John presents this as completion, not defeat: the work of bearing sin, promised and prepared, is done. No further payment remains to be added by us.',
      more:'Read 19:16–37 together. The inscription, garments, thirst and unbroken bones each echo Scripture (19, 24, 28, 36). Blood and water flow (34). The passage proclaims a finished work; our part is receiving, then living, not completing.',
      source:'https://ebible.org/eng-web/JHN19.htm'
    },
    hills: {
      reference:'Psalm 121:1-2',
      title:'Help in Psalm 121',
      copy:'The psalm lifts its eyes to the hills and asks where help comes from, then answers: from the Lord, maker of heaven and earth (1–2). The rest describes a keeper who neither sleeps nor lets the foot slip (3–8). Help is a person, not a place.',
      more:'Read the whole short psalm. Sun by day, moon by night, evil kept away, going out and coming in guarded (5–8). Pilgrims sang this climbing toward Jerusalem. The comfort is watched-over travel through danger, not absence of it.',
      source:'https://ebible.org/eng-web/PSA121.htm'
    },
    castcare: {
      reference:'1 Peter 5:7',
      title:'Cast your anxiety in 1 Peter 5',
      copy:'Peter tells humble sufferers to cast all anxiety on God, because he cares for them (6–7). Casting here means handing over, not holding tighter. The verse sits between humility and sober watchfulness against real opposition (8–9).',
      more:'Read verses 5–11 together. God opposes the proud and lifts the humble in time (5–6); anxiety is cast in that posture (7). Then comes alertness: the devil prowls, resistance is shared worldwide, and suffering ends in restoration (8–10).',
      source:'https://ebible.org/eng-web/1PE05.htm'
    },
    courage: {
      reference:'Joshua 1:9',
      title:'Courage in Joshua 1',
      copy:'Taking Moses’ place, Joshua hears three times to be strong and courageous, grounded in God’s presence wherever he goes (6–9). Courage here is commanded obedience carried into fear, not feeling brave first. The promise under it is companionship, not ease.',
      more:'Read verses 1–9 together. The land is promised, the law is to be kept and meditated on day and night (7–8), and only then comes the charge repeated (9). Obedience, promise and presence run as one cord through the passage.',
      source:'https://ebible.org/eng-web/JOS01.htm'
    },
    well: {
      reference:'John 4:13-14',
      title:'Living water in John 4',
      copy:'Offered living water, the Samaritan woman names her thirst through five husbands and open shame (16–18). Jesus answers that his water becomes a spring to eternal life (14). The longest recorded conversation in the Gospels goes to an outsider first.',
      more:'Read verses 7–26 together. Thirst, worship place and husbands are faced in order; true worship in spirit and truth follows (23–24). Prejudice—Samaritan, woman, noon hour—does not slow him. The passage dignifies direct questions.',
      source:'https://ebible.org/eng-web/JHN04.htm'
    },
    ruler: {
      reference:'Matthew 19:21',
      title:'The rich young ruler in Matthew 19',
      copy:'Asked what good deed inherits eternal life, the young man hears the commandments, claims them kept, and is told to sell, give and follow (16–21). He leaves sad, owning much (22). The passage exposes divided hearts, not honest poverty; camels and needles follow (24).',
      more:'Read verses 16–30 together. Disciples ask who can be saved; with God, possible (25–26). Peter’s “we have left all” meets hundredfold promise (27–29). The first-last reversal closes it (30). Wealth here is a rival allegiance, not a neutral tool.',
      source:'https://ebible.org/eng-web/MAT19.htm'
    },
    martha: {
      reference:'Luke 10:42',
      title:'Martha and Mary in Luke 10',
      copy:'Distracted by serving, Martha asks Jesus to rebuke her sitting sister (40). He answers gently that one thing is needed, and Mary chose it (41–42). Service is not condemned; anxious distraction crowding out presence is. The better portion cannot be taken.',
      more:'Read verses 38–42 together. Martha welcomes, then worries over much serving; Mary sits and listens. Jesus corrects without shaming: “Martha, Martha, you are anxious” (41). Busy readers meet themselves here more often than they expect.',
      source:'https://ebible.org/eng-web/LUK10.htm'
    },
    waves: {
      reference:'Matthew 14:30',
      title:'Peter on the water in Matthew 14',
      copy:'Seeing wind, Peter is afraid and begins to sink, crying “Lord, save me” (30). Jesus catches him at once, asking about little faith and doubt (31). The shortest prayer in the Gospels gets the fastest answer in them.',
      more:'Read verses 22–33 together. Jesus prays alone, comes walking, and is first mistaken for a ghost (23–27). Peter’s request is granted before his courage fails (28–29). Worship closes the scene: truly God’s Son (33).',
      source:'https://ebible.org/eng-web/MAT14.htm'
    },
    cup: {
      reference:'Matthew 26:39',
      title:'Gethsemane in Matthew 26',
      copy:'Facing arrest, Jesus prays for the cup to pass, yet submits: not my will but yours (39). He finds disciples sleeping and asks watchfulness against temptation (40–41). Obedience here is chosen in dread, not in absence of it.',
      more:'Read verses 36–46 together. Sorrow to death, three returns, sleeping friends each time (37–45). The willing spirit and weak flesh frame it (41). Then betrayal arrives and he goes anyway (46–47). Dread faced beats dread avoided.',
      source:'https://ebible.org/eng-web/MAT26.htm'
    },
    goliath: {
      reference:'1 Samuel 17:45',
      title:'David and Goliath in 1 Samuel 17',
      copy:'David meets armored Goliath with staff, sling and five stones, in the name of the Lord of hosts (40–45). One stone fells the giant; Israel routs (49–51). The story credits God’s deliverance through unlikely means, not positive thinking or underdog romance.',
      more:'Read 17:1–51 together. Armies taunt forty days while Saul offers armor that does not fit (16, 38–39). David’s confidence names past rescues from lion and bear (34–37). Victory belongs to the Lord, says the field sermon (46–47).',
      source:'https://ebible.org/eng-web/1SA17.htm'
    },
    furnace: {
      reference:'Daniel 3:25',
      title:'The fiery furnace in Daniel 3',
      copy:'Ordered to worship gold, Shadrach, Meshach and Abednego refuse whether God rescues or not (16–18). Thrown bound into sevenfold heat, they walk free with one like a son of God beside them (24–25). Faithfulness here precedes deliverance, which is promised nowhere in advance.',
      more:'Read 3:1–30 together. Music commands worship (4–6); accusers pounce (8–12). The king’s rage heats the furnace for his own men’s death (19–22). Promotion follows rescue (30), but verse 18 stands without knowing the ending.',
      source:'https://ebible.org/eng-web/DAN03.htm'
    },
    whysuffer: {
      reference:'Job 38:4',
      title:'Suffering in Job 38',
      copy:'After chapters of loss and argument, God answers Job from the whirlwind with questions, not explanations: where were you when earth was founded (4)? The book refuses tidy reasons for innocent pain. Presence and limits replace the demanded account; restoration follows unearned (42).',
      more:'Read 38:1–41 together. Sea, dawn, snow, stars—each asks Job’s whereabouts (8–33). Behemoth and Leviathan extend the tour (40–41). No theory of suffering is offered. The friends’ certainties are rebuked instead (42:7).',
      source:'https://ebible.org/eng-web/JOB38.htm'
    },
    sabbath: {
      reference:'Mark 2:27',
      title:'The Sabbath in Mark 2',
      copy:'Challenged over grain picked on Sabbath, Jesus answers that Sabbath was made for man, not man for Sabbath (27). Need and mercy outrank scruple here. The passage guards rest as gift against both neglect and rule-loading.',
      more:'Read 2:23–28 together. David’s bread precedent is cited (25–26); then the principle, then the Son of Man’s lordship over Sabbath (28). Rest serves people; people do not serve rest.',
      source:'https://ebible.org/eng-web/MRK02.htm'
    },
    giving: {
      reference:'2 Corinthians 9:7',
      title:'Giving in 2 Corinthians 9',
      copy:'Paul asks for decided, cheerful giving: not reluctantly or under compulsion, for God loves a cheerful giver (7). Sowing and reaping frame it (6); sufficiency follows for good work (8). Giving here is worshipful choice, not arm-twisted quota.',
      more:'Read 9:6–15 together. Generosity enriches toward more generosity, ending in thanksgiving to God (11–12). The collection serves Jerusalem saints (1–5). Motive matters as much as amount throughout.',
      source:'https://ebible.org/eng-web/2CO09.htm'
    },
    commission: {
      reference:'Matthew 28:19',
      title:'The Great Commission in Matthew 28',
      copy:'The risen Jesus sends disciples to make disciples of all nations, baptizing and teaching all he commanded (19–20). Authority precedes assignment; presence closes it: with you always, to the end (18, 20). Going and teaching belong together, grounded and accompanied.',
      more:'Read 28:16–20 together. Some doubt even while worshipping (17)—the charge includes them. All authority is claimed first (18). The book that began with God-with-us ends with I-am-with-you-always (1:23, 20).',
      source:'https://ebible.org/eng-web/MAT28.htm'
    },
    mustard: {
      reference:'Matthew 17:20',
      title:'Mustard-seed faith in Matthew 17',
      copy:'Asked why they could not heal, the disciples hear it is their little faith: faith like a mustard seed moves mountains, and nothing is impossible (20). Smallness is no barrier when its object is God. The rebuke targets unbelief, not struggling beginners.',
      more:'Read 17:14–21 together. A father pleads, the crowd fails, Jesus heals and rebukes faithlessness (17–18). Prayer and fasting are named for such cases (21, in many manuscripts). Bigness of faith matters less than its direction.',
      source:'https://ebible.org/eng-web/MAT17.htm'
    },
    emmaus: {
      reference:'Luke 24:32',
      title:'Emmaus in Luke 24',
      copy:'Two grieving walkers meet a stranger who opens the Scriptures until their hearts burn (27, 32). Bread broken reveals him; he vanishes (30–31). They return rejoicing the same hour (33). Grief here walks with unrecognized hope before recognition lands.',
      more:'Read 24:13–35 together. Seven miles of sad retelling (14–24), slow hearts reproved then taught from Moses onward (25–27), eyes opened at table (30–31). The day ends in testimony, not in bed (33–35).',
      source:'https://ebible.org/eng-web/LUK24.htm'
    },
    light: {
      reference:'Psalm 27:1',
      title:'Light in Psalm 27',
      copy:'David calls the Lord his light and salvation, asking whom to fear (1). One thing sought above all: dwelling in God’s house to gaze on his beauty (4). Trouble may come, but the ending waits confidently for goodness in the land of the living (13–14).',
      more:'Read the whole psalm. Enemies advance and stumble (2–3); hiding, teaching and leading are asked in turn (5, 11); waiting closes it twice (14). Fear is answered first by presence, then by patience.',
      source:'https://ebible.org/eng-web/PSA027.htm'
    },
    wonderfully: {
      reference:'Psalm 139:14',
      title:'Wonderfully made in Psalm 139',
      copy:'The psalm marvels at being fearfully and wonderfully made (14). God knew the unformed frame, with every day written before one began (15–16). This grounds worth in being fully known, not in performance, looks or comparison.',
      more:'Read 139:1–18 together. Searched and known opens it (1–6); flight proves impossible (7–12); darkness shines like day to God (12). Self-contempt has no foothold where every part was watched forming.',
      source:'https://ebible.org/eng-web/PSA139.htm'
    },
    deer: {
      reference:'Psalm 42:1',
      title:'Thirst in Psalm 42',
      copy:'As the deer pants for water, so the soul thirsts for God (1–2). Tears by day and night meet taunts of “Where is your God?” (3, 10). The refrain preaches back: hope in God, for praise will return (5, 11).',
      more:'Read 42:1–11 together. Memory of processions stings (4); waves and breakers roll (7); yet songs come in the night with prayer attached (8). Feeling and faith argue here, and faith gets the last word twice.',
      source:'https://ebible.org/eng-web/PSA042.htm'
    },
    benefits: {
      reference:'Psalm 103:2',
      title:'Benefits in Psalm 103',
      copy:'Bless the Lord and forget not his benefits: forgiveness, healing, redemption, crowning love, renewed youth like the eagle’s (2–5). The passage lists gifts before asking anything, answering forgetfulness with inventory.',
      more:'Read 103:1–22 together. East-from-west removes transgressions (12); fatherly pity meets dusty frames (13–14); steadfast love outlasts grass flowers (15–17). Remembering rightly fuels the blessing.',
      source:'https://ebible.org/eng-web/PSA103.htm'
    },
    delight: {
      reference:'Psalm 37:4',
      title:'Desires in Psalm 37',
      copy:'Delight in the Lord and he will give the desires of the heart (4). Fret not over evildoers’ success; their day passes like cut grass (1–2, 7). Commit the way, trust, rest—the verbs do the work (3–7).',
      more:'Read verses 1–11 together. Anger and envy are refused first (1, 8); meekness inherits instead (11). The promise is not every wish granted, but wants reshaped by delight until they match God’s giving.',
      source:'https://ebible.org/eng-web/PSA037.htm'
    },
    trainup: {
      reference:'Proverbs 22:6',
      title:'Training children in Proverbs 22',
      copy:'Train up a child in the way to go, and with age there is no departing from it (6). Proverbs states the general pattern, not an unbreakable promise; parents plant, God gives growth. Instruction here is steady and early, not frantic or harsh.',
      more:'The surrounding sayings prize humility, teachability and honest work (1–5). Discipline elsewhere in Proverbs corrects in love, never in rage. Pattern, patience and prayer belong together in this task.',
      source:'https://ebible.org/eng-web/PRO22.htm'
    },
    manna: {
      reference:'Exodus 16:15',
      title:'Manna in Exodus 16',
      copy:'Hungry Israel grumbles; morning brings bread from heaven—“what is it”—manna (15). Gather daily, double before Sabbath, keep none overnight except as commanded (16–26). Dependence is tutored one morning at a time; hoarding rots.',
      more:'Read 16:1–36 together. Evening quail answers first (12–13); Sabbath rest is protected by Friday’s double portion (22–26). Some kept leftovers anyway, and worms taught them (20). Daily bread trains daily trust.',
      source:'https://ebible.org/eng-web/EXO16.htm'
    },
    shema: {
      reference:'Deuteronomy 6:4',
      title:'The Shema in Deuteronomy 6',
      copy:'Hear, O Israel: the Lord our God is one Lord (4). Love follows with whole heart, soul and might, taught diligently at home and away (5–7). Jesus names this the first commandment. Unity of God grounds totality of love.',
      more:'Read verses 4–9 together. Words go on hearts first, then into children, houses, gates and hands (6–8). Forgetfulness is the named danger just before (10–12): plenty, not pain, threatens memory most.',
      source:'https://ebible.org/eng-web/DEU06.htm'
    },
    jericho: {
      reference:'Joshua 6:20',
      title:'Jericho in Joshua 6',
      copy:'Marching, trumpets and a long blast precede the shout, and the wall falls flat (20). Seven days of circling obedience come first (3–4, 15). Victory belongs to patient procedure, not to siege craft; Rahab’s household alone is spared (22–25).',
      more:'Read 6:1–27 together. Shut gates open nothing (1); priests, ark and rear guard circle in order (6–14). The shout is commanded, not improvised (16, 20). Strange plans, exactly followed, carry the day.',
      source:'https://ebible.org/eng-web/JOS06.htm'
    },
    gideon: {
      reference:'Judges 6:37',
      title:'Gideon’s fleece in Judges 6',
      copy:'Unsure of the call against Midian, Gideon lays out wool twice: dew on fleece alone, then ground alone (37–40). God answers both signs patiently. Asking for confirmation here is met, not mocked—though later chapters warn against testing as habit.',
      more:'Read 6:33–40 together. A reduced, fearful man meets repeated assurance (12, 16, 36–40). Chapter 7 then shrinks his army to hundreds, so no one mistakes whose victory follows. Signs serve mission, not curiosity.',
      source:'https://ebible.org/eng-web/JDG06.htm'
    },
    joseph: {
      reference:'Genesis 50:20',
      title:'Who was Joseph?',
      copy:'Joseph, sold by his brothers and raised in Egypt through prison to power, names the pattern at the end: what was meant for evil, God meant for good, to save many alive (50:20). His story runs Genesis 37–50, pit and palace both included.',
      more:'Read Genesis 50:15–21 together. Frightened brothers expect revenge; Joseph weeps, refuses God’s place, and promises provision (19–21). Forgiveness here is spoken before it is felt complete, and kindness is concrete.',
      source:'https://ebible.org/eng-web/GEN50.htm'
    },
    servant: {
      reference:'Isaiah 53:5',
      title:'The suffering servant in Isaiah 53',
      copy:'The servant is pierced for transgressions and crushed for iniquities; by his wounds comes healing (5). Like a lamb silent before shearers, he bears what others deserved (7). Christians read this as Jesus; the chapter itself presents substitution plainly.',
      more:'Read 52:13–53:12 together. Exalted yet marred beyond likeness (52:13–14), despised and rejected (53:3), cut off yet seeing offspring and prolonging days (8–10). Sorrow and triumph share one figure throughout.',
      source:'https://ebible.org/eng-web/ISA53.htm'
    },
    talents: {
      reference:'Matthew 25:21',
      title:'The talents in Matthew 25',
      copy:'A master entrusts five, two and one talents; the first two trade and double, the third buries his in fear (15–18, 24–25). “Well done, good and faithful servant” greets the traders (21, 23). Use what is given; fearful hoarding loses even that (28–29).',
      more:'Read verses 14–30 together. Long absence precedes accounting (19). The buried talent’s excuse accuses the master (24–25), and the verdict answers it (26–27). Faithfulness is measured by risked obedience, not by starting amount.',
      source:'https://ebible.org/eng-web/MAT25.htm'
    },
    zacchaeus: {
      reference:'Luke 19:9',
      title:'Zacchaeus in Luke 19',
      copy:'Short, rich and hated as tax chief, Zacchaeus climbs a sycamore to see Jesus (3–4). Jesus invites himself over; salvation comes to the house that day, with pledges of half to the poor and fourfold repayment (8–9). Seeking ends in giving.',
      more:'Read 19:1–10 together. Grumbling calls him sinner (7); grace precedes the pledges, not the reverse (5, 8). Verse 10 states the mission: seek and save the lost. Status reverses here—small man, large mercy.',
      source:'https://ebible.org/eng-web/LUK19.htm'
    },
    hosanna: {
      reference:'Matthew 21:9',
      title:'Hosanna in Matthew 21',
      copy:'Crowds spread cloaks and branches, crying Hosanna to the Son of David as Jesus enters Jerusalem on a donkey (8–9). The city stirs; children echo it in the temple (10, 15). Praise here is loud, public and soon tested.',
      more:'Read verses 1–17 together. Prophecy stages the entry (4–5); the temple cleansing follows praise (12–13). “Hosanna” means save now. The same voices will choose differently within days—a warning against crowd faith.',
      source:'https://ebible.org/eng-web/MAT21.htm'
    },
    paradise: {
      reference:'Luke 23:43',
      title:'Paradise in Luke 23',
      copy:'Dying beside Jesus, one criminal asks remembrance; Jesus answers that today he will be with him in paradise (42–43). No baptism, works or time remain to him—only turning trust. The thief’s whole theology fits one honest sentence.',
      more:'Read verses 39–49 together. One mocker demands rescue on his terms (39); the other confesses justice and asks memory (40–42). Paradise is promised before death, received after (43, 46). Last-minute turning still turns.',
      source:'https://ebible.org/eng-web/LUK23.htm'
    },
    cloud: {
      reference:'Hebrews 12:1',
      title:'The cloud of witnesses in Hebrews 12',
      copy:'Surrounded by so great a cloud of witnesses, readers lay aside weights and entangling sin and run with endurance the race set before them (1). Eyes stay on Jesus, author and finisher, who endured the cross for coming joy (2).',
      more:'Read 11:32–12:3 together. Gideon, David, Samuel and the unnamed close chapter 11; their witness opens chapter 12. Discipline follows as proof of sonship, not its price (5–11). Endurance is corporate before it is personal.',
      source:'https://ebible.org/eng-web/HEB12.htm'
    },
    works: {
      reference:'James 2:26',
      title:'Faith and works in James 2',
      copy:'James insists faith without works is dead, as body without spirit (26). Abraham offering Isaac and Rahab hiding messengers show faith completed by acts (21–25). Profession alone saves no one here; living trust always moves hands and feet.',
      more:'Read verses 14–26 together. “Show me” challenges word-only faith (18); demons believe and shudder (19). Paul’s justification language addresses a different question—how sinners are received—not whether the received remain idle.',
      source:'https://ebible.org/eng-web/JAS02.htm'
    },
    godislove: {
      reference:'1 John 4:8',
      title:'God is love in 1 John 4',
      copy:'Whoever does not love does not know God, because God is love (8). Love’s proof is the sent Son as atoning sacrifice (9–10). Perfect love casts out fear, for fear involves punishment (18). Knowing here is proven by loving, not by claiming.',
      more:'Read verses 7–21 together. Love originates with God, not us (10, 19). Confessing Jesus come in flesh tests spirits (2–3); loving the seen brother tests profession (20). The chapter defines by source, proof and absence of fear.',
      source:'https://ebible.org/eng-web/1JN04.htm'
    },
    fanflame: {
      reference:'2 Timothy 1:7',
      title:'No spirit of fear in 2 Timothy 1',
      copy:'Paul reminds Timothy that God gave not a spirit of fear but of power, love and self-control (7). Timothy is urged to fan his gift into flame and share hardship unashamed (6–8). Timidity here is addressed as forgetfulness, not identity.',
      more:'Read verses 3–14 together. Tears, prayers and sincere faith remembered (3–5) precede the charge (6). Sound teaching is guarded by the indwelling Spirit (13–14). Courage is rekindled gift, not manufactured mood.',
      source:'https://ebible.org/eng-web/2TI01.htm'
    },
    separate: {
      reference:'Romans 8:38',
      title:'Nothing can separate in Romans 8',
      copy:'Paul is persuaded that neither death nor life, angels nor rulers, present nor future, height nor depth can separate from God’s love in Christ (38–39). The list is meant to exhaust categories. If it is not named here, it belongs inside “nor any other created thing”.',
      more:'Read verses 31–39 together. “If God is for us” opens the argument (31); the unspared Son grounds it (32). Accusation, condemnation and separation each fail in turn (33–35, 38–39). Assurance here is argued, not merely felt.',
      source:'https://ebible.org/eng-web/ROM08.htm'
    },
    trinity: {
      reference:'Matthew 28:19',
      title:'The Trinity in Matthew 28',
      copy:'Baptizing in the name—singular—of Father, Son and Holy Spirit, Jesus joins the three in one divine name (19). Christians confess one God in three persons from such passages. The word Trinity itself is later shorthand, not a Bible quote.',
      more:'Read verses 16–20 together with 2 Corinthians 13:14, where grace, love and fellowship are likewise threefold. No single verse explains the whole doctrine; the church built it slowly from many texts. Beware neat diagrams that explain it away.',
      source:'https://ebible.org/eng-web/MAT28.htm'
    },
    hell: {
      reference:'Mark 9:43',
      title:'Hell in Mark 9',
      copy:'Jesus warns of Gehenna picturesquely: better maimed in life than whole in unquenchable fire (43–48). Outer darkness, weeping and gnashing recur elsewhere. The images agree that rejecting God ends badly; interpreters differ on details beyond that warning.',
      more:'Read Mark 9:42–50 together. The warnings guard little ones from stumbling (42); cutting illustrations stress seriousness, not self-harm (43–47). Salt seasons the close (49–50). Take the warning at full weight without drawing charts of the unseen.',
      source:'https://ebible.org/eng-web/MRK09.htm'
    },
    afterlife: {
      reference:'2 Corinthians 5:8',
      title:'After death in 2 Corinthians 5',
      copy:'Paul prefers absence from the body with its groaning, for presence with the Lord (4, 8). To depart and be with Christ is gain, says Philippians 1:23. The New Testament promises conscious nearness, then resurrection; timelines beyond that divide readers.',
      more:'Read 2 Corinthians 5:1–10 together. Earthly tents dissolve; heavenly dwelling is prepared (1–2). Groaning here is homesickness, not despair (4). Verse 10 adds facing Christ’s judgment seat—comfort and seriousness together.',
      source:'https://ebible.org/eng-web/2CO05.htm'
    },
    election: {
      reference:'Ephesians 1:4',
      title:'Election in Ephesians 1',
      copy:'Paul writes that God chose believers in Christ before the foundation, for holiness and adoption (4–5). Christians read this differently: some stress God’s free choice, others human response held alongside. Both sides appeal to this same letter honestly.',
      more:'Read 1:3–14 together. Blessings pile up: redemption, forgiveness, inheritance, sealing (7, 11, 13). Romans 9–11 wrestles further. The passage aims worship (“to the praise of his glory,” 6, 12, 14), not a system to master.',
      source:'https://ebible.org/eng-web/EPH01.htm'
    },
    angels: {
      reference:'Hebrews 1:14',
      title:'Angels in Hebrews 1',
      copy:'Angels are ministering spirits sent to serve those inheriting salvation (14). The chapter ranks the Son far above them, worshipped by them (4–6). Angels act, guard and announce; they are never to be worshipped themselves (see Revelation 22:8–9).',
      more:'Read Hebrews 1 whole. Seven Old Testament quotations crown the Son (5–13); angels frame his superiority throughout. Guardian language comes from passages like Psalm 91:11. Interest in angels is healthy until it outruns interest in Christ.',
      source:'https://ebible.org/eng-web/HEB01.htm'
    },
    satan: {
      reference:'1 Peter 5:8',
      title:'Satan in 1 Peter 5',
      copy:'Peter pictures the devil prowling like a roaring lion, seeking someone to devour—so be sober and resist, firm in faith (8–9). He is real, hostile and limited: resisted believers, promised flight (see James 4:7). Fear him neither lightly nor greatly.',
      more:'Read verses 6–11 together. Humility under God’s hand precedes the warning (6); casting anxiety belongs beside it (7). Suffering is shared worldwide (9); restoration follows (10). Alertness, not obsession, is the posture.',
      source:'https://ebible.org/eng-web/1PE05.htm'
    },
    tattoos: {
      reference:'Leviticus 19:28',
      title:'Tattoos in Leviticus 19',
      copy:'Israel is told not to cut flesh or print marks for the dead (28). The context is pagan mourning rites, not modern decoration directly. Christians apply this differently: some abstain by principle, others see freedom with wisdom about motive and message.',
      more:'Read 19:1–18 together. Holiness here means distinct practices: honest scales, care for the poor, no hatred (9–18). “You shall be holy” opens it (2). The chapter aims a separated people, not a list of timeless bans on ink.',
      source:'https://ebible.org/eng-web/LEV19.htm'
    },
    readbible: {
      reference:'Psalm 119:105',
      title:'Reading Scripture in Psalm 119',
      copy:'God’s word is a lamp to feet and light to path (105). Begin where reading is plain—Mark, John, Psalms—short passages daily, asking what it says before what to do. Confusion is normal at first; keep a steady pace rather than a heroic one.',
      more:'The psalm’s 176 verses circle one theme: delight in the word amid trouble (50, 92, 143). Read with prayer, a notebook and patience; reread rather than rush. Understanding grows the way strength does—by repeated, ordinary sessions.',
      source:'https://ebible.org/eng-web/PSA119.htm'
    },
    translations: {
      reference:'Nehemiah 8:8',
      title:'Bible translations in Nehemiah 8',
      copy:'Levites read distinctly and gave the sense so people understood (8). Translation continues that work from Hebrew and Greek manuscripts. Formal versions stay close to wording; dynamic ones to meaning. No English version is perfect; major doctrines stand in all of them.',
      more:'Read Nehemiah 8:1–12 together. Hearing brings weeping, then commanded joy and shared food (9–12). Understanding, not mere reciting, is the aim throughout. Compare two translations side by side when a verse puzzles you.',
      source:'https://ebible.org/eng-web/NEH08.htm'
    },
    repent: {
      reference:'Acts 3:19',
      title:'Repentance in Acts 3',
      copy:'Peter calls hearers to repent and turn, so sins are blotted out and refreshment comes (19). Repentance here means turning—mind changed, direction reversed—not merely feeling sorry. Forgiveness and fresh seasons follow the turn, never precede it as bargain.',
      more:'Read verses 11–26 together. The lame man’s healing opens ears (11–12); ignorance mitigates without excusing (17); prophets and covenant frame the call (21–25). Verse 26 names the blessing’s shape: turning each from iniquities.',
      source:'https://ebible.org/eng-web/ACT03.htm'
    },
    hope: {
      reference:'Romans 15:13',
      title:'Hope in Romans 15',
      copy:'Paul prays the God of hope fill believers with joy and peace in believing, abounding in hope by the Spirit (13). Biblical hope is confident expectation of promised good, not wishful mood. It anchors precisely where feelings drift.',
      more:'Read 15:1–13 together. Bearing the weak, pleasing neighbours for good, and one-voiced praise lead in (1–6). Gentiles glorifying God was always the plan (9–12). Hope here is prayed for, then expected as answer.',
      source:'https://ebible.org/eng-web/ROM15.htm'
    },
    waytruth: {
      reference:'John 14:6',
      title:'The way, truth and life in John 14',
      copy:'Troubled hearts hear that Jesus himself is the way, truth and life; no one comes to the Father except through him (1, 6). The claim is exclusive and personal at once. Knowing the way means knowing him (7), not mastering a method.',
      more:'Read 14:1–11 together. Mansions prepared, return promised (2–3); Thomas’s honest question draws the answer (5–6); seeing Jesus is seeing the Father (7–9). Comfort here has a name and a face.',
      source:'https://ebible.org/eng-web/JHN14.htm'
    },
    churchbody: {
      reference:'Ephesians 2:19',
      title:'The church in Ephesians 2',
      copy:'Gentile believers are fellow citizens with saints, God’s household built on apostles and prophets with Christ the cornerstone (19–20). The church here is people fitted together, not a building or a brand. Growth is into a dwelling place (21–22).',
      more:'Read 2:11–22 together. The dividing wall of hostility falls in Christ’s flesh (14–15); one new humanity replaces two estranged groups (15–16). Peace is announced, then access shared (17–18). Belonging precedes behaving throughout.',
      source:'https://ebible.org/eng-web/EPH02.htm'
    },
    worship: {
      reference:'John 4:23',
      title:'Worship in John 4',
      copy:'True worshippers will worship the Father in spirit and truth, for the Father seeks such (23). Place and form matter less than heart and honesty. Worship here is response to revealed character, not musical style or volume.',
      more:'Read verses 19–26 together. Mountains versus Jerusalem frames her question (20); Jesus relativizes both (21). God is spirit (24); Messiah discloses himself plainly (26). The passage reforms worship by revealing its object.',
      source:'https://ebible.org/eng-web/JHN04.htm'
    },
    fasting: {
      reference:'Matthew 6:16',
      title:'Fasting in Matthew 6',
      copy:'Jesus assumes fasting—“when,” not “if”—and forbids gloomy show: wash, anoint, let only the Father see (16–18). Secrecy protects sincerity; the Father who sees repays. Fasting here tunes appetite toward God, never purchases his favour.',
      more:'Read 6:1–18 together. Alms, prayer and fasting each get the same pattern: hidden practice, open reward (4, 6, 18). Hypocrisy performs for people; devotion addresses the Father. Motive is the whole difference.',
      source:'https://ebible.org/eng-web/MAT06.htm'
    },
    unforgivable: {
      reference:'Matthew 12:31',
      title:'The unforgivable sin in Matthew 12',
      copy:'Jesus warns that blasphemy against the Spirit will not be forgiven, while every other sin and word against the Son will be (31–32). The context is deliberate: calling evident divine work evil to its face (24). Anxious fear of having done it is itself strong evidence otherwise.',
      more:'Read verses 22–37 together. A healed demoniac splits the crowd (23); leaders attribute the work to Beelzebul (24). Words reveal hearts and will be judged (33–37). Trembling readers should hear verse 32’s breadth first.',
      source:'https://ebible.org/eng-web/MAT12.htm'
    },
    soulspirit: {
      reference:'1 Thessalonians 5:23',
      title:'Spirit, soul and body in 1 Thessalonians 5',
      copy:'Paul prays the whole person—spirit, soul and body—kept blameless at Christ’s coming (23). Scripture uses the terms flexibly, not as machine parts; the point here is thorough sanctification, inside and out. God who calls is faithful to finish it (24).',
      more:'Read 5:12–24 together. Leaders esteemed, idlers warned, fainthearted held (12–14); joy, prayer and thanks commanded always (16–18); prophecies tested, good held (20–21). Wholeness is prayed, then promised by God’s faithfulness.',
      source:'https://ebible.org/eng-web/1TH05.htm'
    },
    johnbaptist: {
      reference:'Matthew 3:2',
      title:'John the Baptist in Matthew 3',
      copy:'John preaches repentance in the wilderness, dressed in camel hair and eating locusts and wild honey (1–4). He baptizes with water for repentance and points to one coming who will baptize with the Holy Spirit and fire (11). His role is preparing, then decreasing.',
      more:'Read Matthew 3:1–12 together, where John points to Jesus as “the Lamb of God, who takes away the sin of the world” (John 1:29). John questions baptizing Jesus, then consents to fulfill righteousness (13–15). Later, from prison, he sends disciples to ask—and Jesus answers with evidence, not rebuke (Matthew 11:2–6).',
      source:'https://ebible.org/eng-web/MAT03.htm'
    },
    judas: {
      reference:'Matthew 26:15',
      title:'Judas in Matthew 26',
      copy:'Judas agrees to hand Jesus over for thirty pieces of silver (14–16). At the supper Jesus says plainly that one of them will betray him, and the disciples grieve one by one (21–22). The garden kiss that follows is identification, not affection (49).',
      more:'Read 26:14–25 together with 27:3–5, where Judas returns the silver in remorse. The passage names the price without explaining the whole mystery of his choosing. It neither excuses the betrayal nor treats remorse as nothing.',
      source:'https://ebible.org/eng-web/MAT26.htm'
    },
    burningbush: {
      reference:'Exodus 3:5',
      title:'The burning bush in Exodus 3',
      copy:'Moses sees a bush burning yet unconsumed and turns aside to look (2–3). God calls him to remove his sandals, for the ground is holy (5). The bush that burns without burning up becomes the setting for “I AM WHO I AM” (14).',
      more:'Read 3:1–15 together. Moses’ objections continue into chapter 4—who am I, what is your name, what if they do not believe. God answers each with presence and signs, not credentials. Holiness here draws Moses closer before sending him out.',
      source:'https://ebible.org/eng-web/EXO03.htm'
    },
    redsea: {
      reference:'Exodus 14:21',
      title:'The Red Sea in Exodus 14',
      copy:'Moses stretches his hand over the sea; the waters part and Israel crosses on dry ground, walls of water on right and left (21–22). When the Egyptians pursue, the waters return and the whole pursuing army drowns (27–28). Deliverance here is God’s act witnessed, not Israel’s achievement.',
      more:'Read 14:15–31 together. “Stand still, and see” precedes any marching (13); fear and trust stand side by side at the close (31). Chapter 15 turns the event into song. The passage celebrates rescue without explaining every mechanism.',
      source:'https://ebible.org/eng-web/EXO14.htm'
    },
    plagues: {
      reference:'Exodus 7:17',
      title:'The plagues in Exodus 7',
      copy:'The ten plagues begin at the Nile turned to blood, “that you may know that I am Yahweh” (17–21). Frogs, gnats, flies, livestock, boils, hail, locusts and darkness follow before the Passover night and the firstborn (chapters 8–12). Each plague answers Pharaoh’s hardened refusal.',
      more:'Read 7:14–24 together with 12:21–30. The refrain of the hardened heart runs throughout; interpreters differ over mechanism and over how divine purpose and human refusal meet. The passage aims recognition of God, not a timetable anyone can repeat.',
      source:'https://ebible.org/eng-web/EXO07.htm'
    },
    damascus: {
      reference:'Acts 9:4',
      title:'Damascus road in Acts 9',
      copy:'Saul nears Damascus when a light flashes and a voice asks, “Saul, Saul, why do you persecute me?” (3–4). Blinded, he is led by hand into the city to wait (8–9). Ananias lays hands on him, scales fall from his eyes, and he is baptized (17–18).',
      more:'Read 9:1–19 together. The persecutor becomes a preacher “immediately” (20). Ananias obeys despite honest fear (13–14). The passage shows conversion as interruption and welcome together, not as Saul improving himself.',
      source:'https://ebible.org/eng-web/ACT09.htm'
    },
    comfort: {
      reference:'2 Corinthians 1:4',
      title:'Comfort in 2 Corinthians 1',
      copy:'Paul blesses the God of all comfort, who comforts the afflicted in trouble so they can comfort others in any trouble (3–4). Comfort here is received before it is shared; affliction and consolation arrive together, not in sequence.',
      more:'Read 1:3–7 together. Paul speaks from recent despair, even of life itself (8–9), and sets hope on God who raises the dead (9–10). The passage neither hurries grief nor leaves it alone. No timetable for relief is given.',
      source:'https://ebible.org/eng-web/2CO01.htm'
    },
    revelation: {
      reference:'Revelation 1:3',
      title:'Revelation in Revelation 1',
      copy:'John writes to seven churches what he saw, blessing those who read, hear and keep it (1–3, 4). Visions of throne, Lamb, judgments and a new heaven and earth follow; the book closes “come, Lord Jesus” (22:20). It promises blessing for reading, not a code only experts can crack.',
      more:'Read 1:1–8 with 21:1–5 and 22:20. Lampstands, seals and beasts are highly symbolic throughout, and Christians have read the images very differently across centuries. The frame is worship and endurance under pressure, not a dated chart.',
      source:'https://ebible.org/eng-web/REV01.htm'
    },
    bornagain: {
      reference:'John 3:3',
      title:'Born again in John 3',
      copy:'Nicodemus comes by night; Jesus says no one sees God’s kingdom unless born again, born of water and Spirit (1–5). Flesh gives birth to flesh; the Spirit blows where it pleases, heard but not controlled (6–8). New birth here is God’s work received, not self-improvement achieved.',
      more:'Read 3:1–16 together. The beloved verse 16 lands inside this night conversation. “How can these things be?” is answered with Moses’ serpent lifted up (9–15). Believing here means entrusting oneself, not merely agreeing.',
      source:'https://ebible.org/eng-web/JHN03.htm'
    },
    ascension: {
      reference:'Acts 1:9',
      title:'The ascension in Acts 1',
      copy:'Forty days of resurrection appearances close as Jesus is lifted up and a cloud takes him (9). Two men in white ask why they stand gazing: he will come in the same way (10–11). Luke’s second volume opens with departure so the Spirit’s arrival can follow.',
      more:'Read Acts 1:6–11 together. The disciples ask about restoring the kingdom; Jesus redirects them to Spirit-empowered witness (6–8). The ascension enthrones rather than abandons—absence with a promised return.',
      source:'https://ebible.org/eng-web/ACT01.htm'
    },
    secondcoming: {
      reference:'1 Thessalonians 4:16',
      title:'The second coming in 1 Thessalonians 4',
      copy:'Paul comforts grieving believers: the Lord himself will descend, the dead in Christ rise first, and the living join them (16–17). “Therefore comfort one another with these words” closes it (18)—comfort for mourners, not a puzzle for calculators.',
      more:'Read 4:13–18 with Matthew 24:36, where the day is unknown even to the Son. Readiness means faithful work and love, not date-setting; every generation that has set dates has been wrong.',
      source:'https://ebible.org/eng-web/1TH04.htm'
    },
    newcovenant: {
      reference:'Jeremiah 31:33',
      title:'The new covenant in Jeremiah 31',
      copy:'God promises a new covenant, unlike the broken Sinai one: law written on hearts, all knowing him, sins forgiven (31–34). At supper Jesus lifts the cup as this covenant in his blood (Luke 22:20). New here means inward and forgiven, not merely updated.',
      more:'Read Jeremiah 31:31–34 with Hebrews 8:7–13, which quotes the promise at length. The old covenant’s fault lay with the people’s breaking, says Hebrews (8:8–9). The promise aims transformed hearts, not better paperwork.',
      source:'https://ebible.org/eng-web/JER31.htm'
    },
    transfiguration: {
      reference:'Matthew 17:2',
      title:'The transfiguration in Matthew 17',
      copy:'On the mountain Jesus’ face shines like the sun and his clothes turn white (2). Moses and Elijah appear talking with him; Peter offers tents; a bright cloud overshadows and the Father says, “Listen to him” (3–5). Glory confirmed days after the first passion prediction.',
      more:'Read 17:1–8 together. The disciples fall facedown in awe and Jesus touches them: rise and have no fear (6–7). Tell no one until the resurrection, he orders (9)—glory kept secret until the cross explains it.',
      source:'https://ebible.org/eng-web/MAT17.htm'
    },
    pentateuch: {
      reference:'Deuteronomy 31:24',
      title:'Who wrote Genesis?',
      copy:'Deuteronomy pictures Moses writing “this law” down (31:24); long tradition extends his hand to all five books. The books themselves carry no signed title page, and Jesus speaks of “Moses” as the books’ voice (see John 5:46–47). Christians differ on how the books were composed while receiving them as Scripture.',
      more:'Read Deuteronomy 31:24–26 with 34:5–12, where Moses’ death is narrated—someone finished the story. Authorship questions need not unsettle reading: the books present themselves as God’s word through Moses’ ministry.',
      source:'https://ebible.org/eng-web/DEU31.htm'
    },
    'person-isaiah': {
      reference:'Isaiah 6:8',
      title:'Who was Isaiah?',
      copy:'Isaiah sees the Lord enthroned, hears “Holy, holy, holy,” and confesses unclean lips (1–5). A coal touches his mouth; forgiven, he volunteers: “Here I am. Send me!” (6–8). Much of the book holds servant songs Christians hear fulfilled in Christ.',
      more:'Read Isaiah 6 together. The mission that follows brings hardening as well as healing (9–10)—prophecy comforts and confronts. Isaiah preached to kings across decades; long tradition holds he was sawn in two (see Hebrews 11:37).',
      source:'https://ebible.org/eng-web/ISA06.htm'
    },
    'person-lazarus': {
      reference:'John 11:43',
      title:'Who was Lazarus?',
      copy:'Lazarus of Bethany, brother of Martha and Mary, lies four days dead when Jesus weeps and then calls, “come out” (35, 43). The bound man walks out; many believe, and the authorities plot (44–45, 53). His raising previews resurrection—and provokes the cross.',
      more:'Read John 11:1–44 together. “I am the resurrection and the life” precedes any miracle (25). Jesus is deeply moved, not detached (33, 38). Lazarus himself says nothing recorded afterward; the sign points past him to Christ.',
      source:'https://ebible.org/eng-web/JHN11.htm'
    },
    'person-job': {
      reference:'Job 1:21',
      title:'Who was Job?',
      copy:'Job, blameless and upright, loses wealth, children and health in rapid succession (chapters 1–2). He tears his robe, worships, and blesses God’s name (20–21). Most of the book is fierce argument with friends before God answers from the whirlwind (38–41) and restores him (42).',
      more:'Read Job 1:20–22 with 42:1–6. Job never learns the heavenly wager of the opening chapters; readers know more than he did. His resolve to trust without answers (13:15) names faith that outlasts explanation.',
      source:'https://ebible.org/eng-web/JOB01.htm'
    },
    'person-jonah': {
      reference:'Jonah 1:17',
      title:'Who was Jonah?',
      copy:'Jonah flees toward Tarshish instead of Nineveh; thrown overboard, he is swallowed by a great fish three days and three nights (1:3, 15, 17). From the fish he prays, is cast onto dry land, and finally preaches—Nineveh repents (chapters 2–3). The book ends with God pitying a great city (4:11).',
      more:'Read Jonah 1–2 with 4:1–11. Jonah’s anger at mercy is the book’s real ending, not the fish. Jesus invokes “the sign of Jonah” for his own death and rising (Matthew 12:39–40). Running from God moves the story; it never escapes him.',
      source:'https://ebible.org/eng-web/JON01.htm'
    },
    cainabel: {
      reference:'Genesis 4:8',
      title:'Cain and Abel in Genesis 4',
      copy:'Cain’s offering is not regarded while Abel’s is; angered, Cain kills his brother in the field (3–8). “Am I my brother’s keeper?” meets the voice of Abel’s blood crying from the ground (9–10). Cain is marked yet protected as he goes out (15).',
      more:'Read Genesis 4:1–16 together. God warns that sin “crouches at the door” and must be mastered (7). Worship, envy, violence and exile sequence tightly; the chapter refuses to make murder small or mercy absent.',
      source:'https://ebible.org/eng-web/GEN04.htm'
    },
    babel: {
      reference:'Genesis 11:4',
      title:'Babel in Genesis 11',
      copy:'Humanity settles to build a city and tower “whose top reaches to the sky” to make a name (4). God confuses their language; building stops and they scatter (7–9). Babel explains divided tongues—and reverses at Pentecost, where one message is heard in every language (Acts 2:6–8).',
      more:'Read Genesis 11:1–9 together. One language becomes many; pride’s monument becomes confusion. The very next verses turn to Shem’s line and Abram (10–26)—judgment, then the road to blessing.',
      source:'https://ebible.org/eng-web/GEN11.htm'
    },
    'person-samuel': {
      reference:'1 Samuel 3:10',
      title:'Who was Samuel?',
      copy:'The boy Samuel serves under Eli when God calls in the night; taught to answer “Speak; for your servant hears” (10), he receives hard news about Eli’s house (3:9–14). Samuel grows into prophet and judge, anoints Saul then David, and dies mourned by all Israel (7:15–17; 25:1).',
      more:'Read 1 Samuel 3 with 15:22–23, where obedience outranks sacrifice. Samuel crowns kings yet rebukes them; his grief over Saul (15:35; 16:1) shows a prophet who loves whom he must confront.',
      source:'https://ebible.org/eng-web/1SA03.htm'
    },
    'person-saul': {
      reference:'1 Samuel 15:22',
      title:'Who was Saul?',
      copy:'Saul, tall and impressive, is anointed Israel’s first king and wins early battles (10:24; 11). Disobedience at Gilgal and sparing Amalek’s best cost him the kingdom: “to obey is better than sacrifice” (13:13–14; 15:22–23). Tormented and jealous, he hunts David for years and dies on Gilboa (31).',
      more:'Read 1 Samuel 15:20–23 with 16:14. Saul’s excuses—“the people,” “for sacrifice”—reveal the pattern: partial obedience framed as devotion. His tragedy warns that gifts without surrender curdle.',
      source:'https://ebible.org/eng-web/1SA15.htm'
    },
    passover: {
      reference:'Exodus 12:13',
      title:'The Passover in Exodus 12',
      copy:'On the night of the final plague each household takes an unblemished lamb, daubs its blood on doorposts, and eats dressed for travel (3–11). “When I see the blood, I will pass over you” (13). At midnight the firstborn of Egypt die and Israel is thrust out (29–31).',
      more:'Read Exodus 12:1–13 with 12:21–28. No leaven, bitter herbs, haste: the meal remembers rescue, not cuisine. Christians hear the passage fulfilled as “Christ, our Passover, has been sacrificed” (1 Corinthians 5:7).',
      source:'https://ebible.org/eng-web/EXO12.htm'
    },
    cana: {
      reference:'John 2:11',
      title:'Cana in John 2',
      copy:'At a wedding in Cana the wine runs out; at Mary’s word Jesus has jars filled with water, and the master tastes vintage (3–9). John calls it the first of his signs, revealing glory—and the disciples believe (11). Need, even festive need, is worth bringing.',
      more:'Read John 2:1–11 together. “My hour has not yet come.” Yet mercy moves early (4). Six stone jars for purification become abundance: the old order’s vessels carry the new wine. Joy here is no afterthought to faith.',
      source:'https://ebible.org/eng-web/JHN02.htm'
    },
    kingdom: {
      reference:'Mark 1:15',
      title:'The kingdom in Mark 1',
      copy:'Jesus announces the kingdom of God at hand and calls for repentance and belief (14–15). His parables picture it as treasure hidden, a mustard seed grown, yeast working through dough (Matthew 13:44–46, 31–33). Already breaking in, not yet complete: the King present, the fullness awaited.',
      more:'Read Mark 1:14–15 with Matthew 13:31–33. Small beginnings with unstoppable growth is the pattern. Seeking the kingdom first reorders everything else (Matthew 6:33); entering it stays childlike, not credentialed (Mark 10:15).',
      source:'https://ebible.org/eng-web/MRK01.htm'
    },
    ecclesiastes: {
      reference:'Ecclesiastes 12:13',
      title:'Ecclesiastes in Ecclesiastes 12',
      copy:'Qoheleth tests wisdom, pleasure, work and wealth, finding each “vanity”—vapor, here then gone (1:2; 2:1–11). Time orders all things under heaven (3:1–8). The book lands soberly: fear God and keep his commandments, for judgment comes (12:13–14). Meaning is received, not manufactured.',
      more:'Read Ecclesiastes 12:9–14 with 3:11, which sets eternity in human hearts. The book refuses both despair and pep talks; enjoyment of ordinary gifts sits beside accountability. Honest about death, it points past death.',
      source:'https://ebible.org/eng-web/ECC12.htm'
    },
    'person-jacob': {
      reference:'Genesis 28:17',
      title:'Who was Jacob?',
      copy:'Jacob the grasping younger twin buys birthright, steals blessing, and flees Esau (25:29–34; 27). At Bethel he dreams of a stairway to heaven and wakes: “How awesome this place is!” (28:10–17). Renamed Israel after wrestling God, he limps home reconciled (32–33).',
      more:'Read Genesis 28:10–17 with 32:24–31. God’s promise precedes Jacob’s bargain (28:13–15, 20–22)—grace first, deal-making answered with presence. The schemer becomes a patriarch not by improving but by being held.',
      source:'https://ebible.org/eng-web/GEN28.htm'
    },
    salvation: {
      reference:'Acts 16:31',
      title:'How can I be saved?',
      copy:'The Philippian jailer, trembling, asks Paul and Silas, “Sirs, what must I do to be saved?” The answer: “Believe in the Lord Jesus Christ, and you will be saved” (30–31). He washes their wounds, is baptized, and rejoices with his household (33–34). Believing here means entrusting oneself, with a changed life following—not a magic sentence.',
      more:'Read Acts 16:25–34 together. Praise in prison precedes the earthquake (25–26). Ephesians 2:8–9 grounds it: saved by grace through faith, not works; Romans 10:9 joins confessing and believing. Assurance rests on Christ’s work, not feeling saved strongly enough.',
      source:'https://ebible.org/eng-web/ACT16.htm'
    },
    marriage: {
      reference:'Genesis 2:24',
      title:'Marriage in Genesis 2',
      copy:'God makes a helper fit for Adam; the two become one flesh (18, 24). Jesus quotes this against casual divorce: what God joined, man must not separate (Matthew 19:4–6). Ephesians 5 pictures husband and wife after Christ and the church (25, 32). Companionship here precedes children or commands.',
      more:'Read Genesis 2:18–25 together. Leaving “his father and his mother” founds a new loyalty (24). The Bible also honors singleness (1 Corinthians 7:7–8), so marriage is blessing, not requirement. Hard marriages are addressed with permanence and tenderness, never with permission for harm.',
      source:'https://ebible.org/eng-web/GEN02.htm'
    },
    friendship: {
      reference:'John 15:13',
      title:'Friendship in John 15',
      copy:'Greater love has no one than laying down life for friends (13); Jesus calls obedient disciples friends, not servants (14–15). Proverbs agrees: a friend loves at all times (17:17), and faithful are the wounds of a friend (27:6). David and Jonathan model it—soul knit to soul (1 Samuel 18:1–3).',
      more:'Read John 15:12–15 together. Friendship with Jesus patterns ours: chosen, honest, sacrificial. It differs from networking (which uses) and from flattery (which wounds sweetly, Proverbs 27:6). One deep friend outweighs many admirers.',
      source:'https://ebible.org/eng-web/JHN15.htm'
    },
    work: {
      reference:'Colossians 3:23',
      title:'Work in Colossians 3',
      copy:'Whatever you do, work heartily as for the Lord and not for men, knowing the reward comes from him (23–24). Work precedes the fall—man placed in the garden to work it (Genesis 2:15). Diligence honors God; career idolatry does not.',
      more:'Read Colossians 3:22–25 with Genesis 2:15 and 3:17–19. Work is good but groans under the curse: thorns with the harvest. Rest is commanded alongside it. Excellence for Christ’s sake, limits for creatureliness’ sake.',
      source:'https://ebible.org/eng-web/COL03.htm'
    },
    money: {
      reference:'Matthew 6:21',
      title:'Money in Matthew 6',
      copy:'Treasures in heaven, not earth, where moth and rust destroy (19–20); where your treasure is, your heart follows (21). No one can serve God and mammon (24). Timothy adds that the love of money roots all kinds of evil, while contentment with godliness is great gain (1 Timothy 6:6, 10).',
      more:'Read Matthew 6:19–24 together. Wealth itself is not condemned—Abraham, Job and Joseph of Arimathea held much. The line is mastery versus service: generosity moves treasure heavenward (see 2 Corinthians 9:6–8). Anxious hoarding and reckless spending both signal a master problem.',
      source:'https://ebible.org/eng-web/MAT06.htm'
    },
    despair: {
      reference:'1 Kings 19:5',
      title:'Despair in 1 Kings 19',
      copy:'Elijah, fresh from Carmel’s victory, flees Jezebel, sits under a broom tree and asks to die (3–4). God sends no rebuke: an angel feeds him twice for the journey (5–8). Then comes the low whisper—presence, not spectacle (11–12). Despair here meets sleep, food and God before any new mission.',
      more:'Read 1 Kings 19:4–12 together. “It is enough” is answered with cake and rest, then a forty-day walk, then listening. Practical help is welcome alongside prayer; neither replaces the other. The feeling is met, then gently redirected to work (15–16).',
      source:'https://ebible.org/eng-web/1KI19.htm'
    },
    'person-samson': {
      reference:'Judges 16:28',
      title:'Who was Samson?',
      copy:'Samson, Nazirite from the womb, tears a lion, poses riddles, and burns Philistine grain (Judges 14–15). Delilah coaxes his secret; shorn and blinded, he grinds in prison (16:17–21). His final prayer brings the temple down on rulers and himself (28–30). Flawed deliverer: God uses him, sin costs him his eyes.',
      more:'Read Judges 16 with 13:5, where the vow precedes his birth. Strength consecrated yet spent on appetite is the pattern; grace answers even late (16:28). Samson warns more than he models—gifts without surrender end in rubble, though mercy meets him there.',
      source:'https://ebible.org/eng-web/JDG16.htm'
    },
    'person-stephen': {
      reference:'Acts 7:59',
      title:'Who was Stephen?',
      copy:'Stephen, full of faith and the Spirit, serves tables and disputes with wisdom no one withstands (6:8–10). Hauled before the council, he retells Israel’s story as resistance to God, sees Jesus standing, and dies forgiving his killers in Christ’s own words (7:51–60). Saul approves—and the persecutor has witnessed the first martyr (8:1).',
      more:'Read Acts 6:8–7:60, or 7:51–60 for the close. “Lord Jesus, receive my spirit” and “Lord, don’t hold this sin against them!” echo the cross (7:59–60). Stephen’s speech indicts before it comforts; read the whole arc, not only the stoning.',
      source:'https://ebible.org/eng-web/ACT07.htm'
    },
    'person-barnabas': {
      reference:'Acts 4:36',
      title:'Who was Barnabas?',
      copy:'Joseph, called Barnabas—“Son of Encouragement”—sells a field for the needy (4:36–37). When all fear the converted Saul, Barnabas vouches for him (9:26–27). Split with Paul over Mark, he takes Mark—and Paul’s last letter asks for Mark as useful (15:37–39; 2 Timothy 4:11). Encouragement as advocacy with money and reputation.',
      more:'Read Acts 4:34–37 with 9:26–27. Barnabas spends credibility on people others write off, twice. The church is built by such second chances: Paul needed a sponsor, Mark needed a comeback. Look for whom to vouch for next.',
      source:'https://ebible.org/eng-web/ACT04.htm'
    },
    'person-eve': {
      reference:'Genesis 3:20',
      title:'Who was Eve?',
      copy:'Eve, formed from Adam’s side as helper, is deceived by the serpent and shares the fruit (3:1–6). Shame and blame follow; so does the first gospel promise—a seed who will crush the serpent (14–15). Adam names her Eve, mother of all living (20). Origin of sin and first promise arrive together.',
      more:'Read Genesis 3 with Romans 5:12–19, where Adam and Christ stand as two heads. Interpreters differ on details but agree on fall and promised rescuer. Eve’s story is tragedy with a rescue already announced inside it.',
      source:'https://ebible.org/eng-web/GEN03.htm'
    },
    leviticus: {
      reference:'Leviticus 19:2',
      title:'Leviticus in Leviticus 19',
      copy:'“You shall be holy; for I, Yahweh your God, am holy” opens a chapter of concrete neighbor commands: honest scales, gleanings for the poor, no hatred, love of neighbor (2, 9–18). Holiness here is distinct, everyday practice—not mystique. Sacrifice and purity laws surround it, all bending toward a consecrated people.',
      more:'Read Leviticus 19:1–18 together. Jesus quotes “love your neighbor” from verse 18 as second greatest (Matthew 22:39). Christians differ on which ceremonial details carry forward, but the moral grain—justice, mercy, honesty—stands. Holiness attracts before it separates.',
      source:'https://ebible.org/eng-web/LEV19.htm'
    },
    numbers: {
      reference:'Numbers 21:8',
      title:'Numbers in Numbers 21',
      copy:'In the wilderness Israel grumbles and fiery serpents bite; Moses prays, and God orders a bronze serpent lifted on a pole—whoever looks, lives (4–9). The book of testing and murmuring holds this strange grace: salvation by looking. Jesus claims the picture for himself, lifted up (John 3:14–15).',
      more:'Read Numbers 21:4–9 together. Complaining precedes consequence, yet repentance meets provision, not lecture. The census lists and desert routes around it record a God who keeps count of a wandering people. Looking—trusting what God lifted—remains the whole motion.',
      source:'https://ebible.org/eng-web/NUM21.htm'
    },
    davidcovenant: {
      reference:'2 Samuel 7:16',
      title:'God’s promise to David in 2 Samuel 7',
      copy:'David, settled in his palace, plans God a house; God reverses it—I will make YOU a house (5, 11). An offspring will build the temple, and the throne will stand forever (12–13, 16). David answers with stunned, grateful prayer (18–29). The promise outgrows Solomon and lands on Christ, David’s greater son.',
      more:'Read 2 Samuel 7:8–16 together. Taken from pasture, given rest, promised a name—and then a dynasty no enemy ends. Luke’s annunciation echoes it: the Son given David’s throne forever (Luke 1:32–33). Covenant here is God binding himself, not negotiating.',
      source:'https://ebible.org/eng-web/2SA07.htm'
    },
    'person-elisha': {
      reference:'2 Kings 5:14',
      title:'Who was Elisha?',
      copy:'Elisha asks a double portion of Elijah’s spirit and watches him taken up (2 Kings 2:9–12). His ministry overflows: purifying water, multiplying oil, raising a boy—and healing Naaman the Syrian commander, who must dip seven times in the Jordan and rises clean (5:14). Power paired with servants’ errands.',
      more:'Read 2 Kings 5:1–15 together. Naaman’s rage at simplicity—no spectacle, just dipping—meets grace through obedience (11–14). Gehazi’s greed for the refused gift earns the disease Naaman lost (25–27). Elisha shows God working through Israel’s enemies and Israel’s prophets alike.',
      source:'https://ebible.org/eng-web/2KI05.htm'
    },
    genealogies: {
      reference:'Matthew 1:1',
      title:'Why the genealogies?',
      copy:'Matthew opens with a list—Abraham to David to exile to Christ, fourteen each (1:1–17). Chronicles devotes nine chapters to names. The lists prove covenant continuity: promises made to real people arrive in a real descendant. Tamar, Rahab, Ruth and Bathsheba appear—outsiders and sinners inside grace’s line.',
      more:'Read Matthew 1:1–17 slowly once. Three fourteens structure memory, not biology trivia; “begat” skips generations as ancient lists do. If names blur, hold the point: God keeps records, keeps promises, and writes unexpected people into them—including, by faith, you.',
      source:'https://ebible.org/eng-web/MAT01.htm'
    },
    ezra: {
      reference:'Ezra 7:10',
      title:'Ezra in Ezra 7',
      copy:'Ezra the scribe “set his heart to seek Yahweh’s law, and to do it, and to teach” (7:10). Returned exiles rebuild the altar and temple amid opposition; later Ezra reads the law aloud and the people weep, then feast (Nehemiah 8). Study, practice, teaching—in that order.',
      more:'Read Ezra 7:6–10 together. Skilled in the law, favored by the king, Ezra still prepares his heart first. Revival here runs through opened books and obeyed words, not spectacle. Bring a notebook to Scripture; Ezra would approve.',
      source:'https://ebible.org/eng-web/EZR07.htm'
    },
    nehemiah: {
      reference:'Nehemiah 8:10',
      title:'Nehemiah in Nehemiah 8',
      copy:'Returned exiles rebuild Jerusalem’s walls in fifty-two days despite mockery and threats (6:15; 4:1–6). Then Ezra reads the law; the people weep, and Nehemiah answers: “the joy of Yahweh is your strength” (8:9–10). Walls first, then worship—security serving gladness, not replacing it.',
      more:'Read Nehemiah 8:9–12 together. Conviction turns to feasting the same day; holy grief and holy joy share one service. Nehemiah the cupbearer-governor shows administration as ministry: prayer, planning, opposition, completion (1:4; 2:17–18).',
      source:'https://ebible.org/eng-web/NEH08.htm'
    },
    song: {
      reference:'Song of Solomon 8:7',
      title:'The Song in Song 8',
      copy:'A wedding-song dialogue of longing, delight and union: “Many waters can’t quench love, neither can floods drown it” (8:7). The church has read it as Christ’s love for his people and as God’s blessing on married love—both, without embarrassment. Desire here is celebrated inside covenant.',
      more:'Read Song 8:6–7 together. Love is “strong as death”; jealousy “as cruel as Sheol”—total, exclusive, costly. Set a seal upon the heart (6). However allegorized, the surface stands: human love at its best images divine pursuing love.',
      source:'https://ebible.org/eng-web/SNG08.htm'
    },
    lamentations: {
      reference:'Lamentations 3:22',
      title:'Lamentations in Lamentations 3',
      copy:'Over ruined Jerusalem the poet weeps—“How the city sits solitary” (1:1)—yet mid-book recalls hope: Yahweh’s mercies never end, new every morning; great is his faithfulness (3:22–23). Grief fully voiced, then dawn remembered inside darkness. Complaint and confidence share one breath.',
      more:'Read Lamentations 3:19–24 together. “My soul still remembers them,” then “This I recall to my mind; therefore I have hope” (20–21). Waiting quietly for salvation closes the turn (26). Lament here is worship’s minor key, not unbelief.',
      source:'https://ebible.org/eng-web/LAM03.htm'
    },
    drybones: {
      reference:'Ezekiel 37:10',
      title:'Dry bones in Ezekiel 37',
      copy:'Ezekiel sees a valley of very dry bones and hears, “Son of man, can these bones live?” (3). Prophesying as commanded, he watches breath enter and an exceeding army stand (7–10). God explains: exiled Israel, dead in hope, will live by his Spirit (11–14). Resurrection previewed for a nation—and for all.',
      more:'Read Ezekiel 37:1–14 together. Word then breath: preaching before Spirit-wind, both God’s work through the prophet. “Our bones are dried up, and our hope is lost” is quoted before it is answered (11). Despair gets a vision, then a promise, then the Spirit.',
      source:'https://ebible.org/eng-web/EZK37.htm'
    },
    hosea: {
      reference:'Hosea 11:1',
      title:'Hosea in Hosea 11',
      copy:'God orders Hosea to marry unfaithful Gomer, picturing Israel’s adultery (1–3). Yet: “called my son out of Egypt” (11:1); taught to walk, healed, drawn “with ties of love” (3–4). Judgment threatened, compassion kindled—“How can I give you up, Ephraim?” (8). Love that will not let go, pursued at full cost (3:1–3).',
      more:'Read Hosea 11:1–9 together. Wrath and tenderness collide and tenderness wins the argument. Matthew hears Egypt’s call fulfilled in Christ’s return (Matthew 2:15). If unfaithfulness feels final, Hosea buys back.',
      source:'https://ebible.org/eng-web/HOS11.htm'
    },
    amos: {
      reference:'Amos 5:24',
      title:'Amos in Amos 5',
      copy:'Amos the shepherd thunders against comfortable religion: God despises feasts and songs from unjust hands (21–23). “But let justice roll on like rivers, and righteousness like a mighty stream” (24). Worship without justice is noise; the famous line is God’s, not a slogan.',
      more:'Read Amos 5:21–24 together. Burnt offerings rejected while the poor are trampled (11–12). The verse outlives every cause that borrows it—read it first as God’s grief over rigged scales and crushed needy, then let it search any traduzido activism, left or right.',
      source:'https://ebible.org/eng-web/AMO05.htm'
    },
    micah: {
      reference:'Micah 6:8',
      title:'Micah in Micah 6',
      copy:'“What does Yahweh require of you, but to act justly, to love mercy, and to walk humbly with your God?” (6:8). Sacrifices by thousands cannot buy what a bent life gives (6–7). Justice, mercy, humility—three words holding the whole law’s weight, quoted wherever faith grows cold or cruel.',
      more:'Read Micah 6:6–8 together. The questions escalate—calves, thousands of rams, firstborn—until God interrupts with simplicity. Bethlehem’s ruler is promised two chapters later (5:2), read at Christ’s birth (Matthew 2:6). Small verse, whole religion.',
      source:'https://ebible.org/eng-web/MIC06.htm'
    },
    habakkuk: {
      reference:'Habakkuk 2:4',
      title:'Habakkuk in Habakkuk 2',
      copy:'Habakkuk complains at violence unanswered, then watches: God is raising Babylon (1:2–6). Stunned, he stations himself to hear—and receives “the righteous will live by his faith” (2:4), quoted three times in the New Testament. The book ends singing in famine (3:17–19). Questions carried, not buried.',
      more:'Read Habakkuk 2:2–4 with 3:17–19. Write the vision plainly; wait for it (2–3). No figs, no grapes, no cattle—“yet I will rejoice” (17–18). Faith here is a watching post in confusing times, ending in joy without updated circumstances.',
      source:'https://ebible.org/eng-web/HAB02.htm'
    },
    galatians: {
      reference:'Galatians 5:1',
      title:'Galatians in Galatians 5',
      copy:'“Stand firm therefore in the liberty by which Christ has made us free”—no yoke of bondage again (5:1). Paul wars against law-keeping as the way to stand right: circumcision-obligation severs from grace (2–4). Freedom’s use is love serving (13); its fruit is Spirit-grown (22–23).',
      more:'Read Galatians 5:1–6 with 2:20–21. If righteousness came by law, Christ died for nothing (2:21)—the letter’s sharpest edge. Liberty is not license: bite-and-devour freedom consumes itself (15). Stand, love, walk by the Spirit.',
      source:'https://ebible.org/eng-web/GAL05.htm'
    },
    timothy: {
      reference:'1 Timothy 4:12',
      title:'Timothy in 1 Timothy 4',
      copy:'Paul charges young Timothy: “Let no man despise your youth; but be an example to those who believe, in word, in your way of life, in love, in spirit, in faith, and in purity” (4:12). Guard the teaching, watch your life, keep preaching (4:13–16). Money’s love, elders’ honor, widows’ care—the letter is a pastor’s manual in miniature.',
      more:'Read 1 Timothy 4:11–16 together. Example outranks age; progress should be evident to all (15). Later Paul, near death, still calls for the cloak, the books, the parchments—and Mark (2 Timothy 4:11–13). Finish faithful, finish learning.',
      source:'https://ebible.org/eng-web/1TI04.htm'
    },
    holyspirit: {
      reference:'John 14:16',
      title:'The Holy Spirit in John 14',
      copy:'Jesus promises “another Counselor”—the Spirit of truth, with believers forever (16–17). He will teach all things and remind them of Christ’s words (26); convict the world (16:8); guide into all truth (16:13). Not a force but a person: he speaks, hears, shows, glorifies Christ.',
      more:'Read John 14:15–17 with 16:12–14. The Spirit never spotlights himself—“He will glorify me” (16:14). At Pentecost the promise lands with wind, fire and languages (Acts 2:1–4). Seek his filling (Ephesians 5:18); test every spirit (1 John 4:1).',
      source:'https://ebible.org/eng-web/JHN14.htm'
    },
    bibletrust: {
      reference:'2 Timothy 3:16',
      title:'Is the Bible trustworthy?',
      copy:'“Every Scripture is God-breathed”—written through human authors, authored by God—profitable for teaching, reproof, correction, training (3:16). It makes the reader “thoroughly equipped for every good work” (17). Timothy knew these sacred writings from childhood (15). Reliability rests on God’s breath, not paper’s age.',
      more:'Read 2 Timothy 3:14–17 together. Continue in what you learned, Paul says, while evil men worsen (13–14). Peter agrees: no prophecy came by human will; men spoke carried by the Spirit (2 Peter 1:20–21). Trust grows by use—read it to find it true.',
      source:'https://ebible.org/eng-web/2TI03.htm'
    },
    miracles: {
      reference:'John 20:30',
      title:'Did Jesus really do miracles?',
      copy:'John admits many signs go unrecorded—“these are written that you may believe that Jesus is the Christ, the Son of God” (20:30–31). Water to wine, healings, feedings, Lazarus: signs, not tricks—each revealing glory and meeting need. The resurrection stands chief, witnessed by skeptics-turned-martyrs.',
      more:'Read John 20:30–31 with 2:11 and 11:43–44. Signs aim at belief and life, not spectacle; demanding more signs from sufficiency is rebuked (Matthew 12:39). Honest doubt is answered with evidence and an invitation—“Don’t be unbelieving, but believing” (20:27).',
      source:'https://ebible.org/eng-web/JHN20.htm'
    },
    earlychurch: {
      reference:'Acts 2:42',
      title:'The early church in Acts 2',
      copy:'Three thousand baptized devote themselves to apostles’ teaching, fellowship, breaking bread and prayers (42). Goods shared, needs met, gladness at table, God adding daily (44–47). No buildings, budgets or brands—word, meal, prayer, generosity, growth.',
      more:'Read Acts 2:42–47 together. Awe and favor bookend the paragraph (43, 47). The pattern convicts program-heavy churches and encourages small ones: devotion scales better than production. Start with the four devotions; watch what God adds.',
      source:'https://ebible.org/eng-web/ACT02.htm'
    },
    demons: {
      reference:'Mark 5:15',
      title:'Demons in Mark 5',
      copy:'Among tombs a man possessed by Legion—supernaturally strong, self-harming, un tamable—meets Jesus (1–5). At Christ’s word the spirits enter swine and drown; the man sits clothed and in his right mind (13–15). Authority, not negotiation: unclean spirits obey and leave.',
      more:'Read Mark 5:1–15 together. Jesus asks the name, permits the request, restores the man—then sends him to witness at home (19). Take evil seriously without fascination: resist (James 4:7), confess, seek mature help and prayer. Spectacle serves the man’s restoration, never itself.',
      source:'https://ebible.org/eng-web/MRK05.htm'
    },
    pride: {
      reference:'Proverbs 16:18',
      title:'Pride and humility in Proverbs 16',
      copy:'“Pride goes before destruction, and an arrogant spirit before a fall” (18). God opposes the proud but gives grace to the humble (James 4:6). Christ models the cure: equality with God, yet self-emptied to a cross (Philippians 2:5–8). Humility is truth about self before God—neither groveling nor swagger.',
      more:'Read Proverbs 16:18–19 with Philippians 2:3–8. Better lowly with the poor than dividing spoil with the proud (19). Practice hidden service, quick confession, and celebrating others’ wins. Pride hides; humility can be examined—and healed.',
      source:'https://ebible.org/eng-web/PRO16.htm'
    },
    lust: {
      reference:'Matthew 5:28',
      title:'Lust in Matthew 5',
      copy:'Jesus internalizes adultery: looking with lust is adultery in the heart (28). Then the shocking counsel—tear out the offending eye—pictures ruthless prevention over casual management (29–30). Job made a covenant with his eyes (Job 31:1). Flee, don’t flirt: Joseph ran (Genesis 39:12).',
      more:'Read Matthew 5:27–30 together. The standard exposes every heart, driving sinners to grace rather than despair. Practical holiness: cut sources, confess quickly, invite accountability, fill the gaze with better loves. Shame hides; confession to God and trusted others heals.',
      source:'https://ebible.org/eng-web/MAT05.htm'
    },
    'person-isaac': {
      reference:'Genesis 22:12',
      title:'Who was Isaac?',
      copy:'Isaac, the laughed-for son of promise, carries the wood of his own sacrifice up Moriah (22:6). Abraham answers that “God will provide himself the lamb” (8)—and the ram appears (13). The angel stops the knife: now it is known Abraham fears God (12). Promise tested, provided, confirmed.',
      more:'Read Genesis 22:1–14 together. Isaac’s near-silence through it all—carrying, asking, bound—prefigures Another Son who would not be spared (Romans 8:32). Hebrews counts Abraham reasoning resurrection (Hebrews 11:17–19). The mountain is renamed: Yahweh Will Provide (14).',
      source:'https://ebible.org/eng-web/GEN22.htm'
    },
    'person-deborah': {
      reference:'Judges 4:4',
      title:'Who was Deborah?',
      copy:'Deborah the prophetess judges Israel under her palm tree; disputants come for her word (4:4–5). She summons Barak, orders the Kishon battle, and rebukes his fear-conditioned obedience (6–9). Jael finishes Sisera; Deborah sings the victory (5). Leader, strategist, poet—God using whom he chooses.',
      more:'Read Judges 4:4–9 with her song in 5:1–7. Mother in Israel arose when warriors ceased (5:7). Barak’s “if you go” costs him the honor (4:9)—faith that needs company still counts, but wholeheartedness sings louder. Courage takes counsel, then acts.',
      source:'https://ebible.org/eng-web/JDG04.htm'
    },
    'person-joshua': {
      reference:'Joshua 24:15',
      title:'Who was Joshua?',
      copy:'Moses’ aide becomes Israel’s commander: spying in faith (Numbers 14:6–9), parting the Jordan, circling Jericho (Joshua 3–6). After conquest and division he charges the tribes: “as for me and my house, we will serve Yahweh” (24:15). He dies at 110, faithful to the end (24:29–31).',
      more:'Read Joshua 24:14–18 together. “choose today” follows a history recital (2–13)—decision grounded in memory. The people agree, then waver within a generation (Judges 2:10). Resolve needs rehearsal: remember, choose, repeat.',
      source:'https://ebible.org/eng-web/JOS24.htm'
    },
    minorprophets: {
      reference:'Zechariah 1:3',
      title:'The Minor Prophets',
      copy:'Twelve short books from Hosea to Malachi—Obadiah, Nahum, Zephaniah, Haggai, Zechariah among them—preach judgment and hope to kings and commoners. The refrain runs: “Return to me, and I will return to you” (Zechariah 1:3). A remnant, a Day, a coming King.',
      more:'Read Zechariah 1:1–6 together. Former prophets’ words outlived their hearers (5–6). Each minor prophet carries one burden—Nineveh’s fall, rebuilt temples, coming silence broken by John. Small books, whole counsel: God judges, God keeps, God comes.',
      source:'https://ebible.org/eng-web/ZEC01.htm'
    },
    titus: {
      reference:'Titus 2:11',
      title:'Titus in Titus 2',
      copy:'Paul leaves Titus in Crete to appoint elders in every city (1:5), then teaches that “the grace of God has appeared, bringing salvation to all men” (2:11). Sound doctrine shapes households, workers and citizens (2:1–10). Good works follow, never lead (3:8).',
      more:'Read Titus 2:11–14 together. Grace teaches and the blessed hope steadies (13). Older teach younger, masters are served with respect—ordinary life as theology’s proof. Awaiting Christ purifies present conduct.',
      source:'https://ebible.org/eng-web/TIT02.htm'
    },
    mark: {
      reference:'Mark 10:45',
      title:'Mark in Mark 10',
      copy:'The shortest gospel moves fast—“immediately” everywhere. John Mark, Barnabas’ cousin, restored after failure, writes Peter’s memories: a servant Christ who “came not to be served, but to serve, and to give his life as a ransom for many” (10:45). Action with the cross always in view.',
      more:'Read Mark 10:42–45 together. Gentile greatness domineers; kingdom greatness serves (43–44). Mark ends breathless women at the tomb in the earliest text (16:8)—fear met by resurrection news. Serve first; understand as you go.',
      source:'https://ebible.org/eng-web/MRK10.htm'
    },
    luke: {
      reference:'Luke 19:10',
      title:'Luke in Luke 19',
      copy:'Luke the careful historian writes Theophilus so he may know certainty (1:1–4). His gospel seeks the lost: shepherds, a prodigal, a tax collector in a tree—“the Son of Man came to seek and to save that which was lost” (19:10). It closes with blessing at the ascension (24:50–53).',
      more:'Read Luke 19:1–10 together. Zacchaeus hurries down, hosts joyfully, repays fourfold (6, 8). Salvation comes to his house that day (9). Luke’s Jesus eats with outcasts throughout; every table anticipates the kingdom’s feast.',
      source:'https://ebible.org/eng-web/LUK19.htm'
    },
    justification: {
      reference:'Romans 5:1',
      title:'Justification in Romans 5',
      copy:'“Being therefore justified by faith, we have peace with God through our Lord Jesus Christ” (5:1). God reckoned Abraham righteous for believing (Genesis 15:6; Romans 4:3). Justification is God’s verdict—not guilty—received by trust, never earned by law-keeping (Galatians 2:16).',
      more:'Read Romans 5:1–5 together. Peace, access, hope that does not disappoint, love poured out (1–5). The verdict precedes the walk: assurance fuels obedience, never replaces it. If works justified, Christ died for nothing.',
      source:'https://ebible.org/eng-web/ROM05.htm'
    },
    sanctification: {
      reference:'1 Thessalonians 4:3',
      title:'Sanctification in 1 Thessalonians 4',
      copy:'“For this is the will of God: your sanctification”—abstain from sexual immorality, possess your vessel in honor (4:3–4). Set apart and growing holy: God has not called to uncleanness but gives his Spirit (7–8). Definitive break, progressive walk.',
      more:'Read 1 Thessalonians 4:1–8 together. Please God more and more (1). The call is plain, the power supplied. Sanctification shows in bodies, beds and business—holiness leaking into ordinary Tuesdays.',
      source:'https://ebible.org/eng-web/1TH04.htm'
    },
    redemption: {
      reference:'Ephesians 1:7',
      title:'Redemption in Ephesians 1',
      copy:'“In him we have our redemption through his blood, the forgiveness of our trespasses, according to the riches of his grace” (1:7). The Exodus lamb, the kinsman-redeemer, the slave market—all whisper it: bought back at blood-price. Forgiveness here is purchased, not overlooked.',
      more:'Read Ephesians 1:7–8 together. Riches of grace, lavished—redemption is God overspending to get us back. Ruth’s Boaz pictures it (Ruth 4:9–10). The redeemed belong doubly: made, then bought.',
      source:'https://ebible.org/eng-web/EPH01.htm'
    },
    atonement: {
      reference:'Leviticus 16:30',
      title:'Atonement in Leviticus 16',
      copy:'Once a year the high priest enters the holy of holies: one goat sacrificed, one sent away bearing sins (7–10, 21–22). “for on this day shall atonement be made for you, to cleanse you” (30). Hebrews sees Christ entering once for all with his own blood (9:12). Covering, then cleansing.',
      more:'Read Leviticus 16:29–31 with Hebrews 9:11–12. The old repetition proved its own insufficiency—daily, yearly, again. One offering perfected forever those being sanctified (Hebrews 10:14). Rest your conscience where God rested his requirement.',
      source:'https://ebible.org/eng-web/LEV16.htm'
    },
    'person-sarah': {
      reference:'Genesis 21:6',
      title:'Who was Sarah?',
      copy:'Barren into old age, Sarah laughs at the promise—then names her laughter joy: “God has made me laugh” when Isaac is born (18:12; 21:6). Her Hagar scheme births conflict (16; 21:9–10), yet Hebrews counts her faith for judging the Promiser faithful (Hebrews 11:11). Laughter doubting, then delighting.',
      more:'Read Genesis 21:1–7 together. At ninety, nursing a son—“Who would have said to Abraham that Sarah would nurse children?” (7). God’s timing mocks human schedules kindly. Sarah’s story permits bringing him our incredulity; he answers with impossible joy.',
      source:'https://ebible.org/eng-web/GEN21.htm'
    },
    'person-abigail': {
      reference:'1 Samuel 25:33',
      title:'Who was Abigail?',
      copy:'Abigail, wise wife of brutish Nabal, meets armed, insulted David with provisions and words: her plea turns four hundred swords (18, 23–31). “Blessed is your discretion,” David says (33). After Nabal’s death she becomes his wife (39–42). Wisdom disarming wrath—beauty with sense.',
      more:'Read 1 Samuel 25:32–35 together. Abigail names David’s future throne back to him mid-rage (30–31)—truth timed as rescue. Nabal’s name means fool, and he plays it (25). One wise person can stop a massacre; be that person.',
      source:'https://ebible.org/eng-web/1SA25.htm'
    }
  };
  // Registered note IDs keep follow-ups within the same bounded saved schema.
  // No free-form conversation or hidden personal inference is added.
  for(const [id,note] of Object.entries(notes)){
    notes[id+'-more']={reference:note.reference,title:'A closer look · '+note.title,copy:note.more,source:note.source};
    Object.freeze(note);Object.freeze(notes[id+'-more']);
  }
  Object.freeze(notes);
  const ranges=[
    ['Matthew',13,1,23,'parables'],['Romans',1,1,17,'romans'],
    ['Romans',8,18,39,'romans8'],['John',3,1,21,'john3'],
    ['John',13,1,17,'washingFeet'],['Jeremiah',29,1,14,'jeremiah29'],
    ['Philippians',4,10,20,'philippians4'],['Matthew',7,1,5,'judging'],
    ['Psalms',23,1,6,'psalm23'],['1 Corinthians',13,1,13,'love'],
    ['Matthew',6,5,15,'lordsprayer'],['Psalms',91,1,16,'psalm91'],
    ['Romans',3,21,31,'romans3'],['Genesis',1,1,31,'creation'],
    ['Mark',9,14,29,'doubt'],['1 Corinthians',11,17,34,'supper'],
    ['Romans',6,1,14,'baptism'],['Philippians',4,4,9,'worry'],
    ['2 Corinthians',12,1,10,'strength'],['Proverbs',3,1,12,'trust'],
    ['John',1,1,18,'person-jesus'],['Exodus',3,1,22,'person-moses'],
    ['Genesis',12,1,9,'person-abraham'],['1 Samuel',16,1,13,'person-david'],
    ['Luke',1,26,38,'person-mary'],['John',20,11,18,'person-magdalene'],
    ['Matthew',16,13,20,'person-peter'],['Acts',9,1,19,'person-paul'],
    ['1 Kings',3,5,14,'person-solomon'],['Esther',4,10,17,'person-esther'],
    ['Ruth',1,6,22,'person-ruth'],['Genesis',6,9,22,'person-noah'],
    ['1 Kings',18,30,40,'person-elijah'],['Daniel',6,10,23,'person-daniel'],
    ['Psalms',46,1,11,'refuge'],['Isaiah',41,8,13,'fearnot'],
    ['Matthew',5,1,12,'beatitudes'],['Exodus',20,1,21,'commandments'],
    ['Galatians',5,16,25,'fruit'],
    ['Ephesians',6,10,20,'armor'],['1 Corinthians',15,1,11,'resurrection'],
    ['Revelation',21,1,7,'heaven'],['Luke',15,11,32,'prodigal'],
    ['Luke',10,25,37,'neighbor'],
    ['Isaiah',40,27,31,'eagle'],['John',10,7,18,'shepherd'],
    ['John',15,1,11,'vine'],
    ['Psalms',1,1,6,'psalm1'],['Ecclesiastes',3,1,15,'seasons'],
    ['Matthew',7,7,14,'goldenrule'],
    ['1 Corinthians',12,4,11,'gifts'],['Matthew',3,13,17,'jesusbaptism'],
    ['Matthew',4,1,11,'tempted'],['Acts',2,1,13,'pentecost'],
    ['Matthew',2,1,12,'nativity'],['John',19,16,37,'cross'],
    ['Psalms',121,1,8,'hills'],['1 Peter',5,5,11,'castcare'],
    ['Joshua',1,1,9,'courage'],
    ['John',4,7,26,'well'],['Matthew',19,16,30,'ruler'],
    ['Luke',10,38,42,'martha'],['Matthew',14,22,33,'waves'],
    ['Matthew',26,36,46,'cup'],
    ['1 Samuel',17,41,50,'goliath'],['Daniel',3,16,28,'furnace'],
    ['Job',38,1,7,'whysuffer'],['Mark',2,23,28,'sabbath'],
    ['2 Corinthians',9,6,8,'giving'],['Matthew',28,16,20,'commission'],
    ['Matthew',17,14,21,'mustard'],['Luke',24,13,35,'emmaus'],
    ['Genesis',50,15,21,'joseph'],['Isaiah',53,1,9,'servant'],
    ['Matthew',25,14,30,'talents'],['Luke',19,1,10,'zacchaeus'],
    ['Matthew',21,1,11,'hosanna'],['Luke',23,39,43,'paradise'],
    ['Hebrews',12,1,3,'cloud'],['James',2,14,26,'works'],
    ['1 John',4,7,12,'godislove'],['2 Timothy',1,3,7,'fanflame'],
    ['Romans',8,31,39,'separate'],
    ['Psalms',27,1,6,'light'],['Psalms',139,13,18,'wonderfully'],
    ['Psalms',42,1,11,'deer'],['Psalms',103,1,5,'benefits'],
    ['Psalms',37,1,7,'delight'],['Proverbs',22,1,6,'trainup'],
    ['Exodus',16,13,26,'manna'],['Deuteronomy',6,4,9,'shema'],
    ['Joshua',6,1,20,'jericho'],['Judges',6,33,40,'gideon'],
    ['Hebrews',1,7,14,'angels'],['1 Peter',5,8,11,'satan'],
    ['Leviticus',19,1,28,'tattoos'],['Psalms',119,105,112,'readbible'],
    ['Nehemiah',8,1,12,'translations'],['Acts',3,11,26,'repent'],
    ['Romans',15,7,13,'hope'],['John',14,1,11,'waytruth'],
    ['Ephesians',2,11,22,'churchbody'],['John',4,19,26,'worship'],
    ['Matthew',6,1,18,'fasting'],['Matthew',12,22,37,'unforgivable'],
    ['1 Thessalonians',5,12,24,'soulspirit'],
    ['Matthew',28,16,20,'trinity'],['Mark',9,42,50,'hell'],
    ['2 Corinthians',5,1,10,'afterlife'],['Ephesians',1,3,14,'election'],
    ['Matthew',3,1,12,'johnbaptist'],['Matthew',26,14,16,'judas'],
    ['Exodus',3,1,10,'burningbush'],['Exodus',14,15,31,'redsea'],
    ['Exodus',7,14,25,'plagues'],['Acts',9,1,9,'damascus'],
    ['2 Corinthians',1,3,5,'comfort'],
    ['Revelation',1,1,8,'revelation'],['John',3,3,8,'bornagain'],
    ['Acts',1,6,11,'ascension'],['1 Thessalonians',4,13,18,'secondcoming'],
    ['Jeremiah',31,31,34,'newcovenant'],['Matthew',17,1,8,'transfiguration'],
    ['Deuteronomy',31,24,26,'pentateuch'],['Isaiah',6,1,8,'person-isaiah'],
    ['John',11,38,44,'person-lazarus'],['Job',1,20,22,'person-job'],
    ['Jonah',1,15,17,'person-jonah'],['Genesis',4,3,12,'cainabel'],
    ['Genesis',11,1,9,'babel'],['1 Samuel',3,1,10,'person-samuel'],
    ['1 Samuel',15,20,23,'person-saul'],['Exodus',12,1,13,'passover'],
    ['John',2,1,11,'cana'],['Mark',1,14,15,'kingdom'],
    ['Ecclesiastes',12,9,14,'ecclesiastes'],['Genesis',28,10,17,'person-jacob'],
    ['Acts',16,25,34,'salvation'],['Genesis',2,21,25,'marriage'],
    ['John',15,12,15,'friendship'],['Colossians',3,22,25,'work'],
    ['Matthew',6,19,24,'money'],['1 Kings',19,4,8,'despair'],
    ['Leviticus',19,1,4,'leviticus'],['Numbers',21,4,9,'numbers'],
    ['2 Samuel',7,12,16,'davidcovenant'],['2 Kings',5,9,15,'person-elisha'],
    ['Matthew',1,1,17,'genealogies'],['Ezra',7,8,10,'ezra'],
    ['Nehemiah',8,9,10,'nehemiah'],['Song of Solomon',8,6,7,'song'],
    ['Lamentations',3,22,24,'lamentations'],['Ezekiel',37,7,10,'drybones'],
    ['Hosea',11,1,4,'hosea'],['Amos',5,21,24,'amos'],
    ['Micah',6,6,8,'micah'],['Habakkuk',2,2,4,'habakkuk'],
    ['Galatians',5,1,6,'galatians'],['1 Timothy',4,11,14,'timothy'],
    ['John',14,15,17,'holyspirit'],['2 Timothy',3,14,17,'bibletrust'],
    ['John',20,30,31,'miracles'],['Acts',2,42,47,'earlychurch'],
    ['Mark',5,1,15,'demons'],['Proverbs',16,18,19,'pride'],
    ['Matthew',5,27,30,'lust'],['Genesis',22,9,14,'person-isaac'],
    ['Judges',4,4,9,'person-deborah'],
    ['Joshua',24,14,18,'person-joshua'],['Zechariah',1,1,6,'minorprophets'],
    ['Titus',2,11,14,'titus'],['Mark',10,42,45,'mark'],
    ['Luke',19,1,10,'luke'],['Romans',5,1,5,'justification'],
    ['1 Thessalonians',4,1,5,'sanctification'],['Ephesians',1,7,8,'redemption'],
    ['Leviticus',16,29,31,'atonement'],['Genesis',21,1,7,'person-sarah'],
    ['1 Samuel',25,32,35,'person-abigail']
  ];
  function contextId(reference,bible){
    const ref=bible?.parseReference(reference);
    if(!ref||ref.error||(ref.startVerse!==null&&(ref.startVerse<1||ref.endVerse<ref.startVerse)))return null;
    const match=ranges.find(([book,chapter,start,end])=>ref.book===book&&ref.chapter===chapter&&
      (ref.startVerse===null||(ref.startVerse>=start&&ref.endVerse<=end)));
    return match?match[4]:null;
  }
  function context(reference,bible){const id=contextId(reference,bible);return id?notes[id]:null;}
  function followUp(text){
    const simple=text.toLowerCase().replace(/[’']/g,'').replace(/[?!.,]+$/g,'').trim();
    return /^(?:(?:can|could|would) you |please )?(?:explain (?:that|this|it)(?: (?:verse|passage|chapter|more|further))?(?: (?:a bit )?(?:more|further|in (?:more )?detail|in context))?|(?:explain|tell me|say) more(?: (?:about (?:that|this|it)|in detail))?|go (?:a bit )?deeper|(?:more|a bit more) (?:detail|context)|what does (?:that|this|it)(?: (?:verse|passage))? mean|why (?:is|was|are|were|does|did) (?:that|this|it)(?: (?:so|important|true|relevant|like that|for me))?|how (?:does|do|did|is|was|will) (?:that|this|it)(?: work| help(?: me| us)?)?|what about (?:that|this|it)|(?:what is|whats) (?:the )?context|(?:and )?in (?:more )?detail)$/.test(simple);
  }
  function previousStudy(history,bible){
    // Only the immediate previous item is unambiguous. Do not jump over a new
    // question or a personal entry to borrow older, unrelated context.
    const study=Array.isArray(history)?history[0]?.study:null;
    if(study?.kind==='note'&&Object.hasOwn(notes,study.query)){
      const id=study.query.replace(/-more$/,'');return {kind:'note',query:id+'-more'};
    }
    if(study?.kind==='reference'){
      const ref=bible?.parseReference(study.query);if(!ref||ref.error)return null;
      const id=contextId(study.query,bible);
      return id?{kind:'note',query:id+'-more'}:{kind:'reference',query:ref.reference};
    }
    return null;
  }
  function metaMatch(text){
    // Library facts counted live from the included text, never generated.
    const lowered=String(text||'').trim().toLowerCase();
    if(/\bhow many books\b/.test(lowered))return 'books';
    if(/\bhow many chapters\b/.test(lowered))return 'chapters';
    if(/\bhow many verses\b/.test(lowered))return 'verses';
    return null;
  }
  function prepared(text){
    // An explicit search request stays a search, even when it names a topic
    // that also has a prepared note. Keep this deliberately narrow:
    // lived-experience questions still belong with the personal guides.
    if(/^(?:search(?: the bible)?(?: for)?|find(?: verses? (?:about|on|with))?|look up)\s+/i.test(text))return null;
    const definition=text.trim().replace(/[?!.]+$/,'').match(/^(?:what (?:is|does)|define|explain)\s+(?:(?:the bible mean by|biblical|christian)\s+)?(grace|faith|forgiveness|wisdom)(?:\s+(?:mean|in (?:the )?bible))?$/i);
    if(definition)return definition[1].toLowerCase();
    if(/\bwhy\b.*\bjesus\b.*\bparables?\b|\bwhy\b.*\bparables?\b.*\bjesus\b/i.test(text))return 'parables';
    const authorship=/\b(?:author|authorship|wrote)\b|\bwritten\s+by\b|\bwho\b.*\bwritten\b/i;
    if(/\bromans\b/i.test(text)&&(authorship.test(text)||/\b(?:whom|addressed)\b|\bwho\b.*\bromans\s+for\b|\bromans\b.*\bwritten\s+(?:to|for)\b/i.test(text)))return 'romans';
    if(/\bhebrews\b/i.test(text)&&authorship.test(text))return 'hebrewsAuthor';
    if(/\bpsalm\s*23\b|\b23rd psalm\b|the lord is my shepherd|valley of (?:the )?shadow|i shall not want/i.test(text))return 'psalm23';
    if(/\b1 ?cor(?:inthians)? 13\b|love is patient|love chapter|(?:what (?:is|does)|define|explain)\s+(?:biblical\s+)?love\s*\??$/i.test(text))return 'love';
    if(/\blord'?s prayer\b|our father in heaven|teach (?:us|me) to pray|\bwhat is prayer\b|how (?:do|should) (?:we|christians) pray/i.test(text))return 'lordsprayer';
    if(/\bpsalm\s*91\b|under his wings|refuge and fortress|no harm will|my refuge/i.test(text))return 'psalm91';
    if(/all have sinned|fall short of (?:the )?glory/i.test(text))return 'romans3';
    if(/who created (?:the )?(?:world|heavens|earth)|in the beginning god created|creation account|seven days of creation/i.test(text))return 'creation';
    if(/\bdoubting thomas\b|help my unbelief|what does the bible say about doubt/i.test(text))return 'doubt';
    if(/\blord'?s supper\b|last supper|what is communion|do this in remembrance|bread and (?:the )?wine/i.test(text))return 'supper';
    if(/\bwhat is baptism\b|baptism.{0,20}mean|why (get|be) baptized|infant baptism|\bbaptised\b/i.test(text))return 'baptism';
    if(/\bdo not be anxious\b|be anxious for nothing|peace.*guard.*heart|what does the bible say about (worry|anxiety)/i.test(text))return 'worry';
    if(/\bmy grace is sufficient\b|strength.*perfect.*weakness|power.*made perfect|thorn in (?:the )?flesh/i.test(text))return 'strength';
    if(/\btrust in the lord\b|lean not|acknowledge him|he will direct/i.test(text))return 'trust';
    if(/\bpsalm\s*46\b|god is (?:our )?refuge|a very present help|be still( and know)?\b/i.test(text))return 'refuge';
    if(/\bfear not\b|do not be afraid|be not dismayed|i am with you/i.test(text))return 'fearnot';
    if(/\bbeatitudes?\b|blessed are the poor|poor in spirit/i.test(text))return 'beatitudes';
    if(/\bten commandments\b|what are the commandments|bear false witness|do not lie|lying lips|you shall not steal|do not steal|you shall not murder|do not murder|do not commit adultery|do not covet|thou shalt not kill/i.test(text))return 'commandments';
    if(/\bfruit of (?:the )?spirit\b|what is joy/i.test(text))return 'fruit';
    if(/\barmor of god\b|full armor|belt of truth|shield of faith|sword of the spirit/i.test(text))return 'armor';
    if(/\bhe is risen\b|did jesus rise|resurrection of (?:jesus|christ)|rose from the dead|raised (?:him )?from the dead/i.test(text))return 'resurrection';
    if(/\bwhat is heaven like\b|streets of gold|new heaven|heaven.{0,20}(like|describe)/i.test(text))return 'heaven';
    if(/\bprodigal\b|lost son/i.test(text))return 'prodigal';
    if(/\bgood samaritan\b|who is my neighbou?r/i.test(text))return 'neighbor';
    if(/\brenew (?:their |our |my )?strength\b|mount up with wings|wait (?:for|upon|on) the lord|wings like eagles/i.test(text))return 'eagle';
    if(/\bgood shepherd\b|lay(?:s|ing)? down (?:his life|life)|i am the (?:good )?shepherd/i.test(text))return 'shepherd';
    if(/\bi am the vine\b|abide in me|remain in me|apart from me/i.test(text))return 'vine';
    if(/\bwhere was jesus born\b|born in bethlehem|wise men|three kings|nativity/i.test(text))return 'nativity';
    if(/\bit is finished\b|why did jesus die|died for (?:our |my |the )?sins?|the cross\b.{0,20}mean|crucifix/i.test(text))return 'cross';
    if(/\bi lift (?:up )?my eyes\b|my help comes from|where does my help/i.test(text))return 'hills';
    if(/\bcast (?:all )?(?:your|my) (?:anxiety|anxieties|cares?)\b|cast.*upon him|he cares for you/i.test(text))return 'castcare';
    if(/\bbe strong and courageous\b|be courageous|joshua 1:9/i.test(text))return 'courage';
    if(/\bliving water\b|woman at the well|samaritan woman|five husbands/i.test(text))return 'well';
    if(/\brich young ruler\b|what must i do to inherit|sell.*give.*follow|treasure in heaven/i.test(text))return 'ruler';
    if(/\bmartha and mary\b|\bmary has chosen\b|one thing is needed|distracted by (?:much )?serving/i.test(text))return 'martha';
    if(/\bwalk on water\b|why did peter sink|lord save me/i.test(text))return 'waves';
    if(/\bnot my will\b|gethsemane|watch and pray/i.test(text))return 'cup';
    if(/\bdavid and goliath\b|\bgoliath\b|five smooth stones|sling and stone|facing (?:the )?giant/i.test(text))return 'goliath';
    if(/\bfiery furnace\b|shadrach|meshach|abednego|fourth man in the fire/i.test(text))return 'furnace';
    if(/\bwhy does god allow (?:suffering|evil)\b|why do bad things happen|problem of evil|if god is good why/i.test(text))return 'whysuffer';
    if(/\bsabbath\b|day of rest.{0,20}command|remember the sabbath/i.test(text))return 'sabbath';
    if(/\bshould christians tithe\b|tithe|cheerful giver|god loves a cheerful|malachi|will a man rob|bring.*tithe.*storehouse/i.test(text))return 'giving';
    if(/\bgreat commission\b|go and make disciples|go therefore|make disciples of all nations|baptizing them/i.test(text))return 'commission';
    if(/\bmustard seed\b|faith as (?:small as a|a grain of)/i.test(text))return 'mustard';
    if(/\bemmaus\b|did not our hearts burn/i.test(text))return 'emmaus';
    if(/\bwho was joseph\b|tell me about joseph\b|\bcoat of many colors\b|joseph and his brothers|god meant it for good|what you meant for evil/i.test(text))return 'joseph';
    if(/\bnoah[’']s (?:flood|ark)\b|\bthe flood\b|\bgreat flood\b|\bflood\b.{0,12}\bnoah\b|\bnoah\b.{0,12}\bark/i.test(text))return 'person-noah';
    if(/\bsuffering servant\b|wounded for our|by his wounds|pierced for our/i.test(text))return 'servant';
    if(/\bparable of the talents\b|well done.*faithful|five talents|two talents/i.test(text))return 'talents';
    if(/\bzacchaeus\b|sycamore tree|salvation has come/i.test(text))return 'zacchaeus';
    if(/\bhosanna\b|triumphal entry|palm sunday|palm branches/i.test(text))return 'hosanna';
    if(/\bparadise\b|thief on the cross|today.*with me in|remember me\b.{0,20}(jesus|lord|kingdom)/i.test(text))return 'paradise';
    if(/\bgreat cloud\b|cloud of witnesses|lay aside.*weight|run with endurance|race set before/i.test(text))return 'cloud';
    if(/\bfaith without works\b|faith dead|show me.*faith|justified by works/i.test(text))return 'works';
    if(/\bgod is love\b|perfect love casts out|no fear in love/i.test(text))return 'godislove';
    if(/\bspirit of fear\b|power love.*sound mind|fan into flame|not given.*fear/i.test(text))return 'fanflame';
    if(/\bnothing can separate\b|neither death nor life|nor height nor depth/i.test(text))return 'separate';
    if(/\bministering spirits\b|guardian angels?|do angels protect|angel.*encamp/i.test(text))return 'angels';
    if(/\bwho is satan\b|is the devil real|lucifer|roaring lion|adversary.*devil/i.test(text))return 'satan';
    if(/\btattoo[s]?\b|marks on the body|print.*marks.*dead/i.test(text))return 'tattoos';
    if(/\bhow to read the bible\b|\bhow should i read the bible\b|where to start reading|where do i start reading|bible reading plan|how to study the bible/i.test(text))return 'readbible';
    if(/\bwhich translation\b|best translation|which bible should|kjv\b|esv\b|niv\b|bible.*translation.*differences/i.test(text))return 'translations';
    if(/\bwhat is repentance\b|how (to|do i) repent|repent of sins/i.test(text))return 'repent';
    if(/\bwhat is hope\b|biblical hope|hope against hope/i.test(text))return 'hope';
    if(/\bwhat is truth\b|i am the way\b|way truth and life/i.test(text))return 'waytruth';
    if(/\bwhat is the church\b|body of christ.*church|household of god/i.test(text))return 'churchbody';
    if(/\bwhat is worship\b|worship in spirit|true worshippers/i.test(text))return 'worship';
    if(/\bshould christians fast\b|fasting in secret|when you fast/i.test(text))return 'fasting';
    if(/unforgivable sin|blasphemy against the (holy )?spirit|eternal sin/i.test(text)&&!/what did .* mean by/i.test(text))return 'unforgivable';
    if(/\bsoul.*spirit.*difference\b|spirit soul (?:and|&) body|dividing.*soul/i.test(text))return 'soulspirit';
    if(/\btrinity\b|\btriune\b|three persons.{0,24}one god|one god.{0,24}three persons/i.test(text))return 'trinity';
    if(!/\bwhat the hell\b|\bhell (?:yeah|yes|no)\b/i.test(text)&&/\bhell\b|gehenna|outer darkness|lake of fire|weeping and gnashing/i.test(text))return 'hell';
    if(/\bafterlife\b|life after death|what happens (?:when|after) (?:we|you|i) die|absent.{0,12}body/i.test(text))return 'afterlife';
    if(/\bwhat is election\b|predestin|doctrine of election|chosen.{0,24}before.{0,24}foundation/i.test(text))return 'election';
    if(/\bjohn the baptist\b|john baptiz|the baptizer|behold the lamb|voice.{0,12}wilderness|baptism of repentance/i.test(text))return 'johnbaptist';
    if(/\bjudas\b|\biscariot\b|who betrayed jesus|betrayed (?:jesus|christ)(?:.{0,24}(?:silver|kiss))?|thirty pieces/i.test(text))return 'judas';
    if(/\bburning bush\b|bush.{0,12}(?:not |never )?consumed|take off.*sandals|holy ground/i.test(text))return 'burningbush';
    if(/\bred sea\b|redsea|parting.{0,12}sea|sea.{0,12}parted|pharaoh.{0,12}drowned|song of moses/i.test(text))return 'redsea';
    if(/\bten plagues\b|plagues.{0,12}egypt|egypt.{0,12}plagues|nile.{0,12}blood/i.test(text))return 'plagues';
    if(/\bdamascus\b|saul.{0,12}blind|why do you persecute|scales.{0,12}eyes|road to damascus/i.test(text))return 'damascus';
    if(/\bgod of (?:all )?comfort\b|what.{0,24}bible.{0,24}comfort|comfort.{0,12}those in trouble|comforted.{0,12}comfort/i.test(text))return 'comfort';
    if(/\brevelation\b|revelation.{0,24}about|apocalypse.{0,16}(?:john|bible|church)|seven churches/i.test(text))return 'revelation';
    if(/\bborn again\b|born of (?:water and )?(?:the )?spirit|you must be born|nicodemus.{0,16}born/i.test(text))return 'bornagain';
    if(/\bascension\b|taken up.{0,16}(?:heaven|cloud)|jesus.{0,16}ascend|stand.{0,12}gazing.{0,12}heaven/i.test(text))return 'ascension';
    if(/\bsecond coming\b|jesus.{0,20}come (?:back|again)|return of christ|day of the lord|thief in the night/i.test(text))return 'secondcoming';
    if(/\ball things work together|god works.*for good|providence|romans 8:28/i.test(text))return 'romans8';
    if(/\bnew covenant\b|cup.{0,16}new covenant|law.{0,12}on.*hearts|heart of flesh/i.test(text))return 'newcovenant';
    if(/\btransfiguration\b|transfigured|mount of transfiguration|jesus.{0,16}shone/i.test(text))return 'transfiguration';
    if(/\bwho wrote genesis\b|who wrote (?:the )?(?:pentateuch|torah|first five books)|moses.{0,20}wrote?.{0,20}(?:genesis|pentateuch|torah)|authorship.{0,16}(?:genesis|pentateuch)/i.test(text))return 'pentateuch';
    if(/\bwho was job\b|book of job|job.{0,16}(?:about|suffer)|job'?s (?:friends|comforters|wife)/i.test(text))return 'person-job';
    if(/\bwhat is blasphemy\b|\bblasphemy\b/i.test(text))return 'unforgivable';
    if(/\bhow can i be saved\b|what must i do to be saved|how.{0,16}be saved|believe.{0,16}lord jesus|are you saved|once saved|eternal security|can i be saved/i.test(text))return 'salvation';
    if(/\bwhat.{0,24}bible.{0,24}marri|marriage.{0,16}(?:bible|god|christ)|one flesh|leave.{0,10}father.{0,10}mother|wives.{0,16}husbands|husbands?.{0,16}love.{0,16}wives?/i.test(text))return 'marriage';
    if(/\bwhat.{0,24}bible.{0,24}friend|friendship|greater love.{0,20}lay down|greater love has no one|friend.{0,16}loves at all times|david and jonathan|who was jonathan|tell me about jonathan|lay down.*life.*friends/i.test(text))return 'friendship';
    if(/\bwhat.{0,24}bible.{0,24}work|work.{0,16}as for the lord|whatever you do.{0,16}heartily|\blazy\b|sluggard|slothful|diligent hands/i.test(text))return 'work';
    if(/\bwhat.{0,24}bible.{0,24}money|love of money|money.{0,16}root.{0,10}evil|treasures? in heaven|cannot serve.{0,16}mammon|contentment.{0,16}gain/i.test(text))return 'money';
    if(/\bwhat.{0,24}(?:bible|scripture).{0,24}depress|depress.{0,20}(?:bible|scripture|verse|psalm)|elijah.{0,24}(?:broom|juniper|despair|depress)|despair.{0,20}bible/i.test(text))return 'despair';
    if(/\bsamson\b.{0,20}(?:delilah|philistine|hair|lion|honey|jawbone)|delilah/i.test(text))return 'person-samson';
    if(/\bjonah\b.{0,20}(?:fish|whale|nineveh|tarshish)|nineveh.{0,16}repent|\bgreat fish\b/i.test(text)&&!/how many days/i.test(text))return 'person-jonah';
    if(/\bcain and abel\b|\bcain\b.{0,16}\babel\b|\babel\b.{0,16}\bcain\b|mark of cain|my brother[’']s keeper/i.test(text))return 'cainabel';
    if(/\btower of babel\b|\bbabel\b|confus.*language/i.test(text))return 'babel';
    if(/\bsamuel\b.{0,20}(?:saul|david|anoint)|call of samuel/i.test(text))return 'person-samuel';
    if(/\bsaul\b.{0,20}(?:david|pursu|spear|gilboa)|david.{0,20}fled.{0,12}saul/i.test(text))return 'person-saul';
    if(/\bpassover\b|when i see the blood|unleavened bread.{0,16}egypt|passover lamb/i.test(text))return 'passover';
    if(/\bwedding at cana\b|\bcana\b|water into wine|good wine.{0,16}kept|first (?:of his )?signs/i.test(text))return 'cana';
    if(/\bkingdom of (?:god|heaven)\b|what is the kingdom|thy kingdom come|kingdom.{0,16}at hand/i.test(text))return 'kingdom';
    if(/\becclesiastes\b|meaning of life|vanity of vanities|all is vanity|fear god.{0,16}commandments/i.test(text))return 'ecclesiastes';
    if(/\bjacob\b.{0,16}(?:ladder|bethel|esau|wrestl|dream)|bethel.{0,16}house of god/i.test(text))return 'person-jacob';
    if(/\bbabylonian exile\b|\bwhat was the exile\b|exile.{0,16}babylon|carried.{0,16}exile|seventy years.{0,16}(?:exile|captivity)/i.test(text))return 'jeremiah29';
    if(/\bwhat is leviticus\b|tell me about leviticus|book of leviticus|\bbe holy\b|be ye holy|what is holiness|purity laws|clean and unclean/i.test(text))return 'leviticus';
    if(/\bbook of numbers\b|what is numbers|numbers.{0,16}about|numbers.{0,20}wilderness|bronze serpent|brazen serpent|fiery serpents|\bbalaam\b|talking donkey/i.test(text))return 'numbers';
    if(/\bdavidic covenant\b|promise to david|throne.{0,16}forever|david.{0,16}house.{0,12}forever|2 samuel 7/i.test(text))return 'davidcovenant';
    if(/\belisha\b.{0,20}(?:naaman|jordan|double portion|chariots|mantle)|naaman|chariots of fire/i.test(text))return 'person-elisha';
    if(/\bgenealog|begat|lists? of names|fourteen generations|matthew 1 genealogy|abraham.{0,12}begat/i.test(text))return 'genealogies';
    if(/\bezra\b.{0,20}(?:scribe|law|rebuild|temple)|who was ezra|tell me about ezra|what about ezra|ezra reads|set his heart/i.test(text))return 'ezra';
    if(/\bnehemiah\b|rebuilt.{0,16}walls|walls.{0,16}rebuilt|joy of the lord|cupbearer/i.test(text))return 'nehemiah';
    if(/\bsong of solomon\b|song of songs|many waters.{0,16}quench|set me as a seal/i.test(text))return 'song';
    if(/\blamentations\b|great is thy faithfulness|new every morning|how lonely sits/i.test(text))return 'lamentations';
    if(/\bdry bones\b|valley of dry bones|can these bones live|breath.{0,16}four winds/i.test(text))return 'drybones';
    if(/\bhosea\b|\bgomer\b|out of egypt.*called.*son/i.test(text))return 'hosea';
    if(/\bamos\b|let justice roll|plumb line|what.{0,24}bible.{0,24}justice|justice.{0,16}rivers/i.test(text))return 'amos';
    if(/\bmicah\b|do justly|walk humbly|what is mercy|blessed are the merciful|mercy.{0,16}triumphs/i.test(text))return 'micah';
    if(/\bhabakkuk\b|just shall live by faith|righteous.{0,16}live by faith/i.test(text))return 'habakkuk';
    if(/\bgalatians\b|yoke of bondage|fallen from grace|faith working through love/i.test(text))return 'galatians';
    if(/\btimothy\b|despise.*youth|example.*believers|who was timothy|tell me about timothy/i.test(text))return 'timothy';
    if(/\bholy spirit\b|spirit of truth|another counselor|helper.{0,16}spirit|grieve.{0,12}spirit|quench.{0,12}spirit|filled with the spirit|baptism.{0,12}holy spirit/i.test(text))return 'holyspirit';
    if(/\bis the bible (?:true|reliable|trustworthy)\b|bible.{0,16}trustworthy|all scripture.*inspired|god-breathed|why trust the bible|inerran|infallible/i.test(text))return 'bibletrust';
    if(/\bmiracles\b|did jesus.*miracles|signs.{0,16}believe|these are written/i.test(text))return 'miracles';
    if(/\bearly church\b|first church|devoted.*apostles|had all things common|added daily|breaking of bread/i.test(text))return 'earlychurch';
    if(/\bdemons\b|demon possessed|legion.{0,16}swine|what.{0,24}bible.{0,24}demons|cast out demons|unclean spirits/i.test(text))return 'demons';
    if(/\bpride\b|god opposes the proud|haughty|what is humility|humble yourself|consider others better/i.test(text))return 'pride';
    if(/\blust\b|look.*lust|adultery|covenant.*eyes|pornograph|sexual immorality|flee.*youthful/i.test(text))return 'lust';
    if(/\bsacrifice of isaac\b|binding of isaac|mount moriah|abraham.{0,16}sacrifice.{0,12}son|abraham and isaac|ram.*thicket/i.test(text))return 'person-isaac';
    if(/\bdeborah\b|barak|jael|sisera|mother in israel|palm tree.*judge/i.test(text))return 'person-deborah';
    if(/\bson of god\b|son of man/i.test(text)&&!/ezekiel/i.test(text))return 'person-jesus';
    if(/\bjoshua\b.{0,20}(?:jordan|jericho|house.{0,12}serve|choose.*day)|as for me and my house/i.test(text))return 'person-joshua';
    if(/\bminor prophets\b|twelve prophets|\bobadiah\b|\bnahum\b|\bzephaniah\b|\bhaggai\b|what is zechariah about|tell me about zechariah/i.test(text))return 'minorprophets';
    if(/\btitus\b|appoint elders|grace.{0,16}teaches.{0,12}no/i.test(text))return 'titus';
    if(/\bgospel of mark\b|what is mark about|tell me about mark|who was mark|ransom for many/i.test(text))return 'mark';
    if(/\bgospel of luke\b|what is luke about|tell me about luke|seek and save|theophilus|who was luke/i.test(text))return 'luke';
    if(/\bjustification\b|justified by faith|made right with god|reckoned.*righteous|peace with god/i.test(text))return 'justification';
    if(/\bsanctification\b|sanctified|this is the will of god|set apart.*holy|grow in holiness/i.test(text))return 'sanctification';
    if(/\bredemption\b|redeemed|kinsman|kinsman redeemer|bought with a price/i.test(text))return 'redemption';
    if(/\batonement\b|day of atonement|mercy seat|scapegoat|propitiation/i.test(text))return 'atonement';
    if(/\bsarah\b.{0,20}(?:hagar|isaac|laugh|barren)|who was sarah|tell me about sarah|god has made me laugh/i.test(text))return 'person-sarah';
    if(/\babigail\b|nabal/i.test(text))return 'person-abigail';
    if(/\bmordecai\b|for such a time/i.test(text))return 'person-esther';
    if(/\bphilemon\b|onesimus|seventy times seven|forgive.*brother/i.test(text))return 'forgiveness';
    if(/\b2 thessalonians\b/i.test(text))return 'secondcoming';
    if(/\bthe fall\b|original sin|forbidden fruit|serpent.{0,16}eden|garden.{0,16}serpent|fall of man/i.test(text))return 'person-eve';
    if(/\bthe lord is my light\b|whom shall i fear|one thing.*desired|dwell.*house/i.test(text))return 'light';
    if(/\bfearfully and wonderfully\b|wonderfully made|knit.*womb|formed.*inward parts/i.test(text))return 'wonderfully';
    if(/\bas the deer\b|pants.*water|deep calls|deep unto deep|why are you cast down/i.test(text))return 'deer';
    if(/\bbless the lord o my soul\b|forget not.*benefits|crowned.*lovingkindness|renew.*youth.*eagle/i.test(text))return 'benefits';
    if(/\bdelight in the lord\b|delight.*lord.*desires|fret not|do not envy.*evildoers/i.test(text))return 'delight';
    if(/\btrain up a child\b|spare the rod|rod of correction|bring them up.*lord/i.test(text))return 'trainup';
    if(/\bmanna\b|bread from heaven|what is it.*manhu/i.test(text))return 'manna';
    if(/\bshema\b|hear o israel|lord our god is one|teach.*diligently/i.test(text))return 'shema';
    if(/\bwalls of jericho\b|joshua.*jericho|seven trumpets|shout.*walls fell/i.test(text))return 'jericho';
    if(/\bgideon\b|lay.*fleece|dew.*fleece|lapping dogs|300 men|midianites/i.test(text))return 'gideon';
    if(/\bi can do all things\b|do all things through christ|christ who strengthens/i.test(text))return 'philippians4';
    if(/\bpsalm\s*1\b|blessed is the man|like a tree|planted by (?:the )?streams/i.test(text))return 'psalm1';
    if(/\btime for everything\b|a time to (?:be born|weep|mourn|dance)|to everything.*season/i.test(text))return 'seasons';
    if(/\bgolden rule\b|do to others|do as you would/i.test(text))return 'goldenrule';
    if(/\bspiritual gifts\b|gifts of (?:the )?spirit|speaking in tongues|pray in tongues/i.test(text))return 'gifts';
    if(/\bbaptism of jesus\b|jesus (?:was )?baptized|heavens opened|dove descend/i.test(text))return 'jesusbaptism';
    if(/\btemptation of (?:jesus|christ)\b|forty days.{0,20}(fast|wilderness)|was jesus tempted/i.test(text))return 'tempted';
    if(/\bpentecost\b|speaking in tongues.{0,20}acts|what happened at pentecost|\bjoel\b/i.test(text))return 'pentecost';
    if(/\bson of encouragement\b/i.test(text))return 'person-barnabas';
    const people=[['person-magdalene','mary magdalene|magdalene'],['person-mary','virgin mary|mary,? mother of jesus|mary of nazareth|\\bmary\\b'],['person-jesus','jesus|\\bchrist\\b|messiah'],['person-moses','moses'],['person-abraham','abraham|abram'],['person-david','david'],['person-peter','peter|simon peter|cephas'],['person-paul','paul|saul of tarsus|apostle paul'],['person-solomon','solomon'],['person-esther','esther'],['person-ruth','ruth'],['person-noah','noah'],['person-elijah','elijah|elias'],['person-daniel','daniel'],['person-isaiah','isaiah'],['person-lazarus','lazarus'],['person-samuel','samuel'],['person-saul','saul|king saul'],['person-jacob','jacob'],['person-jonah','jonah|jonas'],['person-samson','samson'],['person-stephen','stephen'],['person-barnabas','barnabas'],['person-eve','eve'],['person-isaac','isaac'],['person-deborah','deborah'],['person-elisha','elisha'],['person-joshua','joshua'],['person-sarah','sarah|sarai'],['person-abigail','abigail']];
    for(const [id,names] of people){
      if(new RegExp('\\bwho (?:was|is)\\b\\s+(?:the\\s+)?(?:'+names+')\\s*[?.]?$|\\btell me about\\s+(?:the\\s+)?(?:'+names+')\\s*[?.]?$','i').test(text))return id;
    }
    if(/\b(?:jesus|disciples)\b/i.test(text)&&/\bwash(?:ed|ing)?\b.*\bfeet\b/i.test(text))return 'washingFeet';
    return null;
  }
  function classify(text,bible,personal,history){
    text=String(text||'').trim();if(!text)return null;
    const reference=bible?.parseReference(text);
    if(reference)return reference.error&&text.length>160?{kind:'clarify',query:'shorter'}:{kind:'reference',query:reference.error?text:reference.reference};
    if(followUp(text))return previousStudy(history,bible)||{kind:'clarify',query:'followup'};
    // "What about Goliath?" continues the conversation with a new topic.
    // The remainder must resolve to a prepared note on its own, or this
    // stays an honest search — never a guess.
    const about=text.match(/^(?:what|how) about\s+(.+?)\s*[?.]?$/i);
    if(about){
      const topic=about[1];
      const hit=prepared(topic)||prepared('who was '+topic)||prepared('tell me about '+topic);
      if(hit)return {kind:'note',query:hit};
    }
    const meta=metaMatch(text);if(meta)return {kind:'meta',query:meta};
    const note=prepared(text);if(note)return {kind:'note',query:note};
    const explicitSearch=/^(?:search(?: the bible)?(?: for)?|find(?: verses? (?:about|on|with))?|look up)\s+/i;
    const question=/\b(?:who|whom|when|why|what|where|how|explain|context|meaning|mean|authorship|author|summari[sz]e|interpret|difference)\b|^(?:(?:can|could|would) you )?(?:tell me about|help me understand)|^(?:did|does|is|was|were|are)\b/i.test(text);
    const bibleTopic=/\b(?:bible|biblical|scripture|jesus|christ|god|paul|peter|moses|abraham|david|nicodemus|disciples?|prophets?|gospels?|parable|parables|sermon|resurrection|crucifixion|old testament|new testament)\b/i.test(text)||
      Boolean(bible?.books?.some(book=>new RegExp('\\b'+book.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(text)));
    const personalWords=/\b(?:i|i'm|i’m|me|my|we|our|feel|feeling|feelings|things|everything|at home)\b/i;
    // Keep clear lived-experience questions with the personal guides. A request
    // to explain/search Scripture differs from "Why am I angry at God?".
    const explicitExplanation=/\b(?:explain|summari[sz]e|interpret|context|authorship|author)\b|\b(?:tell me (?:about|why|who|how)|help me understand)\b/i.test(text)||/\b(?:what does|what did|where does|where did)\b.*\b(?:say|teach|mean)\b/i.test(text);
    const personalQuestion=personalWords.test(text)&&Boolean(personal?.matched)&&!explicitExplanation;
    const studyQuestion=question&&bibleTopic&&!personalQuestion;
    // A general question without Bible terms is still an Ask question. Sending
    // it to word search produces irrelevant verses or an empty-search error.
    if(explicitSearch.test(text)||studyQuestion){
      const query=text.replace(explicitSearch,'').trim();
      if(query.length>160)return {kind:'clarify',query:'shorter'};
      return query?{kind:'search',query}:null;
    }
    return null;
  }
  return {notes,classify,context};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=SteadyStudy;

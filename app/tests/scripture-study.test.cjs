const {test}=require('node:test');
const assert=require('node:assert/strict');
const Bible=require('../public/bible-search.js');
const Study=require('../public/scripture-study.js');
const Feelings=require('../public/scripture-feelings-model.js');
const classify=(text,history)=>Study.classify(text,Bible,Feelings.match(text),history);

test('references override broad scripture/Jesus matching and retain invalid reference errors',()=>{
  assert.deepEqual(classify('What does John 3:16 mean?'),{kind:'reference',query:'John 3:16'});
  assert.equal(classify('John 3:99').query,'John 3:99');
  for(const query of ['John 3:16,19','John 3:16-4:2','John 3:16-']){
    const chosen=classify(query);assert.equal(chosen.kind,'reference');assert.equal(Bible.getPassage(chosen.query).ok,false,query);
  }
});
test('prepared notes route study questions without pretending to answer everything',()=>{
  assert.deepEqual(classify('Why did Jesus teach in parables?'),{kind:'note',query:'parables'});
  assert.deepEqual(classify('Who wrote Romans?'),{kind:'note',query:'romans'});
  assert.deepEqual(classify('Who wrote Hebrews?'),{kind:'note',query:'hebrewsAuthor'});
  assert.equal(classify('search for love is patient').query,'love is patient');
  assert.equal(classify('I feel anxious'),null);
  assert.equal(classify('I cannot pray'),null);
  for(const text of ["I can't keep up with everything",'My rent is due next week','Things are a mess at home'])assert.equal(classify(text),null,text);
  for(const text of ["What's the best next step?",'How can I make a decision?', 'What should I do tomorrow?'])
    assert.equal(classify(text),null,`general guidance should not become Bible word search: ${text}`);
});
test('Bible-word questions receive bounded notes while personal struggles remain personal',()=>{
  const definitions=[
    ['What is grace?','grace'],['What does grace mean?','grace'],['What does the Bible mean by grace?','grace'],
    ['What is faith?','faith'],['Explain faith in the Bible','faith'],
    ['What does forgiveness mean?','forgiveness'],['Define biblical forgiveness','forgiveness'],
    ['What is wisdom?','wisdom']
  ];
  for(const [question,id] of definitions)assert.deepEqual(classify(question),{kind:'note',query:id},question);
  for(const personal of ['I feel ashamed','I need to forgive someone who hurt me','I am doubting my faith','I do not know what to do','What is grace when I feel ashamed?'])assert.equal(classify(personal),null,personal);
  assert.equal(classify('What does the Bible say about forgiveness?')?.kind,'search');
  assert.match(Study.notes.forgiveness.copy,/does not require silence about harm/);
  assert.match(Study.notes.faith.copy,/not a guarantee of quick results/);
  assert.match(Study.notes.wisdom.copy,/without reproach/);
});
test('common passage context is precise, bounded, and honest about interpretation',()=>{
  const examples=[['Explain Romans 8:28 in context','romans8'],['What does John 3:16 mean?','john3'],['Jeremiah 29:11','jeremiah29'],['Philippians 4:13','philippians4'],['Matthew 7:1-5','judging']];
  for(const [query,id] of examples){
    const chosen=classify(query);assert.equal(chosen.kind,'reference');
    assert.equal(Study.context(chosen.query,Bible),Study.notes[id]);
    assert.ok(Bible.getPassage(chosen.query).ok);
  }
  for(const reference of ['John 3:30','John 3:99','John 3:19-16','Romans 8:1','Philippians 4:1','Matthew 13:53','John 13:12-14:2'])assert.equal(Study.context(reference,Bible),null,reference);
  assert.match(Study.notes.romans8.copy,/not a promise that every event is good/);
  assert.match(Study.notes.hebrewsAuthor.copy,/author is unknown/);
  assert.match(Study.notes.hebrewsAuthor.copy,/link is doubted/);
  assert.match(Study.notes.philippians4.copy,/not presented as failed faith/);
});
test('foot-washing and authorship questions receive only their matching prepared notes',()=>{
  for(const text of ["Why did Jesus wash the disciples' feet?",'Jesus washing disciples feet','What does Jesus washing feet mean?'])assert.deepEqual(classify(text),{kind:'note',query:'washingFeet'},text);
  for(const text of ['Who wrote the book of Hebrews?','Was Hebrews written by Paul?','Who is the author of Hebrews?'])assert.deepEqual(classify(text),{kind:'note',query:'hebrewsAuthor'},text);
  for(const text of ['Who wrote Romans?','Who was Romans written to?','Who was Romans for?'])assert.deepEqual(classify(text),{kind:'note',query:'romans'},text);
  for(const text of ['When was Hebrews written?','When was Romans written?','Why did Jesus weep?','Did Jesus have siblings?','Can you tell me about Jesus feeding the five thousand?','Help me understand the resurrection'])assert.equal(classify(text)?.kind,'search',text);
});
test('specific Scripture questions cannot fall through into a generic Jesus or feelings guide',()=>{
  for(const text of ['What did Jesus mean by the unforgivable sin?','Explain baptism in the Bible','How many days did Jonah spend in the fish?','Who was Nicodemus?','What did Paul teach about resurrection?','Explain the sermon on the mount','What does the Bible say about forgiveness?'])assert.equal(classify(text)?.kind,'search',text);
  for(const text of ['I am grieving','I feel far from God','Why am I angry at God?','I cannot pray','I feel like Jesus does not care about me','I am anxious about my job'])assert.equal(classify(text),null,text);
});
test('Psalm 23 questions receive a bounded shepherd-psalm note with honest limits',()=>{
  for(const text of ['The Lord is my shepherd','Explain the valley of the shadow of death'])assert.deepEqual(classify(text),{kind:'note',query:'psalm23'},text);
  assert.match(Study.notes.psalm23.copy,/you are with me/);
  assert.match(Study.notes.psalm23.copy,/not an explanation of why/);
  assert.equal(Study.context('Psalm 23:4',Bible),Study.notes.psalm23);
  assert.equal(Study.context('Psalm 23',Bible),Study.notes.psalm23);
  assert.ok(Bible.getPassage('Psalm 23:1-4').ok);
});
test('love, prayer, refuge, grace and creation questions receive bounded notes',()=>{
  for(const [text,id] of [
    ['What is love?','love'],['Explain love is patient','love'],
    ['Teach us to pray','lordsprayer'],['The Our Father in heaven','lordsprayer'],
    ['He is my refuge','psalm91'],
    ['All have sinned','romans3'],
    ['Who created the world?','creation']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.deepEqual(classify('Psalm 91'),{kind:'reference',query:'Psalm 91'});
  assert.deepEqual(classify('Tell me about 1 Corinthians 13'),{kind:'reference',query:'1 Corinthians 13'});
  assert.match(Study.notes.love.copy,/not a test for scoring/);
  assert.match(Study.notes.lordsprayer.copy,/pattern for prayer/);
  assert.match(Study.notes.psalm91.copy,/not a guarantee/);
  assert.match(Study.notes.romans3.copy,/not a ranking/);
  assert.match(Study.notes.creation.copy,/Christians differ/);
  assert.equal(Study.context('1 Corinthians 13:4',Bible),Study.notes.love);
  assert.equal(Study.context('Genesis 1:1',Bible),Study.notes.creation);
});
test('doubt, supper, baptism, worry, strength and trust receive bounded notes',()=>{
  for(const [text,id] of [
    ['Doubting Thomas',undefined],['Help my unbelief','doubt'],
    ['What is communion?','supper'],['What is baptism?','baptism'],
    ['Do not be anxious','worry'],['My grace is sufficient','strength'],
    ['Trust in the Lord','trust']
  ]){
    if(id===undefined)continue;
    assert.deepEqual(classify(text),{kind:'note',query:id},text);
  }
  assert.match(Study.notes.doubt.copy,/same breath/);
  assert.match(Study.notes.supper.copy,/remembrance/);
  assert.match(Study.notes.baptism.copy,/newness of life/);
  assert.match(Study.notes.worry.copy,/lack faith/);
  assert.match(Study.notes.strength.copy,/quick removal/);
  assert.match(Study.notes.trust.copy,/self-reliance/);
  assert.equal(Study.context('Mark 9:24',Bible),Study.notes.doubt);
  assert.equal(Study.context('Proverbs 3:5',Bible),Study.notes.trust);
});
test('people questions introduce the person with a key passage',()=>{
  for(const [text,id] of [
    ['Who was Moses?','person-moses'],['Tell me about David','person-david'],
    ['Who is Jesus?','person-jesus'],['Who was Paul?','person-paul'],
    ['Who was Esther?','person-esther'],['Tell me about Ruth','person-ruth'],
    ['Who was Mary Magdalene?','person-magdalene'],['Who was Mary?','person-mary'],
    ['Who was Solomon?','person-solomon'],['Who was Noah?','person-noah'],
    ['Who was Elijah?','person-elijah'],['Who was Daniel?','person-daniel'],
    ['Who was Abraham?','person-abraham'],['Who was Peter?','person-peter']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.match(Study.notes['person-jesus'].copy,/promised Messiah/);
  assert.match(Study.notes['person-magdalene'].copy,/not the same person/);
  assert.equal(Study.context('Exodus 3:10',Bible),Study.notes['person-moses']);
  assert.equal(Study.context('Ruth 1:16',Bible),Study.notes['person-ruth']);
});
test('refuge, fear, blessings, commandments and fruit receive bounded notes',()=>{
  for(const [text,id] of [
    ['Psalm 46','refuge'],['God is our refuge','refuge'],
    ['Fear not','fearnot'],['Do not be afraid','fearnot'],
    ['What are the Beatitudes?','beatitudes'],['Blessed are the poor in spirit','beatitudes'],
    ['What are the Ten Commandments?','commandments'],
    ['Tell me about the fruit of the Spirit','fruit']
  ]){
    const result=classify(text);
    if(id==='refuge'&&/^\s*psalm 46\s*$/i.test(text)){
      assert.equal(result.kind,'reference',text);
      assert.equal(Study.context(result.query,Bible),Study.notes[id],text);
    }else assert.deepEqual(result,{kind:'note',query:id},text);
  }
  assert.match(Study.notes.refuge.copy,/stillness/);
  assert.match(Study.notes.fearnot.copy,/Verse 13/);
  assert.match(Study.notes.beatitudes.copy,/opposite/);
  assert.match(Study.notes.commandments.copy,/no coveting/);
  assert.match(Study.notes.fruit.copy,/Against such/);
  assert.equal(Study.context('Isaiah 41:10',Bible),Study.notes.fearnot);
  assert.equal(Study.context('Galatians 5:22',Bible),Study.notes.fruit);
  assert.equal(Study.context('Psalm 1:1',Bible),Study.notes.psalm1);
  assert.equal(Study.context('Matthew 7:12',Bible),Study.notes.goldenrule);
  assert.equal(Study.context('1 Corinthians 12:7',Bible),Study.notes.gifts);
  assert.equal(Study.context('Acts 2:4',Bible),Study.notes.pentecost);
});
test('gifts, baptism, temptation and pentecost receive bounded notes',()=>{
  for(const [text,id] of [
    ['What are spiritual gifts?','gifts'],['Pray in tongues','gifts'],
    ['Was Jesus baptized?','jesusbaptism'],['The heavens opened','jesusbaptism'],
    ['Was Jesus tempted?','tempted'],['Forty days in the wilderness','tempted'],
    ['What happened at Pentecost?','pentecost']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.match(Study.notes.gifts.copy,/common good/);
  assert.match(Study.notes.jesusbaptism.copy,/beloved Son|fulfilling/);
  assert.match(Study.notes.tempted.copy,/sympathizes|without sin/);
  assert.match(Study.notes.pentecost.copy,/three thousand/);
});
test('psalms, seasons and the golden rule receive bounded notes',()=>{
  for(const [text,id] of [
    ['Blessed is the man','psalm1'],['Like a tree planted by streams','psalm1'],
    ['A time to be born','seasons'],['To everything there is a season','seasons'],
    ['What is the golden rule?','goldenrule'],['Do to others as you would','goldenrule'],
    ['I can do all things through Christ','philippians4'],['Be still','refuge']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.match(Study.notes.psalm1.copy,/two paths|Two paths/);
  assert.match(Study.notes.seasons.copy,/beautiful in its time/);
  assert.match(Study.notes.goldenrule.copy,/one question/);
});
test('armor, resurrection, heaven, prodigal and neighbor receive bounded notes',()=>{
  for(const [text,id] of [
    ['What is the armor of God?','armor'],['Tell me about the shield of faith','armor'],
    ['Did Jesus rise from the dead?','resurrection'],['He is risen','resurrection'],
    ['What is heaven like?','heaven'],['Streets of gold','heaven'],
    ['Tell me about the prodigal son','prodigal'],
    ['Who is my neighbor?','neighbor'],['The good Samaritan','neighbor']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.equal(classify('What did Paul teach about resurrection?')?.kind,'search','broad resurrection questions stay search');
  assert.equal(classify('I have no more tears left'),null,'grief without heaven language stays personal');
  assert.match(Study.notes.armor.copy,/readiness/);
  assert.match(Study.notes.resurrection.copy,/stands or falls/);
  assert.match(Study.notes.heaven.copy,/travel guide/);
  assert.match(Study.notes.prodigal.copy,/before worthiness/);
  assert.match(Study.notes.neighbor.copy,/old hatreds/);
  assert.equal(Study.context('Ephesians 6:11',Bible),Study.notes.armor);
  assert.equal(Study.context('Luke 10:33',Bible),Study.notes.neighbor);
  assert.equal(Study.context('Matthew 2:2',Bible),Study.notes.nativity);
  assert.equal(Study.context('Joshua 1:9',Bible),Study.notes.courage);
  assert.equal(Study.context('John 4:14',Bible),Study.notes.well);
  assert.equal(Study.context('Luke 10:42',Bible),Study.notes.martha);
  assert.equal(Study.context('1 Samuel 17:45',Bible),Study.notes.goliath);
  assert.equal(Study.context('Job 38:4',Bible),Study.notes.whysuffer);
  assert.equal(Study.context('Genesis 50:20',Bible),Study.notes.joseph);
  assert.equal(Study.context('Luke 23:43',Bible),Study.notes.paradise);
});
test('people, servant, talents, outcasts, songs, works, love, courage and assurance receive bounded notes',()=>{
  for(const [text,id] of [
    ['Who was Joseph?','joseph'],['The coat of many colors','joseph'],
    ['The suffering servant','servant'],['By his wounds we are healed','servant'],
    ['Parable of the talents','talents'],['Well done good and faithful','talents'],
    ['Zacchaeus','zacchaeus'],['Up a sycamore tree','zacchaeus'],
    ['Hosanna','hosanna'],['Palm Sunday','hosanna'],
    ['Paradise','paradise'],['Thief on the cross','paradise'],
    ['A great cloud of witnesses','cloud'],['Run with endurance','cloud'],
    ['Faith without works is dead','works'],
    ['God is love','godislove'],['Perfect love casts out fear','godislove'],
    ['Spirit of fear','fanflame'],['Fan into flame','fanflame'],
    ['Nothing can separate us','separate'],['Neither death nor life','separate']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.match(Study.notes.joseph.copy,/pit and palace/);
  assert.match(Study.notes.servant.copy,/lamb silent/);
  assert.match(Study.notes.talents.copy,/fearful hoarding/);
  assert.match(Study.notes.zacchaeus.copy,/Seeking ends in giving/);
  assert.match(Study.notes.hosanna.copy,/loud, public/);
  assert.match(Study.notes.paradise.copy,/one honest sentence/);
  assert.match(Study.notes.cloud.copy,/author and finisher/);
  assert.match(Study.notes.works.copy,/hands and feet/);
  assert.match(Study.notes.godislove.copy,/proven by loving/);
  assert.match(Study.notes.fanflame.copy,/forgetfulness, not identity/);
  assert.match(Study.notes.separate.copy,/any other created thing/);
  assert.equal(Study.context('Psalm 27:1',Bible),Study.notes.light);
  assert.equal(Study.context('Proverbs 22:6',Bible),Study.notes.trainup);
  assert.equal(Study.context('Hebrews 1:14',Bible),Study.notes.angels);
  assert.equal(Study.context('Nehemiah 8:8',Bible),Study.notes.translations);
});
test('heavenly powers, practices, callings and hard sayings receive bounded notes',()=>{
  for(const [text,id] of [
    ['Are guardian angels real?','angels'],['Do angels protect us?','angels'],
    ['Is the devil real?','satan'],['A roaring lion','satan'],
    ['What does the Bible say about tattoos?','tattoos'],
    ['How should I read the Bible?','readbible'],['Where do I start reading?','readbible'],
    ['Which translation is best?','translations'],['KJV versus NIV','translations'],
    ['What is repentance?','repent'],['How do I repent?','repent'],
    ['What is biblical hope?','hope'],
    ['What is truth?','waytruth'],['I am the way','waytruth'],
    ['What is the church?','churchbody'],
    ['What is worship?','worship'],['Worship in spirit and truth','worship'],
    ['Should Christians fast?','fasting'],['When you fast','fasting'],
    ['The unforgivable sin','unforgivable'],['Blasphemy against the Spirit','unforgivable'],
    ['Spirit soul and body difference','soulspirit']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
});
test('psalms, children, bread, creed, walls and fleece receive bounded notes',()=>{
  for(const [text,id] of [
    ['The Lord is my light','light'],['Whom shall I fear?','light'],
    ['Fearfully and wonderfully made','wonderfully'],['Knit in the womb','wonderfully'],
    ['As the deer pants','deer'],['Why are you cast down?','deer'],
    ['Bless the Lord O my soul','benefits'],['Forget not his benefits','benefits'],
    ['Delight in the Lord','delight'],['Fret not yourself','delight'],
    ['Train up a child','trainup'],['Spare the rod','trainup'],
    ['Manna from heaven','manna'],['Bread from heaven','manna'],
    ['Hear O Israel','shema'],['The Shema','shema'],
    ['The walls of Jericho','jericho'],['Seven trumpets','jericho'],
    ['Gideon','gideon'],['Lay out the fleece','gideon']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.match(Study.notes.light.copy,/land of the living/);
  assert.match(Study.notes.wonderfully.copy,/fully known/);
  assert.match(Study.notes.deer.copy,/preaches back/);
  assert.match(Study.notes.benefits.copy,/answering forgetfulness/);
  assert.match(Study.notes.delight.copy,/verbs do the work/);
  assert.match(Study.notes.trainup.copy,/frantic or harsh/);
  assert.match(Study.notes.manna.copy,/hoarding rots/);
  assert.match(Study.notes.shema.copy,/totality of love/);
  assert.match(Study.notes.jericho.copy,/patient procedure/);
  assert.match(Study.notes.gideon.copy,/met, not mocked/);
});
test('doctrine, Baptist, betrayal, exodus and comfort receive bounded notes',()=>{
  for(const [text,id] of [
    ['What is the Trinity?','trinity'],['The triune God','trinity'],
    ['What is hell?','hell'],['Gehenna and outer darkness','hell'],
    ['What happens when we die?','afterlife'],['Life after death','afterlife'],
    ['What is election?','election'],['Predestined before the foundation','election'],
    ['Who was John the Baptist?','johnbaptist'],['Behold the Lamb of God','johnbaptist'],
    ['Who betrayed Jesus?','judas'],['Thirty pieces of silver','judas'],
    ['The burning bush','burningbush'],['Take off your sandals, holy ground','burningbush'],
    ['The Red Sea crossing','redsea'],['Pharaoh drowned in the sea','redsea'],
    ['The ten plagues','plagues'],['The Nile turned to blood','plagues'],
    ['The road to Damascus','damascus'],['Why do you persecute me?','damascus'],
    ['The God of all comfort','comfort'],['What does the Bible say about comfort?','comfort'],
    ['Tell me about the Last Supper','supper'],['Tell me about Noah and the flood','person-noah'],
    ['What about Goliath?','goliath'],['What about Paul?','person-paul']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.equal(classify('What the hell is going on'),null,'a general exclamation is not a Bible search');
  assert.equal(Study.context('Matthew 3:5',Bible),Study.notes.johnbaptist);
  assert.equal(Study.context('Matthew 26:15',Bible),Study.notes.judas);
  assert.equal(Study.context('Exodus 14:21',Bible),Study.notes.redsea);
  assert.equal(Study.context('2 Corinthians 1:4',Bible),Study.notes.comfort);
});
test('pronoun follow-ups stay with the current passage',()=>{
  const history=[{study:{kind:'note',query:'faith'}}];
  for(const text of ['Why is it important?','Why is that true?','How does it work?','How does that help?','What about that?'])assert.deepEqual(classify(text,history),{kind:'note',query:'faith-more'},text);
  assert.deepEqual(classify('Why is it important?'),{kind:'clarify',query:'followup'});
});
test('prophets, covenant, return and Job receive bounded notes',()=>{
  for(const [text,id] of [
    ['Who was Isaiah?','person-isaiah'],['What about Isaiah?','person-isaiah'],
    ['Who was Lazarus?','person-lazarus'],['What about Lazarus?','person-lazarus'],
    ['Who was Job?','person-job'],['What is the book of Job about?','person-job'],
    ['What is Revelation about?','revelation'],['The seven churches','revelation'],
    ['What does it mean to be born again?','bornagain'],['Born of water and Spirit','bornagain'],
    ['Tell me about the ascension','ascension'],['Taken up in a cloud','ascension'],
    ['What is the second coming?','secondcoming'],['Thief in the night','secondcoming'],
    ['What is the new covenant?','newcovenant'],['The cup of the new covenant','newcovenant'],
    ['Tell me about the transfiguration','transfiguration'],['Jesus transfigured on the mountain','transfiguration'],
    ['Who wrote Genesis?','pentateuch'],['Moses wrote the Pentateuch','pentateuch'],
    ['What is prayer?','lordsprayer'],['How should we pray?','lordsprayer'],
    ['What is blasphemy?','unforgivable']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.equal(Study.context('Revelation 1:3',Bible),Study.notes.revelation);
  assert.equal(Study.context('Acts 1:9',Bible),Study.notes.ascension);
  assert.equal(Study.context('Jeremiah 31:33',Bible),Study.notes.newcovenant);
  assert.equal(Study.context('Matthew 17:2',Bible),Study.notes.transfiguration);
  assert.equal(Study.context('Isaiah 6:8',Bible),Study.notes['person-isaiah']);
  assert.equal(Study.context('Job 1:21',Bible),Study.notes['person-job']);
});
test('exile, patriarchs, kings, signs and wisdom receive bounded notes',()=>{
  for(const [text,id] of [
    ['Who was Jonah?','person-jonah'],['What about Jonah?','person-jonah'],
    ['Tell me about Jonah and the fish','person-jonah'],
    ['Who was Jacob?','person-jacob'],['Tell me about Jacob and Esau','person-jacob'],
    ['Who was Samuel?','person-samuel'],['Tell me about Samuel and Saul','person-samuel'],
    ['Who was Saul?','person-saul'],['Tell me about Saul and David','person-saul'],
    ['What is the Passover?','passover'],['When I see the blood','passover'],
    ['Tell me about the wedding at Cana','cana'],['Water into wine','cana'],
    ['What is the kingdom of God?','kingdom'],['Thy kingdom come','kingdom'],
    ['What is the meaning of life?','ecclesiastes'],['Vanity of vanities','ecclesiastes'],
    ['Tell me about Cain and Abel','cainabel'],['Am I my brother’s keeper?','cainabel'],
    ['What is the Tower of Babel?','babel'],
    ['What was the exile?','jeremiah29'],['The Babylonian exile','jeremiah29']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.equal(classify('How many days did Jonah spend in the fish?')?.kind,'search');
  assert.equal(Study.context('Jonah 1:17',Bible),Study.notes['person-jonah']);
  assert.equal(Study.context('Genesis 4:8',Bible),Study.notes.cainabel);
  assert.equal(Study.context('Genesis 11:4',Bible),Study.notes.babel);
  assert.equal(Study.context('1 Samuel 3:10',Bible),Study.notes['person-samuel']);
  assert.equal(Study.context('1 Samuel 15:22',Bible),Study.notes['person-saul']);
  assert.equal(Study.context('Exodus 12:13',Bible),Study.notes.passover);
  assert.equal(Study.context('John 2:11',Bible),Study.notes.cana);
  assert.equal(Study.context('Mark 1:15',Bible),Study.notes.kingdom);
  assert.equal(Study.context('Ecclesiastes 12:13',Bible),Study.notes.ecclesiastes);
  assert.equal(Study.context('Genesis 28:17',Bible),Study.notes['person-jacob']);
});
test('leaders, prophets, gospels, grace words and atonement receive bounded notes',()=>{
  for(const [text,id] of [
    ['Who was Joshua?','person-joshua'],['As for me and my house','person-joshua'],
    ['Tell me about the Minor Prophets','minorprophets'],['What does Obadiah say?','minorprophets'],
    ['What is Titus about?','titus'],
    ['What is Mark about?','mark'],['Who was Mark?','mark'],
    ['What is Luke about?','luke'],['Seek and save the lost','luke'],
    ['What is justification?','justification'],['Peace with God','justification'],
    ['What is sanctification?','sanctification'],
    ['What is redemption?','redemption'],['Bought with a price','redemption'],
    ['What is atonement?','atonement'],['The Day of Atonement','atonement'],
    ['Who was Sarah?','person-sarah'],['God has made me laugh','person-sarah'],
    ['Who was Abigail?','person-abigail'],['Tell me about Nabal','person-abigail'],
    ['Who was Jonathan?','friendship'],
    ['Mordecai','person-esther'],['For such a time as this','person-esther'],
    ['Tell me about Philemon','forgiveness'],
    ['What is 2 Thessalonians about?','secondcoming'],
    ['Son of Man','person-jesus']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.equal(Study.context('Joshua 24:15',Bible),Study.notes['person-joshua']);
  assert.equal(Study.context('Zechariah 1:3',Bible),Study.notes.minorprophets);
  assert.equal(Study.context('Titus 2:11',Bible),Study.notes.titus);
  assert.equal(Study.context('Mark 10:45',Bible),Study.notes.mark);
  assert.equal(Study.context('Romans 5:1',Bible),Study.notes.justification);
  assert.equal(Study.context('1 Thessalonians 4:3',Bible),Study.notes.sanctification);
  assert.equal(Study.context('Leviticus 16:30',Bible),Study.notes.atonement);
  assert.equal(Study.context('Genesis 21:6',Bible),Study.notes['person-sarah']);
  assert.equal(Study.context('1 Samuel 25:33',Bible),Study.notes['person-abigail']);
});
test('salvation, household topics and despair receive bounded notes',()=>{
  for(const [text,id] of [
    ['How can I be saved?','salvation'],['What must I do to be saved?','salvation'],
    ['Are you saved?','salvation'],
    ['What does the Bible say about marriage?','marriage'],['One flesh','marriage'],
    ['What does the Bible say about friendship?','friendship'],['Greater love has no one than this','friendship'],
    ['What does the Bible say about work?','work'],['Work as for the Lord','work'],
    ['What does the Bible say about money?','money'],['Love of money','money'],
    ['What does the Bible say about depression?','despair'],['Elijah under the broom tree','despair']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.equal(Study.context('Acts 16:31',Bible),Study.notes.salvation);
  assert.equal(Study.context('Genesis 2:24',Bible),Study.notes.marriage);
  assert.equal(Study.context('John 15:13',Bible),Study.notes.friendship);
  assert.equal(Study.context('Colossians 3:23',Bible),Study.notes.work);
  assert.equal(Study.context('Matthew 6:21',Bible),Study.notes.money);
  assert.equal(Study.context('1 Kings 19:5',Bible),Study.notes.despair);
});
test('law, prophets, letters, Spirit and honest questions receive bounded notes',()=>{
  for(const [text,id] of [
    ['What is Leviticus about?','leviticus'],['Be holy, for I am holy','leviticus'],
    ['What is Numbers about?','numbers'],['The bronze serpent','numbers'],
    ['What is the Davidic covenant?','davidcovenant'],['Your throne forever','davidcovenant'],
    ['Who was Elisha?','person-elisha'],['Tell me about Naaman','person-elisha'],
    ['Why all the genealogies?','genealogies'],['Abraham begat Isaac','genealogies'],
    ['Who was Ezra?','ezra'],['Ezra the scribe','ezra'],
    ['Who was Nehemiah?','nehemiah'],['Joy of the Lord is strength','nehemiah'],
    ['What is the Song of Solomon about?','song'],['Many waters cannot quench love','song'],
    ['What is Lamentations about?','lamentations'],['New every morning','lamentations'],
    ['The valley of dry bones','drybones'],['Can these bones live?','drybones'],
    ['Who was Hosea?','hosea'],['Out of Egypt I called my son','hosea'],
    ['What does Amos say?','amos'],['Let justice roll','amos'],
    ['Who was Micah?','micah'],['Walk humbly with your God','micah'],
    ['Who was Habakkuk?','habakkuk'],['The righteous live by faith','habakkuk'],
    ['What is Galatians about?','galatians'],['Yoke of bondage','galatians'],
    ['Who was Timothy?','timothy'],['Do not despise your youth','timothy'],
    ['Who is the Holy Spirit?','holyspirit'],['Spirit of truth','holyspirit'],
    ['Is the Bible true?','bibletrust'],['All Scripture is God-breathed','bibletrust'],
    ['Did Jesus really do miracles?','miracles'],
    ['What was the early church like?','earlychurch'],['Had all things common','earlychurch'],
    ['What does the Bible say about demons?','demons'],['Legion and the swine','demons'],
    ['What does the Bible say about pride?','pride'],['God opposes the proud','pride'],
    ['What does the Bible say about lust?','lust'],['Adultery in the heart','lust'],
    ['Who was Isaac?','person-isaac'],['The sacrifice of Isaac','person-isaac'],
    ['Who was Deborah?','person-deborah'],['Deborah and Barak','person-deborah'],
    ['Who was Samson?','person-samson'],['Samson and Delilah','person-samson'],
    ['Who was Stephen?','person-stephen'],
    ['Who was Barnabas?','person-barnabas'],['Son of encouragement','person-barnabas'],
    ['Who was Eve?','person-eve'],['The fall of man','person-eve'],
    ['The Son of God','person-jesus'],['All things work together for good','romans8'],
    ['Do not commit adultery','commandments'],['What is joy?','fruit'],
    ['Will a man rob God?','giving'],['What does Joel say?','pentecost']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.equal(Study.context('Numbers 21:8',Bible),Study.notes.numbers);
  assert.equal(Study.context('2 Samuel 7:16',Bible),Study.notes.davidcovenant);
  assert.equal(Study.context('2 Kings 5:14',Bible),Study.notes['person-elisha']);
  assert.equal(Study.context('Matthew 1:1',Bible),Study.notes.genealogies);
  assert.equal(Study.context('Ezra 7:10',Bible),Study.notes.ezra);
  assert.equal(Study.context('Song of Solomon 8:7',Bible),Study.notes.song);
  assert.equal(Study.context('Lamentations 3:22',Bible),Study.notes.lamentations);
  assert.equal(Study.context('Ezekiel 37:10',Bible),Study.notes.drybones);
  assert.equal(Study.context('Hosea 11:1',Bible),Study.notes.hosea);
  assert.equal(Study.context('Amos 5:24',Bible),Study.notes.amos);
  assert.equal(Study.context('Micah 6:8',Bible),Study.notes.micah);
  assert.equal(Study.context('Habakkuk 2:4',Bible),Study.notes.habakkuk);
  assert.equal(Study.context('Galatians 5:1',Bible),Study.notes.galatians);
  assert.equal(Study.context('1 Timothy 4:12',Bible),Study.notes.timothy);
  assert.equal(Study.context('John 14:16',Bible),Study.notes.holyspirit);
  assert.equal(Study.context('2 Timothy 3:16',Bible),Study.notes.bibletrust);
  assert.equal(Study.context('John 20:30',Bible),Study.notes.miracles);
  assert.equal(Study.context('Acts 2:42',Bible),Study.notes.earlychurch);
  assert.equal(Study.context('Mark 5:15',Bible),Study.notes.demons);
  assert.equal(Study.context('Proverbs 16:18',Bible),Study.notes.pride);
  assert.equal(Study.context('Matthew 5:28',Bible),Study.notes.lust);
  assert.equal(Study.context('Genesis 22:12',Bible),Study.notes['person-isaac']);
  assert.equal(Study.context('Judges 4:4',Bible),Study.notes['person-deborah']);
});
test('well, ruler, martha, waves and garden receive bounded notes',()=>{
  for(const [text,id] of [
    ['Tell me about the woman at the well','well'],['Living water','well'],
    ['The rich young ruler','ruler'],['What must I do to inherit eternal life?','ruler'],
    ['Martha and Mary','martha'],['One thing is needed','martha'],
    ['Why did Peter sink?','waves'],['Lord save me','waves'],
    ['Not my will but yours','cup'],['Gethsemane','cup']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.match(Study.notes.well.copy,/outsider first/);
  assert.match(Study.notes.ruler.copy,/divided hearts/);
  assert.match(Study.notes.martha.copy,/crowding out presence/);
  assert.match(Study.notes.waves.copy,/shortest prayer/);
  assert.match(Study.notes.cup.copy,/chosen in dread/);
});
test('giants, furnaces, suffering, rest, giving, mission, seeds and suppers receive bounded notes',()=>{
  for(const [text,id] of [
    ['David and Goliath','goliath'],['Five smooth stones','goliath'],
    ['The fiery furnace','furnace'],['Shadrach Meshach and Abednego','furnace'],
    ['Why does God allow suffering?','whysuffer'],['Why do bad things happen?','whysuffer'],
    ['Remember the Sabbath','sabbath'],
    ['Should Christians tithe?','giving'],['A cheerful giver','giving'],
    ['The Great Commission','commission'],['Go and make disciples','commission'],
    ['Faith like a mustard seed','mustard'],
    ['The road to Emmaus','emmaus'],['Did not our hearts burn?','emmaus']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.match(Study.notes.goliath.copy,/underdog romance/);
  assert.match(Study.notes.furnace.copy,/nowhere in advance/);
  assert.match(Study.notes.whysuffer.copy,/refuses tidy reasons/);
  assert.match(Study.notes.sabbath.copy,/gift against both/);
  assert.match(Study.notes.giving.copy,/arm-twisted quota/);
  assert.match(Study.notes.commission.copy,/grounded and accompanied/);
  assert.match(Study.notes.mustard.copy,/object is God/);
  assert.match(Study.notes.emmaus.copy,/unrecognized hope/);
});
test('birth, cross, help, care and courage receive bounded notes',()=>{
  for(const [text,id] of [
    ['Where was Jesus born?','nativity'],['Tell me about the wise men','nativity'],
    ['Why did Jesus die?','cross'],['It is finished','cross'],
    ['I lift up my eyes','hills'],['Where does my help come from?','hills'],
    ['Cast all your anxiety on him','castcare'],
    ['Be strong and courageous','courage']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.match(Study.notes.nativity.copy,/announced, opposed/);
  assert.match(Study.notes.cross.copy,/completion, not defeat/);
  assert.match(Study.notes.hills.copy,/person, not a place/);
  assert.match(Study.notes.castcare.copy,/handing over/);
  assert.match(Study.notes.courage.copy,/companionship, not ease/);
});
test('strength, shepherd and vine receive bounded notes',()=>{
  for(const [text,id] of [
    ['Renew our strength','eagle'],['Wait for the Lord','eagle'],
    ['The good shepherd','shepherd'],['He lays down his life','shepherd'],
    ['I am the vine','vine'],['Abide in me','vine']
  ])assert.deepEqual(classify(text),{kind:'note',query:id},text);
  assert.match(Study.notes.eagle.copy,/hoping toward God/);
  assert.match(Study.notes.shepherd.copy,/costs the carer/);
  assert.match(Study.notes.vine.copy,/connection maintained/);
  assert.equal(Study.context('Isaiah 40:31',Bible),Study.notes.eagle);
  assert.equal(Study.context('John 15:5',Bible),Study.notes.vine);
});
test('library facts are counted live, never generated',()=>{
  assert.deepEqual(classify('How many books are in the Bible?'),{kind:'meta',query:'books'});
  assert.deepEqual(classify('How many chapters does the Bible have?'),{kind:'meta',query:'chapters'});
  assert.deepEqual(classify('How many verses are there?'),{kind:'meta',query:'verses'});
});
test('follow-ups use the immediate explicit passage or note, not guessed personal history',()=>{
  const history=[{study:{kind:'reference',query:'Romans 8:28'}}];
  for(const text of ['explain that verse more','Can you explain that verse in more detail?','explain that','tell me more','more context','go deeper','What does that mean?','in more detail'])assert.deepEqual(classify(text,history),{kind:'note',query:'romans8-more'},text);
  assert.deepEqual(classify('explain more',[{study:{kind:'note',query:'washingFeet'}}]),{kind:'note',query:'washingFeet-more'});
  assert.deepEqual(classify('explain more',[{study:{kind:'note',query:'washingFeet-more'}}]),{kind:'note',query:'washingFeet-more'});
  assert.deepEqual(classify('explain more',[{study:{kind:'reference',query:'Genesis 1:1'}}]),{kind:'note',query:'creation-more'});
  for(const previous of [undefined,[],[{text:'I am grieving'},...history],[{study:{kind:'search',query:'love'}},...history],[{study:{kind:'note',query:'__proto__'}}]])assert.deepEqual(classify('explain that verse more',previous),{kind:'clarify',query:'followup'});
  assert.equal(classify('What did Jesus say about divorce?',history)?.kind,'search');
  assert.equal(classify('I still feel anxious',history),null);
  assert.deepEqual(classify('Actually explain John 3:16',history),{kind:'reference',query:'John 3:16'});
});
test('overlong or malformed queries cannot silently become a different question',()=>{
  const longReference='John 3:16 '+('and '.repeat(40))+'Romans 8:28';
  assert.ok(longReference.length>160);
  assert.deepEqual(classify(longReference),{kind:'clarify',query:'shorter'});
  assert.deepEqual(classify('search for '+('hope '.repeat(34))),{kind:'clarify',query:'shorter'});
  assert.equal(classify('I feel anxious '+('about my situation '.repeat(20))),null);
  assert.equal(classify(''),null);
});
test('prepared notes and deeper notes have short sourced copy and real supporting passages',()=>{
  assert.equal(Object.keys(Study.notes).length,376);
  for(const [id,note] of Object.entries(Study.notes)){
    assert.ok(note.copy.trim().split(/\s+/).length<=100,id+' is concise');
    assert.ok(Bible.getPassage(note.reference).ok,id+' supporting passage exists');
    assert.match(note.source,/^https:\/\/(?:ebible\.org\/eng-web\/|bible\.usccb\.org\/bible\/)/);
    assert.ok(note.title&&note.copy);
    if(id.endsWith('-more'))assert.notEqual(note.copy,Study.notes[id.replace(/-more$/,'')].copy);
  }
});
test('study state is bounded and does not become emotional continuity',()=>{
  const saved={id:'study',key:'foundation',text:'John 3:16',at:'2026-09-25T10:00:00.000Z',study:{kind:'reference',query:'John 3:16',unsafe:'discard'},guide:'starting'};
  const result=Feelings.normalizeEntries([saved])[0];
  assert.deepEqual(result.study,{kind:'reference',query:'John 3:16'});
  assert.equal(result.guide,undefined);assert.equal(saved.guide,'starting');
  assert.equal(Feelings.match('it is still the same',[saved]).matched,false);
  assert.equal(Feelings.normalizeEntries([{...saved,study:{kind:'search',query:'x'.repeat(1000)}}])[0].study.query.length,160);
});

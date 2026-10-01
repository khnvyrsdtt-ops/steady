import XCTest
#if canImport(FoundationModels)
import FoundationModels
#endif
@testable import Steady

final class BurdenAnalysisTests: XCTestCase {
    func testWorkedExampleDetectsDecisionTimeAndUncertainty() {
        let result = BurdenAnalysis.analyze("I don't know whether I should go tomorrow.")
        XCTAssertEqual(result.intent, "decision")
        XCTAssertEqual(result.timeReference, "tomorrow")
        XCTAssertTrue(result.uncertainty)
        XCTAssertFalse(result.isQuestion)
        XCTAssertEqual(result.confidence, "high")
        XCTAssertEqual(BurdenAnalysis.waitingText(for: result), "Thinking through the choice…")
    }

    func testFaithPlanningAndSupportWaitingStates() {
        let faith = BurdenAnalysis.analyze("What does grace mean?")
        XCTAssertEqual(faith.intent, "faith")
        XCTAssertTrue(faith.isQuestion)
        XCTAssertEqual(BurdenAnalysis.waitingText(for: faith), "Understanding your question…")
        let planning = BurdenAnalysis.analyze("Help me plan my week", matched: true, guide: "starting")
        XCTAssertEqual(planning.intent, "planning")
        XCTAssertEqual(BurdenAnalysis.waitingText(for: planning), "Looking at what matters here…")
        let support = BurdenAnalysis.analyze("I feel anxious", topic: "rest", matched: true, guide: "anxiety")
        XCTAssertEqual(support.intent, "support")
        XCTAssertEqual(support.topic, "rest")
        XCTAssertEqual(BurdenAnalysis.waitingText(for: support), "Working through this with you…")
    }

    func testLowConfidenceFallsBackToNeutral() {
        for text in ["asdfgh", "I love decisions", "My brother is decisive", "The sky is blue"] {
            let result = BurdenAnalysis.analyze(text)
            XCTAssertEqual(result.confidence, "low", text)
            XCTAssertNil(BurdenAnalysis.waitingText(for: result), text)
        }
        let weak = BurdenAnalysis.analyze("I wonder whether it will rain")
        XCTAssertEqual(weak.intent, "decision")
        XCTAssertEqual(weak.confidence, "low")
        XCTAssertNil(BurdenAnalysis.waitingText(for: weak))
    }

    func testUrgencyNeverGetsDecoratedState() {
        let result = BurdenAnalysis.analyze("I need help right now")
        XCTAssertTrue(result.urgency)
        XCTAssertNil(BurdenAnalysis.waitingText(for: result))
    }

    func testAppleDateDetectorCatchesWhatRegexMisses() {
        // "the day after tomorrow" has no regex time token; NSDataDetector resolves it.
        let result = BurdenAnalysis.analyze("see you the day after tomorrow")
        XCTAssertEqual(result.timeReference, "the day after tomorrow")
        XCTAssertEqual(BurdenAnalysis.analyze("Should I go tomorrow?").timeReference, "tomorrow")
        XCTAssertNil(BurdenAnalysis.analyze("I feel lonely").timeReference)
    }

    func testContextShapeStaysLocal() {
        let result = BurdenAnalysis.analyze("I am sad.", topic: "grief", matched: true, guide: "grief")
        XCTAssertFalse(result.isQuestion)
        let context = BurdenAnalysis.context(of: result)
        XCTAssertEqual(context["intent"], "support")
        XCTAssertEqual(context["topic"], "grief")
        XCTAssertEqual(context["uncertainty"], "false")
    }
}

final class BurdenReplyOrganizerTests: XCTestCase {
    func testInterpretationRejectsInventedGuidesAndInvalidRequests() {
        let valid: [String: Any] = ["requestId":"ask:123", "text":"What about tomorrow?", "history":["I have two job offers."]]
        XCTAssertNotNil(BurdenInterpretationRequest(payload: valid))
        var invalid = valid
        invalid["history"] = ["one", "two", "three"]
        XCTAssertNil(BurdenInterpretationRequest(payload: invalid))
        let result = BurdenInterpretation.validated(#"{"animal":"fox","guide":"decisions","confidence":"clear"}"#, requestId:"ask:123")
        XCTAssertTrue(result.available)
        XCTAssertEqual(result.guide, "decisions")
        for response in [#"{"animal":"fox","guide":"invented","confidence":"clear"}"#,
                         #"{"animal":"wolf","guide":"decisions","confidence":"clear"}"#,
                         #"{"animal":"fox","guide":"decisions","confidence":"certain"}"#] {
            XCTAssertFalse(BurdenInterpretation.validated(response, requestId:"ask:123").available)
        }
    }

    func testWordingKeepsApprovedSourceWhenModelInventsNumbersOrPromises() {
        let source = "Take one small step, then pause and rest."
        XCTAssertEqual(BurdenOrganisedReply.groundedText("Take one gentle step, then rest.", source: source),
                       "Take one gentle step, then rest.")
        XCTAssertNil(BurdenOrganisedReply.groundedText("Take 3 steps, then rest.", source: source))
        XCTAssertNil(BurdenOrganisedReply.groundedText("You will definitely feel better.", source: source))
    }
    private func request(_ id: String = "reply-1") -> BurdenReplyRequest {
        BurdenReplyRequest(payload: ["requestId": id, "text": "I’m worried about tomorrow.", "sourceText": "Take one small step, then pause and rest."])!
    }

    func testRequestValidationRejectsMissingMalformedAndOversizedData() {
        let valid: [String: Any] = ["requestId": "reply:123-ab", "text": " A concern. ", "sourceText": " Take one “gentle” step. "]
        let parsed = BurdenReplyRequest(payload: valid)
        XCTAssertEqual(parsed?.text, "A concern.")
        XCTAssertEqual(parsed?.sourceText, "Take one “gentle” step.")
        XCTAssertNil(BurdenReplyRequest(payload: [:]))
        for (key, value): (String, Any) in [
            ("requestId", ""), ("requestId", "reply\n"), ("requestId", String(repeating: "x", count: 81)),
            ("requestId", "<script>"), ("text", 1), ("text", " \n "), ("text", String(repeating: "x", count: 1201)),
            ("text", String(repeating: "😀", count: 601)), ("sourceText", ""), ("sourceText", String(repeating: "x", count: 3001))
        ] {
            var payload = valid
            payload[key] = value
            XCTAssertNil(BurdenReplyRequest(payload: payload), key)
        }
    }

    func testOptionalMemoriesPreserveLegacyRequestsAndValidateEachNote() {
        var payload: [String: Any] = ["requestId": "reply-1", "text": "A concern.", "sourceText": "A gentle response."]
        XCTAssertEqual(BurdenReplyRequest(payload: payload)?.memories, [])
        let memories = ["I work nights.", "I prefer short replies.", String(repeating: "x", count: 180), String(repeating: "😀", count: 90)]
        payload["memories"] = memories
        XCTAssertEqual(BurdenReplyRequest(payload: payload)?.memories, memories)
        for value: Any in [NSNull(), "A note", [1], [""], [" \n "], Array(repeating: "A note", count: 5), [String(repeating: "x", count: 181)], [String(repeating: "😀", count: 91)]] {
            payload["memories"] = value
            XCTAssertNil(BurdenReplyRequest(payload: payload))
        }
    }

    func testOutputValidationKeepsShortProseAndRejectsQuotationsReferencesAndClaims() {
        XCTAssertEqual(BurdenOrganisedReply.validatedText("  Take one small step, then rest.  "), "Take one small step, then rest.")
        for output in ["", " \n ", String(repeating: "x", count: 701), Array(repeating: "word", count: 101).joined(separator: " "),
                       "Read Matthew 11:28.", "Read Psalm 23.", "Jesus says to you that tomorrow will be easy.",
                       "God promises you success.", "Here is a “quotation”.", "<p>Take a step.</p>",
                       "See https://example.com.", "I cannot provide that response."] {
            XCTAssertNil(BurdenOrganisedReply.validatedText(output), output)
        }
    }

    @MainActor
    func testUnavailableModelNeverGenerates() async {
        var calls = 0
        let service = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: false, reason: "model_not_ready") }) { _ in
            calls += 1
            return "A response."
        }
        XCTAssertEqual(service.status().reason, "model_not_ready")
        let result = await service.organise(request())
        XCTAssertFalse(result.available)
        XCTAssertEqual(result.requestId, "reply-1")
        XCTAssertEqual(calls, 0)
    }

    @MainActor
    func testSuccessfulGenerationReceivesOnlyTheBoundedRequestAndReleasesItsSlot() async {
        var received: [BurdenReplyRequest] = []
        let service = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }) { input in
            received.append(input)
            return "  Take one small step, then pause and rest.  "
        }
        let first = await service.organise(request())
        let second = await service.organise(request("reply-2"))
        XCTAssertTrue(first.available)
        XCTAssertEqual(first.text, "Take one small step, then pause and rest.")
        XCTAssertEqual(second.requestId, "reply-2")
        XCTAssertTrue(second.available)
        XCTAssertEqual(received, [request(), request("reply-2")])
    }

    @MainActor
    func testErrorsAndRejectedOutputFallBackWithoutLeakingErrorText() async {
        enum TestError: Error { case refused }
        let failed = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }) { _ in throw TestError.refused }
        let failedResult = await failed.organise(request())
        XCTAssertFalse(failedResult.available)
        XCTAssertNil(failedResult.text)
        let invalid = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }) { _ in "Matthew 11:28 says to rest." }
        let invalidResult = await invalid.organise(request())
        XCTAssertFalse(invalidResult.available)
    }

    @MainActor
    func testDeadlineReturnsFallbackAndPreventsOverlappingUncooperativeGeneration() async {
        var finish: CheckedContinuation<String, Never>?
        var calls = 0
        let service = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }, timeoutNanoseconds: 10_000_000) { _ in
            calls += 1
            return await withCheckedContinuation { finish = $0 }
        }
        let result = await service.organise(request())
        XCTAssertFalse(result.available)
        let busy = await service.organise(request("reply-2"))
        XCTAssertFalse(busy.available)
        XCTAssertEqual(calls, 1)
        finish?.resume(returning: "A late response must not replace the fallback.")
    }

    @MainActor
    func testExplicitCancellationReturnsFallbackAndIgnoresLateOutput() async {
        var finish: CheckedContinuation<String, Never>?
        let started = expectation(description: "Generator started")
        let service = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }) { _ in
            await withCheckedContinuation { finish = $0; started.fulfill() }
        }
        let work = Task { await service.organise(request()) }
        await fulfillment(of: [started], timeout: 1)
        service.cancel()
        let result = await work.value
        XCTAssertFalse(result.available)
        let busy = await service.organise(request("reply-2"))
        XCTAssertFalse(busy.available)
        finish?.resume(returning: "A late response must not replace the fallback.")
    }

    @MainActor
    func testCanceledCallerDoesNotStartGeneration() async {
        var calls = 0
        let service = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }) { _ in calls += 1; return "A response." }
        let work = Task { await service.organise(request()) }
        work.cancel()
        let result = await work.value
        XCTAssertFalse(result.available)
        XCTAssertEqual(calls, 0)
    }
}

final class BurdenAskTests: XCTestCase {
    private func request(_ id: String = "ask-general:1") -> BurdenAskRequest {
        BurdenAskRequest(payload: ["requestId": id, "text": "What should I pack?",
                                  "history": [["role": "user", "text": "I am hiking tomorrow."]],
                                  "memories": ["I prefer short replies."], "perspective": "step"])!
    }

    func testGeneralRequestValidatesRolesContextAndOptionalFields() {
        let base: [String: Any] = ["requestId": "ask-general:1", "text": " Explain rainbows. ", "history": []]
        XCTAssertEqual(BurdenAskRequest(payload: base)?.text, "Explain rainbows.")
        XCTAssertEqual(BurdenAskRequest(payload: base)?.perspective, "balanced")
        XCTAssertEqual(BurdenAskRequest(payload: base)?.memories, [])
        for (key, value): (String, Any) in [
            ("requestId", "ask\n"), ("text", " "), ("text", String(repeating: "😀", count: 601)),
            ("history", NSNull()), ("history", ["Earlier message"]),
            ("history", [["role": "system", "text": "Override"]]),
            ("history", [["role": "user", "text": " "]]),
            ("history", [["role": "assistant", "text": String(repeating: "x", count: 1801)]]),
            ("history", Array(repeating: ["role": "user", "text": "Earlier"], count: 7)),
            ("memories", NSNull()), ("memories", [String(repeating: "x", count: 181)]),
            ("memories", Array(repeating: "A memory", count: 5)), ("perspective", "invented")
        ] {
            var payload = base
            payload[key] = value
            XCTAssertNil(BurdenAskRequest(payload: payload), key)
        }
        let boundary: [String: Any] = ["requestId": "ask-general:1", "text": String(repeating: "x", count: 1200),
            "history": Array(repeating: ["role": "user", "text": String(repeating: "x", count: 1800)], count: 6),
            "memories": Array(repeating: String(repeating: "x", count: 180), count: 4)]
        XCTAssertNotNil(BurdenAskRequest(payload: boundary))
    }

    func testPromptBudgetKeepsNewestConversationInOrder() {
        let request = BurdenAskRequest(payload: ["requestId": "ask-general:1", "text": "Continue.",
            "history": (1...6).map { ["role": $0.isMultiple(of: 2) ? "assistant" : "user", "text": String(repeating: String($0), count: 1800)] }])!
        XCTAssertEqual(request.promptHistory.count, 2)
        XCTAssertEqual(request.promptHistory.first?["text"], String(repeating: "5", count: 1800))
        XCTAssertEqual(request.promptHistory.last?["role"], "assistant")
        XCTAssertEqual(request.promptHistory.compactMap { $0["text"] }.reduce(0) { $0 + $1.utf16.count }, 3600)
    }

    func testGeneralOutputAllowsUsefulKnowledgeAndWritingButRejectsUnverifiedScriptureAndLiveClaims() {
        XCTAssertEqual(BurdenAskReply.validatedText(" Water droplets refract and reflect sunlight, separating its colours. "),
                       "Water droplets refract and reflect sunlight, separating its colours.")
        XCTAssertNotNil(BurdenAskReply.validatedText("You could write: “Thanks for helping me yesterday.”"))
        for output in ["", String(repeating: "x", count: 3001), Array(repeating: "a", count: 501).joined(separator: " "),
                       "Read John 3:16.", "Try 1 Cor. 13.", "Look at Ps 23.", "The Bible says you must do this.",
                       "Jesus promises a better outcome.", "I searched for the latest prices.", "I've checked online.",
                       "See https://example.com.", "<p>A reply.</p>"] {
            XCTAssertNil(BurdenAskReply.validatedText(output), output)
        }
    }

    func testGeneratedScriptureBoundaryCatchesCompactAndSpelledReferencesWithoutRejectingOrdinaryWriting() {
        for output in ["Read John3:16.", "Use 1Cor.13:4 for this.", "Psalm chapter twenty three will help.",
                       "First Corinthians chapter thirteen, verse four.", "John three verse sixteen.",
                       "According to the Bible, you are guaranteed success.",
                       "The biblical verse reads: love never goes wrong.", "Christ taught this as certain.",
                       "As it is written, nothing can ever go wrong.", "Read Ｊｏｈｎ３：１６.", "Read J\u{200b}ohn3:16.",
                       "The Lord is my shepherd; I shall not want."] {
            XCTAssertNil(BurdenAskReply.validatedText(output), output)
            XCTAssertNil(BurdenOrganisedReply.validatedText(output), output)
        }
        for output in ["Job one is to write down the problem.", "John has three options to consider.",
                       "You could write: “Thanks, Mark. Your help means a lot.”",
                       "A rainbow forms when sunlight is refracted and reflected inside droplets.",
                       "I can help you find a passage in the Bible library."] {
            XCTAssertNotNil(BurdenAskReply.validatedText(output), output)
        }
    }

    func testBookNamesThatAreEverydayWordsOnlyCountAsReferencesWithAReadingCue() {
        for output in ["Your job 3 days a week leaves little room, so protect one evening.",
                       "Mark 5 items as done and leave the rest.", "Call John 2 hours before the meeting.",
                       "Acts 2 and 3 of the play are the longest.", "Keep numbers 1 to 5 on the first page.",
                       "Your ex 2 years later still affects how you trust people."] {
            XCTAssertNotNil(BurdenAskReply.validatedText(output), output)
            XCTAssertNotNil(BurdenOrganisedReply.validatedText(output), output)
        }
        for output in ["Read Mark 5 tonight.", "In Mark 4, a storm is calmed.", "Turn to Job 38 for this.",
                       "See 1 John 4 on fear.", "2 Tim 3 speaks to this.", "From Luke 15, the father runs.",
                       "Psalm 23 fits here.", "Try Romans 8.", "1 Samuel 17 is the story of David.",
                       "Second Peter 1 lists virtues.", "Revelation 21 describes a new creation."] {
            XCTAssertNil(BurdenAskReply.validatedText(output), output)
            XCTAssertNil(BurdenOrganisedReply.validatedText(output), output)
        }
    }

    func testDetailedRequestsHaveRoomToFinishWhileShortRepliesRemainTheDefault() {
        func tokens(_ text: String) -> Int {
            BurdenAskRequest(payload: ["requestId": "ask-detail:1", "text": text, "history": []])!.maximumResponseTokens
        }
        for text in ["Explain rainbows.", "What should I do?", "Explain in detail, but keep it short.",
                     "Don't go into detail, just explain rainbows."] {
            XCTAssertEqual(tokens(text), 500, text)
        }
        for text in ["Explain this in detail.", "Give me a step-by-step plan.", "Go deeper."] {
            XCTAssertEqual(tokens(text), 800, text)
        }
    }

    func testReducedContextRetainsBothSidesOfTheNewestExchangeAndHandlesUnicode() {
        let request = BurdenAskRequest(payload: ["requestId": "ask-context:1", "text": "Expand that.", "history": [
            ["role": "user", "text": "Old question"], ["role": "assistant", "text": "Old answer"],
            ["role": "user", "text": String(repeating: "😀", count: 600)],
            ["role": "assistant", "text": String(repeating: "a", count: 1800)]
        ]])!
        XCTAssertEqual(request.reducedPromptHistory.count, 2)
        XCTAssertEqual(request.reducedPromptHistory.map { $0["role"] }, ["user", "assistant"])
        XCTAssertEqual(request.reducedPromptHistory.first?["text"], String(repeating: "😀", count: 300))
        XCTAssertEqual(request.reducedPromptHistory.compactMap { $0["text"] }.reduce(0) { $0 + $1.utf16.count }, 1200)
    }

    @MainActor
    func testContextWindowFailureRetriesOnlyOnceWithSmallerHistory() async throws {
        #if canImport(FoundationModels)
        guard #available(iOS 26.0, *) else { return }
        let overflow = LanguageModelSession.GenerationError.exceededContextWindowSize(.init(debugDescription: "Test context window"))
        let input = BurdenAskRequest(payload: ["requestId": "ask-context:1", "text": "Explain in detail.", "history": [
            ["role": "user", "text": String(repeating: "q", count: 1200)],
            ["role": "assistant", "text": String(repeating: "a", count: 1800)]
        ]])!
        var supplied: [[[String: String]]] = []
        let result = try await BurdenReplyOrganizer.answerWithContextRecovery(input) { history, limit in
            supplied.append(history)
            XCTAssertEqual(limit, 800)
            if supplied.count == 1 { throw overflow }
            return "A complete answer."
        }
        XCTAssertEqual(result, "A complete answer.")
        XCTAssertEqual(supplied, [input.promptHistory, input.reducedPromptHistory])
        var calls = 0
        do {
            _ = try await BurdenReplyOrganizer.answerWithContextRecovery(input) { _, _ in calls += 1; throw overflow }
            XCTFail("A repeated overflow must not be hidden")
        } catch { XCTAssertTrue(BurdenReplyOrganizer.isContextWindowFailure(error)) }
        XCTAssertEqual(calls, 2)
        if #available(iOS 27.0, *) {
            XCTAssertTrue(BurdenReplyOrganizer.isContextWindowFailure(LanguageModelError.contextSizeExceeded(
                .init(contextSize: 4096, tokenCount: 5000, debugDescription: "Test context window"))))
        }
        #endif
    }

    @MainActor
    func testOtherGenerationFailuresDoNotRetry() async {
        var calls = 0
        do {
            _ = try await BurdenReplyOrganizer.answerWithContextRecovery(request()) { _, _ in
                calls += 1
                throw BurdenReplyOrganizer.GenerationFailure.unavailable
            }
            XCTFail("Unavailable model must not be hidden")
        } catch { XCTAssertFalse(BurdenReplyOrganizer.isContextWindowFailure(error)) }
        XCTAssertEqual(calls, 1)
    }

    @MainActor
    func testGeneralAnswerUsesFullRequestAndReleasesSharedModelSlot() async {
        var received: [BurdenAskRequest] = []
        let service = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }, answer: { input in
            received.append(input)
            return " Bring water and a rain layer. "
        }, generate: { _ in "Take one step." })
        let first = await service.answer(request())
        let second = await service.answer(request("ask-general:2"))
        XCTAssertEqual(first.text, "Bring water and a rain layer.")
        XCTAssertEqual(second.requestId, "ask-general:2")
        XCTAssertEqual(received, [request(), request("ask-general:2")])
        let rewrite = await service.organise(BurdenReplyRequest(payload: ["requestId": "rewrite:1", "text": "Help.", "sourceText": "Take one step."])!)
        XCTAssertTrue(rewrite.available)
    }

    @MainActor
    func testGeneralAnswerAvailabilityAndRejectedOutputNeverLeakErrors() async {
        var calls = 0
        let unavailable = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: false) }, answer: { _ in calls += 1; return "A reply." }, generate: { _ in "A reply." })
        let missing = await unavailable.answer(request())
        XCTAssertFalse(missing.available)
        XCTAssertEqual(calls, 0)
        let invalid = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }, answer: { _ in "Read John 3:16." }, generate: { _ in "A reply." })
        let rejected = await invalid.answer(request())
        XCTAssertFalse(rejected.available)
        let failed = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }, answer: { _ in throw BurdenReplyOrganizer.GenerationFailure.unavailable }, generate: { _ in "A reply." })
        let error = await failed.answer(request())
        XCTAssertFalse(error.available)
        XCTAssertNil(error.text)
    }

    @MainActor
    func testGeneralAnswerDeadlineResolvesAndPreventsOverlappingMemoryExtraction() async {
        var finish: CheckedContinuation<String, Never>?
        var memoryCalls = 0
        let service = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }, answerTimeoutNanoseconds: 10_000_000,
            extract: { _ in memoryCalls += 1; return "[]" },
            answer: { _ in await withCheckedContinuation { finish = $0 } }, generate: { _ in "A reply." })
        let answer = await service.answer(request())
        XCTAssertFalse(answer.available)
        let memory = await service.extractMemory(BurdenMemoryRequest(payload: ["requestId": "memory:1", "text": "I prefer short replies."])!)
        XCTAssertFalse(memory.available)
        XCTAssertEqual(memoryCalls, 0)
        finish?.resume(returning: "A late answer must not be delivered.")
    }

    @MainActor
    func testCancelledGeneralCallerResolvesAndKeepsLateGenerationOutOfOtherJobs() async {
        var finish: CheckedContinuation<String, Never>?
        let started = expectation(description: "General model started")
        let service = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }, answer: { _ in
            await withCheckedContinuation { finish = $0; started.fulfill() }
        }, generate: { _ in XCTFail("A rewrite must not overlap"); return "A reply." })
        let work = Task { await service.answer(request()) }
        await fulfillment(of: [started], timeout: 1)
        work.cancel()
        let result = await work.value
        XCTAssertFalse(result.available)
        let rewrite = await service.organise(BurdenReplyRequest(payload: ["requestId": "rewrite:1", "text": "Help.", "sourceText": "A reply."])!)
        XCTAssertFalse(rewrite.available)
        finish?.resume(returning: "A late answer must not be delivered.")
    }
}

/// Explicit, opt-in generation on the connected phone. Synthetic prompts stay
/// in the test process and are never submitted to or saved in the chat UI.
final class BurdenOnDeviceQualityTests: XCTestCase {
    @MainActor
    func testSyntheticOnDeviceAnswerQuality() async throws {
        guard ProcessInfo.processInfo.environment["STEADY_RUN_ON_DEVICE_EVAL"] == "1" else {
            throw XCTSkip("Set STEADY_RUN_ON_DEVICE_EVAL=1 for the opt-in on-device quality review.")
        }
        let service = BurdenReplyOrganizer()
        let status = service.status()
        guard status.available else { throw XCTSkip("Apple Intelligence unavailable: \(status.reason ?? "unknown").") }
        let examples: [(label: String, text: String, history: [[String: String]], memories: [String], perspective: String)] = [
            ("01-simple-explanation", "How does photosynthesis work? Keep it to two short sentences.", [], [], "explore"),
            ("02-context-aware-writing", "Write a short message to my friend saying I can't meet for breakfast tomorrow, but can meet later. Don't make up an exact time.", [], ["I work night shifts.", "I prefer short, straightforward replies."], "balanced"),
            ("03-constrained-practical-plan", "I have 20 minutes before work. The kitchen is messy and I still need to eat. What should I do first?", [], [], "step"),
            ("04-follow-up-and-humble-tone", "What would you do first? Don't make a big thing of it.", [
                ["role": "user", "text": "I need to apply for a job but the form feels like a lot."],
                ["role": "assistant", "text": "Open the form and fill in the contact details first. Then leave the longer answers for a second pass."]
            ], ["I prefer short, direct answers with a humble tone."], "untangle"),
            ("05-live-information-honesty", "What's the weather in Dublin right now?", [], [], "balanced"),
            ("06-holdout-condensation", "Why does the outside of a cold glass get wet? Explain in two sentences.", [], [], "explore"),
            ("07-holdout-job-choice", "I'm considering a job with a higher salary, but it adds an hour to my daily commute. I value having time at home. How should I weigh that up?", [], ["I prefer straightforward answers."], "untangle"),
            ("08-holdout-polite-rewrite", "Make this polite but still clear: 'I can't cover Saturday. Please ask someone else.' Keep it brief, and don't add a reason or apology.", [], [], "balanced"),
            ("09-holdout-freezing", "Why does salt help melt icy paths? Explain in two sentences.", [], [], "explore"),
            ("10-holdout-deadline", "I need to leave for the bus in ten minutes. I still need to buy my ticket and pack lunch, and I wanted to fold the laundry. What should I prioritise?", [], [], "step")
        ]
        for example in examples {
            let request = BurdenAskRequest(payload: ["requestId": "eval:\(example.label)", "text": example.text,
                "history": example.history, "memories": example.memories, "perspective": example.perspective])!
            let start = Date()
            let response = await service.answer(request)
            let answer = response.text ?? "[No valid on-device answer returned]"
            let report = "CASE: \(example.label)\nSECONDS: \(String(format: "%.2f", Date().timeIntervalSince(start)))\nPROMPT: \(example.text)\nANSWER:\n\(answer)"
            let attachment = XCTAttachment(string: report)
            attachment.name = example.label
            attachment.lifetime = .keepAlways
            add(attachment)
            print("STEADY_ON_DEVICE_EVAL_BEGIN\n\(report)\nSTEADY_ON_DEVICE_EVAL_END")
            XCTAssertTrue(response.available, "\(example.label) should return a useful validated answer")
            if let answer = response.text {
                XCTAssertFalse(answer.isEmpty)
                XCTAssertLessThanOrEqual(answer.utf16.count, 3000)
                if example.label == "01-simple-explanation" {
                    XCTAssertNotNil(answer.range(of: #"\b(?:light|sunlight|sun)\b"#, options: [.regularExpression, .caseInsensitive]))
                }
                if ["01-simple-explanation", "06-holdout-condensation", "09-holdout-freezing"].contains(example.label) {
                    let sentences = answer.components(separatedBy: CharacterSet(charactersIn: ".!?"))
                        .filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
                    XCTAssertEqual(sentences.count, 2, "An explicit request for two sentences should be honored.")
                }
                if ["01-simple-explanation", "03-constrained-practical-plan", "04-follow-up-and-humble-tone", "05-live-information-honesty", "06-holdout-condensation", "07-holdout-job-choice", "09-holdout-freezing", "10-holdout-deadline"].contains(example.label) {
                    XCTAssertFalse(answer.contains("?"), "\(example.label) has enough context to answer without an unsolicited follow-up question.")
                }
                if example.label == "05-live-information-honesty" {
                    XCTAssertNotNil(answer.range(of: #"\b(?:cannot|can['’]t|don['’]t have|do not have|unable|no (?:live|real[ -]time|internet)|can not)\b"#, options: [.regularExpression, .caseInsensitive]),
                                    "A local model must be honest about lacking live weather.")
                }
            }
        }
    }
}

final class BurdenMemoryTests: XCTestCase {
    func testTemporaryFeelingsAreNotKeptAsLastingMemories() {
        let source="I feel worn out. I prefer brief replies. I often feel anxious at work."
        XCTAssertEqual(BurdenExtractedMemory.validatedNotes(#"["I feel worn out.","I prefer brief replies."]"#, source:source),["I prefer brief replies."])
        XCTAssertEqual(BurdenExtractedMemory.validatedNotes(#"["I often feel anxious at work."]"#, source:source),["I often feel anxious at work."])
        XCTAssertEqual(BurdenExtractedMemory.validatedNotes(#"["I'm tired."]"#, source:"I'm tired."),[])
    }
    private func request() -> BurdenMemoryRequest {
        BurdenMemoryRequest(payload: ["requestId": "memory-1", "text": "I work night shifts. I prefer short replies."])!
    }

    func testRequestBoundsAndCredentialExclusion() {
        XCTAssertNil(BurdenMemoryRequest(payload: [:]))
        XCTAssertNil(BurdenMemoryRequest(payload: ["requestId": "memory\n", "text": "A note."]))
        for text in ["", " \n ", String(repeating: "x", count: 1201), String(repeating: "😀", count: 601),
                     "My password is a fictional example.", "My PIN is a test.", "My recovery phrase is a test.", "My API key is a test."] {
            XCTAssertNil(BurdenMemoryRequest(payload: ["requestId": "memory-1", "text": text]))
        }
        XCTAssertNotNil(BurdenMemoryRequest(payload: ["requestId": "memory-1", "text": String(repeating: "x", count: 1200)]))
        XCTAssertEqual(request().text, "I work night shifts. I prefer short replies.")
    }

    func testOnlyVerbatimBoundedJSONStringArraysAreAccepted() {
        let source = request().text
        XCTAssertEqual(BurdenExtractedMemory.validatedNotes(#"["I work night shifts.","I prefer short replies."]"#, source: source), ["I work night shifts.", "I prefer short replies."])
        XCTAssertEqual(BurdenExtractedMemory.validatedNotes("[]", source: source), [])
        XCTAssertEqual(BurdenExtractedMemory.validatedNotes(#"["I work night shifts.","I work night shifts."]"#, source: source), ["I work night shifts."])
        for raw in ["not JSON", "{}", "null", "[4]", #"[""]"#, #"["I work day shifts."]"#,
                    #"["I work night shifts.","I prefer short replies.","I work night shifts."]"#,
                    "```json\n[]\n```"] {
            XCTAssertNil(BurdenExtractedMemory.validatedNotes(raw, source: source), raw)
        }
        XCTAssertNil(BurdenExtractedMemory.validatedNotes(#"["Café"]"#, source: "Cafe\u{301}"))
        XCTAssertNil(BurdenExtractedMemory.validatedNotes(#"["Matthew 11:28"]"#, source: "Matthew 11:28"))
        XCTAssertNil(BurdenExtractedMemory.validatedNotes(#"["fictional-example"]"#, source: "My password is fictional-example"))
        let boundary = String(repeating: "x", count: 180)
        XCTAssertEqual(BurdenExtractedMemory.validatedNotes("[\"\(boundary)\"]", source: boundary), [boundary])
        XCTAssertNil(BurdenExtractedMemory.validatedNotes("[\"\(boundary)x\"]", source: boundary + "x"))
    }

    @MainActor
    func testExtractionUsesTheExactRequestAndHandlesNoUsefulMemory() async {
        var received: [BurdenMemoryRequest] = []
        let service = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }, extract: { input in
            received.append(input)
            return received.count == 1 ? #"["I work night shifts."]"# : "[]"
        }, generate: { _ in "A response." })
        let first = await service.extractMemory(request())
        XCTAssertTrue(first.available)
        XCTAssertEqual(first.notes, ["I work night shifts."])
        let second = await service.extractMemory(request())
        XCTAssertTrue(second.available)
        XCTAssertEqual(second.notes, [])
        XCTAssertEqual(received, [request(), request()])
    }

    @MainActor
    func testExtractionUnavailableErrorsAndInventedOutputReturnNoNotes() async {
        var calls = 0
        let unavailable = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: false) }, extract: { _ in calls += 1; return "[]" }, generate: { _ in "A response." })
        let notAvailable = await unavailable.extractMemory(request())
        XCTAssertFalse(notAvailable.available)
        XCTAssertEqual(notAvailable.notes, [])
        XCTAssertEqual(calls, 0)
        let failed = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }, extract: { _ in throw BurdenReplyOrganizer.GenerationFailure.unavailable }, generate: { _ in "A response." })
        let failedResult = await failed.extractMemory(request())
        XCTAssertFalse(failedResult.available)
        let invented = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }, extract: { _ in #"["I work day shifts."]"# }, generate: { _ in "A response." })
        let inventedResult = await invented.extractMemory(request())
        XCTAssertFalse(inventedResult.available)
        XCTAssertEqual(inventedResult.notes, [])
    }

    @MainActor
    func testExtractionTimeoutHoldsTheSharedSlotUntilGenerationActuallyExits() async {
        var finish: CheckedContinuation<String, Never>?
        var rewriteCalls = 0
        let service = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }, timeoutNanoseconds: 10_000_000,
            extract: { _ in await withCheckedContinuation { finish = $0 } }, generate: { _ in rewriteCalls += 1; return "A response." })
        let timedOut = await service.extractMemory(request())
        XCTAssertFalse(timedOut.available)
        XCTAssertEqual(timedOut.notes, [])
        let rewrite = BurdenReplyRequest(payload: ["requestId": "reply-1", "text": "A concern.", "sourceText": "A response."])!
        let busy = await service.organise(rewrite)
        XCTAssertFalse(busy.available)
        XCTAssertEqual(rewriteCalls, 0)
        finish?.resume(returning: #"["I work night shifts."]"#)
    }

    @MainActor
    func testExtractionCancellationReturnsNoNotesAndIgnoresLateOutput() async {
        var finish: CheckedContinuation<String, Never>?
        let started = expectation(description: "Extraction started")
        let service = BurdenReplyOrganizer(availability: { BurdenLocalAIStatus(available: true) }, extract: { _ in
            await withCheckedContinuation { finish = $0; started.fulfill() }
        }, generate: { _ in "A response." })
        let work = Task { await service.extractMemory(request()) }
        await fulfillment(of: [started], timeout: 1)
        service.cancel()
        let result = await work.value
        XCTAssertFalse(result.available)
        XCTAssertEqual(result.notes, [])
        finish?.resume(returning: #"["I work night shifts."]"#)
    }
}

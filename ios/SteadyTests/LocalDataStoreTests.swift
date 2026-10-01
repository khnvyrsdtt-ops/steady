import XCTest
import UIKit
import SwiftUI
import WebKit
@testable import Steady

final class LocalDataStoreTests: XCTestCase {
    private var folder: URL!
    override func setUpWithError() throws {
        folder = FileManager.default.temporaryDirectory.appendingPathComponent("SteadyTests-\(UUID().uuidString)", isDirectory: true)
    }
    override func tearDownWithError() throws {
        if let folder, FileManager.default.fileExists(atPath: folder.path) { try FileManager.default.removeItem(at: folder) }
    }
    func testColdLaunchReadsSavedEntriesAndPreferences() throws {
        let first = try LocalDataStore(directory: folder)
        try first.save(.init(version: 1, revision: 4, values: ["steady.v1":"{\"days\":{\"2026-09-25\":{\"reflection\":\"a private test\"}}}", "steady.theme":"dark"]))
        let next = try LocalDataStore(directory: folder)
        XCTAssertNil(next.readError)
        XCTAssertEqual(next.snapshot?.revision, 4)
        XCTAssertEqual(next.snapshot?.values["steady.theme"], "dark")
        XCTAssertTrue(next.snapshot?.values["steady.v1"]?.contains("a private test") == true)
    }
    func testUnknownKeysAndInvalidStateAreRejected() throws {
        XCTAssertThrowsError(try LocalDataStore.validate(.init(version: 1, revision: 1, values: ["unrelated.private":"value"])))
        XCTAssertThrowsError(try LocalDataStore.validate(.init(version: 1, revision: 1, values: ["steady.v1":"not json"])))
        XCTAssertThrowsError(try LocalDataStore.validate(.init(version: 1, revision: -1, values: [:])))
    }
    func testStaleWriteDoesNotReplaceNewerData() throws {
        let store = try LocalDataStore(directory: folder)
        try store.save(.init(version: 1, revision: 3, values: ["steady.theme":"dark"]))
        XCTAssertThrowsError(try store.save(.init(version: 1, revision: 2, values: ["steady.theme":"light"])))
        XCTAssertEqual(store.snapshot?.values["steady.theme"], "dark")
    }
    func testUnreadableMirrorIsPreservedAndWritesBlocked() throws {
        _ = try LocalDataStore(directory: folder)
        let path = folder.appendingPathComponent("entries-v1.json")
        let corrupt = Data("unreadable original".utf8)
        try corrupt.write(to: path)
        let store = try LocalDataStore(directory: folder)
        XCTAssertNotNil(store.readError)
        XCTAssertThrowsError(try store.save(.init(version: 1, revision: 1, values: [:])))
        XCTAssertEqual(try Data(contentsOf: path), corrupt)
    }
    func testIntentionalEraseSurvivesColdLaunch() throws {
        let store = try LocalDataStore(directory: folder)
        try store.save(.init(version: 1, revision: 1, values: ["steady.theme":"dark"]))
        try store.save(.init(version: 1, revision: 2, values: [:]))
        let next = try LocalDataStore(directory: folder)
        XCTAssertEqual(next.snapshot?.values, [:])
    }
    func testWebRefreshPreservesEntriesAndStablePath() throws {
        let store = try LocalDataStore(directory: folder)
        try store.save(.init(version: 1, revision: 1, values: ["steady.theme":"dark"]))
        let source = folder.appendingPathComponent("TestSource", isDirectory: true)
        try FileManager.default.createDirectory(at: source, withIntermediateDirectories: false)
        try Data("old web".utf8).write(to: source.appendingPathComponent("index.html"))
        let first = try store.installWebContent(from: source)
        try Data("updated web".utf8).write(to: source.appendingPathComponent("index.html"))
        let second = try store.installWebContent(from: source)
        XCTAssertEqual(first, second)
        XCTAssertEqual(try String(contentsOf: second.appendingPathComponent("index.html"), encoding: .utf8), "updated web")
        XCTAssertEqual(try LocalDataStore(directory: folder).snapshot?.values["steady.theme"], "dark")
    }
    func testKeyboardHeightSupportsCrossFadeAndFloatingKeyboard() {
        let bounds = CGRect(x: 0, y: 0, width: 390, height: 844)
        XCTAssertEqual(NativeViewport.availableHeight(bounds: bounds, keyboard: nil), 844)
        XCTAssertEqual(NativeViewport.availableHeight(bounds: bounds, keyboard: CGRect(x: 0, y: 544, width: 390, height: 300)), 544)
        XCTAssertEqual(NativeViewport.availableHeight(bounds: bounds, keyboard: CGRect(x: 0, y: 0, width: 390, height: 300)), 544)
        XCTAssertEqual(NativeViewport.availableHeight(bounds: bounds, keyboard: CGRect(x: 90, y: 400, width: 200, height: 250)), 844)
    }

}

final class BundledWebIntegrationTests: XCTestCase {
    // TEMPORARY Reflect screenshot (revert after).
    @MainActor
    func testTempReflectShot() async throws {
        var web: WKWebView?
        for _ in 0..<100 {
            let controller = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
                .flatMap(\.windows).first(where: \.isKeyWindow)?.rootViewController
            if let found = controller?.view.subviews.compactMap({ $0 as? WKWebView }).first,
               let ready = try? await found.evaluateJavaScript("document.readyState==='complete' && typeof SteadyNavigation==='object'"),
               ready as? Bool == true { web = found; break }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        let view = try XCTUnwrap(web)
        let shots: [(String, String)] = [("reflect", "SteadyNavigation.selectTab('review')"), ("reading", "location.hash='#help/memory'"), ("settings", "SteadyNavigation.selectTab('home');await new Promise(r=>setTimeout(r,400));document.querySelector('.settings-link').click()")]
        for (name, script) in shots {
            _ = try await view.callAsyncJavaScript("\(script);await new Promise(r=>setTimeout(r,1200));'ok'", arguments: [:], in: nil, contentWorld: .page)
            let config = WKSnapshotConfiguration()
            config.rect = view.bounds
            config.afterScreenUpdates = true
            let image = try await view.takeSnapshot(configuration: config)
            let url = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("shot-\(name).png")
            try image.pngData()?.write(to: url)
            add(XCTAttachment(image: image))
        }
    }
    @MainActor
    private func loadedWebView() async throws -> WKWebView {
        func findWebView(in view: UIView) -> WKWebView? {
            if let web = view as? WKWebView { return web }
            for subview in view.subviews {
                if let web = findWebView(in: subview) { return web }
            }
            return nil
        }
        for _ in 0..<100 {
            let rootView = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
                .flatMap(\.windows).first(where: \.isKeyWindow)?.rootViewController?.view
            if let web = rootView.flatMap(findWebView),
               let ready = try? await web.evaluateJavaScript("document.readyState==='complete' && typeof SteadyData==='object' && typeof SteadyNavigation==='object' && !!document.querySelector('.sidebar nav')"),
               ready as? Bool == true { return web }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        throw NSError(domain: "SteadyTests", code: 1, userInfo: [NSLocalizedDescriptionKey:"Bundled Steady interface did not finish loading."])
    }

    @MainActor
    func testNativeTabBarRoutesHomeBurdenAndReflect() async throws {
        let web = try await loadedWebView()
        let navigation = try XCTUnwrap(web.window?.rootViewController as? UINavigationController)
        let tabs = try XCTUnwrap(navigation.viewControllers.first as? SteadyViewController)
        let tabHost = try XCTUnwrap(tabs.children.first { $0 is UIHostingController<SteadyRootView> } as? UIHostingController<SteadyRootView>)
        var ancestor = web.superview
        while let current = ancestor, current !== tabHost.view {
            ancestor = current.superview
        }
        XCTAssertTrue(ancestor === tabHost.view, "The WebView must remain inside the native TabView destination, below its tab bar.")
        XCTAssertEqual(SteadyViewController.SteadyTab.allCases.map(\.title), ["Home", "Ask", "Reflect"])
        XCTAssertEqual(SteadyViewController.SteadyTab.allCases.map(\.symbol), ["house", "bubble.left", "moon.stars"])
        XCTAssertEqual(tabs.selectedTab, .home)
        var tabBarClearance: [String: Double] = [:]
        for _ in 0..<20 {
            tabBarClearance = try await web.evaluateJavaScript("""
            (() => {
              const root=getComputedStyle(document.documentElement);
              const main=document.querySelector('.main-shell main');
              return {
                obstruction:parseFloat(root.getPropertyValue('--steady-tabbar'))||0,
                safeBottom:parseFloat(root.getPropertyValue('--steady-safe-bottom'))||0,
                padding:parseFloat(getComputedStyle(main).paddingBottom)||0
              };
            })()
            """) as? [String: Double] ?? [:]
            if (tabBarClearance["obstruction"] ?? 0) > 0 { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertGreaterThan(tabBarClearance["obstruction"] ?? 0, 0, "The native tab bar frame must be measured for content clearance.")
        XCTAssertEqual(tabBarClearance["padding"] ?? 0, max(tabBarClearance["obstruction"] ?? 0, tabBarClearance["safeBottom"] ?? 0), "Page content and scrolling must use only the measured native safe-area/tab-bar clearance.")

        _ = try await web.callAsyncJavaScript("SteadyNavigation.selectTab('review')", arguments: [:], in: nil, contentWorld: .page)
        for _ in 0..<20 where tabs.selectedTab != .reflect {
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertEqual(tabs.selectedTab, .reflect)

        let destinations: [(SteadyViewController.SteadyTab, String, String)] = [
            (.burden, "help", "#today/feelings"),
            (.reflect, "review", "#review"),
            (.home, "home", "#home")
        ]
        for (tab, route, hash) in destinations {
            tabs.selectNativeTab(tab)
            var currentRoute = ""
            for _ in 0..<20 {
                currentRoute = try await web.evaluateJavaScript("location.hash") as? String ?? ""
                if currentRoute == hash { break }
                try await Task.sleep(nanoseconds: 50_000_000)
            }
            XCTAssertEqual(currentRoute, hash)
            let selectedSection = try await web.evaluateJavaScript("document.body.dataset.section") as? String
            XCTAssertEqual(selectedSection, route)
            XCTAssertEqual(tabs.selectedTab, tab)
            let screenRendered = try await web.evaluateJavaScript("""
            (() => {
              const main = document.querySelector('.main-shell main');
              return !!main && main.getBoundingClientRect().height > 0 && main.innerText.trim().length > 0;
            })()
            """) as? Bool
            XCTAssertEqual(screenRendered, true, "\(tab.title) screen content should render")
            XCTAssertTrue(web.superview != nil, "The shared WebView must remain attached after switching to \(tab.title).")
            if tab == .burden {
                let search = try XCTUnwrap(tabs.view.subviews.compactMap { $0 as? UISearchTextField }.first)
                for _ in 0..<20 where search.isHidden {
                    try await Task.sleep(nanoseconds: 50_000_000)
                }
                XCTAssertFalse(search.isHidden, "Burden's native search field must be visible.")
                XCTAssertEqual(search.traitCollection.userInterfaceStyle, .light, "The native field must match Steady's light page theme.")
                let webComposerHidden = try await web.evaluateJavaScript("getComputedStyle(document.querySelector('.chat-input-area')).display === 'none'") as? Bool
                XCTAssertEqual(webComposerHidden, true, "The web composer must not sit underneath the native field.")
                let tabBar = try XCTUnwrap(tabHost.view.subviews.compactMap { $0 as? UITabBar }.first ?? {
                    var pending = tabHost.view.subviews
                    while let candidate = pending.popLast() {
                        if let bar = candidate as? UITabBar { return bar }
                        pending.append(contentsOf: candidate.subviews)
                    }
                    return nil
                }())
                let fieldFrame = tabs.view.convert(search.bounds, from: search)
                let tabFrame = tabs.view.convert(tabBar.bounds, from: tabBar)
                XCTAssertLessThanOrEqual(fieldFrame.maxY, tabFrame.minY, "The input must clear the native tab bar.")
                search.text = "John 3:16"
                search.sendActions(for: .editingChanged)
                for _ in 0..<20 {
                    let draft = try await web.evaluateJavaScript("window.SteadyBurdenComposer?.getDraft()") as? String
                    if draft == "John 3:16" { break }
                    try await Task.sleep(nanoseconds: 50_000_000)
                }
                let finalDraft = try await web.evaluateJavaScript("window.SteadyBurdenComposer?.getDraft()") as? String
                XCTAssertEqual(finalDraft, "John 3:16")
                _ = search.delegate?.textFieldShouldReturn?(search)
                let sent = try await web.evaluateJavaScript("(state.scriptureRequests || []).some(entry => entry.text === 'John 3:16')") as? Bool
                XCTAssertEqual(sent, true, "Submitting the native field must reach Burden's existing conversation flow.")
                let image = UIGraphicsImageRenderer(size: tabs.view.bounds.size).image { _ in
                    tabs.view.drawHierarchy(in: tabs.view.bounds, afterScreenUpdates: true)
                }
                let attachment = XCTAttachment(image: image)
                attachment.name = "Burden native search field"
                attachment.lifetime = .keepAlways
                add(attachment)
            }
        }

        for (route, headerSelector, contentSelector) in [
            ("help/memory", ".screen-header", ".main-shell main"),
            ("settings", ".settings-heading", ".settings-page")
        ] {
            _ = try await web.evaluateJavaScript("location.hash = '#\(route)'; window.SteadyViewport?.scrollTo({top:0})")
            var currentRoute = ""
            for _ in 0..<20 {
                currentRoute = try await web.evaluateJavaScript("location.hash") as? String ?? ""
                if currentRoute == "#\(route)" { break }
                try await Task.sleep(nanoseconds: 50_000_000)
            }
            XCTAssertEqual(currentRoute, "#\(route)")
            let layout = try await web.evaluateJavaScript("""
            (() => {
              const content=document.querySelector('.app-content');
              const header=document.querySelector('\(headerSelector)');
              const page=document.querySelector('\(contentSelector)');
              return {
                safeInset:parseFloat(getComputedStyle(content).paddingTop)||0,
                headerTop:header.getBoundingClientRect().top,
                clearance:parseFloat(getComputedStyle(page).paddingBottom)||0,
                obstruction:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--steady-tabbar'))||0
              };
            })()
            """) as? [String: Double] ?? [:]
            XCTAssertEqual(layout["headerTop"] ?? -1, layout["safeInset"] ?? -2, "\(route) header must start at the shared safe-area boundary.")
            XCTAssertGreaterThanOrEqual(layout["clearance"] ?? 0, layout["obstruction"] ?? 0, "\(route) content must clear the native tab bar.")
        }

        _ = try await web.evaluateJavaScript("location.hash = '#home'; window.SteadyViewport?.scrollTo({top:0})")
    }

    @MainActor
    func testRealIPhoneKeyboardChatGeometry() async throws {
        let web = try await loadedWebView()
        let rootView = try XCTUnwrap(web.window?.rootViewController?.view)
        let keyboardGuide = rootView.keyboardLayoutGuide
        let previousValue = try await web.callAsyncJavaScript("""
        const input = document.getElementById('feelings-note');
        return {route:location.hash, draft:input?.value ?? '', selectionStart:input?.selectionStart ?? 0,
          selectionEnd:input?.selectionEnd ?? 0, scrollTop:document.querySelector('.chat-scroll')?.scrollTop ?? 0};
        """, arguments: [:], in: nil, contentWorld: .page)
        let previous = try XCTUnwrap(previousValue as? [String: Any])
        func restorePage() async {
            _ = try? await web.callAsyncJavaScript("""
            const input = document.getElementById('feelings-note');
            input?.blur();
            location.hash = route;
            await new Promise(resolve => setTimeout(resolve, 100));
            if (input) { input.value = draft; input.setSelectionRange(selectionStart, selectionEnd); }
            const scroll = document.querySelector('.chat-scroll');
            if (scroll) scroll.scrollTop = scrollTop;
            """, arguments: previous, in: nil, contentWorld: .page)
        }
        func rect(_ value: CGRect) -> [String: CGFloat] {
            ["x":value.minX, "y":value.minY, "width":value.width, "height":value.height]
        }
        func insets(_ value: UIEdgeInsets) -> [String: CGFloat] {
            ["top":value.top, "left":value.left, "bottom":value.bottom, "right":value.right]
        }
        do {
            _ = try await web.callAsyncJavaScript("""
            SteadyNavigation.selectTab('help');
            await new Promise(resolve => setTimeout(resolve, 100));
            """, arguments: [:], in: nil, contentWorld: .page)
            // Keep focus in its own native-initiated call rather than after an async JS wait.
            _ = try await web.callAsyncJavaScript("document.getElementById('feelings-note').focus({preventScroll:true});", arguments: [:], in: nil, contentWorld: .page)
            var keyboardOpened = false
            for _ in 0..<60 {
                rootView.layoutIfNeeded()
                let nativeOpen = try await web.evaluateJavaScript("document.documentElement.dataset.nativeKeyboard === 'true'") as? Bool == true
                let frame = keyboardGuide.layoutFrame.intersection(rootView.bounds)
                if nativeOpen && !frame.isNull && frame.height > 100 && frame.minY < rootView.bounds.maxY - 100 {
                    keyboardOpened = true
                    break
                }
                try await Task.sleep(nanoseconds: 100_000_000)
            }
            try await Task.sleep(nanoseconds: 350_000_000)
            rootView.layoutIfNeeded()
            let keyboardFrame = keyboardGuide.layoutFrame
            let domValue = try await web.callAsyncJavaScript("""
            for (let i=0;i<3;i++) await new Promise(requestAnimationFrame);
            const root=document.documentElement, vv=window.visualViewport;
            const selectors=['html','body','.app-content','.main-shell','main','.feelings-panel',
              '#feelings-form','.chat-viewport','.chat-scroll','.chat-input-area','.chat-composer','.chat-reply-row .donkey-guide'];
            const nodes=selectors.map(selector=>{
              const element=document.querySelector(selector);
              if(!element)return {selector,missing:true};
              const box=element.getBoundingClientRect(), style=getComputedStyle(element);
              return {selector,x:box.x,y:box.y,width:box.width,height:box.height,bottom:box.bottom,
                overflowX:style.overflowX,overflowY:style.overflowY,
                clipPath:style.clipPath,maskImage:style.maskImage,borderRadius:style.borderRadius,
                clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,scrollTop:element.scrollTop};
            });
            return {innerHeight,innerWidth,devicePixelRatio,activeElement:document.activeElement?.id ?? '',
              visualViewport:vv?{width:vv.width,height:vv.height,offsetTop:vv.offsetTop,offsetLeft:vv.offsetLeft,scale:vv.scale}:null,
              nativeKeyboard:root.dataset.nativeKeyboard,nativeAppHeight:root.dataset.nativeAppHeight,
              nativeViewportHeight:root.dataset.nativeViewportHeight,keyboardOpen:root.dataset.keyboardOpen,
              appHeight:root.style.getPropertyValue('--app-height'),keyboardOverlap:root.style.getPropertyValue('--keyboard-overlap'),
              viewport:document.querySelector('meta[name=viewport]')?.content,nodes};
            """, arguments: [:], in: nil, contentWorld: .page)
            let dom = try XCTUnwrap(domValue as? [String: Any])
            var views: [[String: Any]] = []
            var canvasClips: [(path: String, frame: CGRect)] = []
            func inspect(_ current: UIView, path: String, ancestorsVisible: Bool = true) {
                let frame = current.convert(current.bounds, to:web)
                let visible = ancestorsVisible && !current.isHidden && current.alpha > 0.01
                // Inspect canvas-sized clipping containers without relying on WebKit's private class names.
                let clipsCanvas = visible && (current.clipsToBounds || current.layer.masksToBounds)
                    && current.bounds.width >= web.bounds.width - 1 && current.bounds.height >= web.bounds.height - 1
                if clipsCanvas { canvasClips.append((path, frame)) }
                var entry: [String: Any] = ["path":path, "bounds":rect(current.bounds),
                    "frameInWeb":rect(frame), "clipsToBounds":current.clipsToBounds, "clipsFullCanvas":clipsCanvas,
                    "layerMasksToBounds":current.layer.masksToBounds, "hasLayerMask":current.layer.mask != nil,
                    "layerCornerRadius":current.layer.cornerRadius, "hidden":current.isHidden, "alpha":current.alpha]
                if let mask = current.layer.mask { entry["maskBounds"] = rect(mask.bounds); entry["maskFrame"] = rect(mask.frame) }
                if let scroll = current as? UIScrollView {
                    entry["contentInset"] = insets(scroll.contentInset)
                    entry["adjustedContentInset"] = insets(scroll.adjustedContentInset)
                    entry["contentOffset"] = ["x":scroll.contentOffset.x,"y":scroll.contentOffset.y]
                    if #available(iOS 26.0, *) {
                        entry["edgeEffectsHidden"] = ["top":scroll.topEdgeEffect.isHidden,"bottom":scroll.bottomEdgeEffect.isHidden,
                            "left":scroll.leftEdgeEffect.isHidden,"right":scroll.rightEdgeEffect.isHidden]
                    }
                }
                views.append(entry)
                for (index, child) in current.subviews.enumerated() { inspect(child, path:"\(path)/\(index)", ancestorsVisible:visible) }
            }
            inspect(web, path:"web")
            let webFrame = web.convert(web.bounds, to:rootView)
            var diagnostic: [String: Any] = ["softwareKeyboardObserved":keyboardOpened,
                "rootBounds":rect(rootView.bounds),"rootSafeArea":insets(rootView.safeAreaInsets),
                "keyboardLayoutGuide":rect(keyboardFrame),"webFrameInRoot":rect(webFrame),"dom":dom,"webViews":views]
            if #available(iOS 26.0, *) { diagnostic["obscuredContentInsets"] = insets(web.obscuredContentInsets) }
            let data = try JSONSerialization.data(withJSONObject: diagnostic, options:[.prettyPrinted,.sortedKeys])
            let geometryAttachment = XCTAttachment(string:String(decoding:data, as:UTF8.self))
            geometryAttachment.name = "Real keyboard — public native and DOM geometry"
            geometryAttachment.lifetime = .keepAlways
            add(geometryAttachment)
            let configuration = WKSnapshotConfiguration()
            configuration.rect = web.bounds
            configuration.afterScreenUpdates = true
            let snapshot = try await web.takeSnapshot(configuration:configuration)
            let imageAttachment = XCTAttachment(image:snapshot)
            imageAttachment.name = "WKWebView source while keyboard is open — excludes system keyboard"
            imageAttachment.lifetime = .keepAlways
            add(imageAttachment)
            XCTAssertTrue(keyboardOpened, "The real software keyboard did not open within 6 seconds. No simulated keyboard state was used; inspect the attached geometry.")
            if keyboardOpened {
                XCTAssertGreaterThan(webFrame.maxY, keyboardFrame.minY + 1, "The native app web view must continue below the keyboard top.")
                XCTAssertEqual(web.scrollView.contentOffset.y, 0, accuracy:1, "The outer native web scroll view must not pan the full chat canvas upward when the keyboard opens.")
                XCTAssertFalse(canvasClips.isEmpty, "Expected to inspect at least one visible native canvas clipping container.")
                for clip in canvasClips {
                    XCTAssertGreaterThanOrEqual(clip.frame.maxY, web.bounds.maxY - 1,
                        "Native canvas clipping container \(clip.path) ends at \(clip.frame.maxY), cutting off the full chat canvas at \(web.bounds.maxY).")
                }
                let nodes = try XCTUnwrap(dom["nodes"] as? [[String: Any]])
                let scroll = try XCTUnwrap(nodes.first { $0["selector"] as? String == ".chat-scroll" })
                // Fixed chat coordinates already match the native snapshot; subtracting visualViewport.offsetTop double-counts the pan.
                let bottom = try XCTUnwrap(scroll["bottom"] as? Double)
                let bottomInRoot = web.convert(CGPoint(x:0,y:bottom), to:rootView).y
                XCTAssertGreaterThan(bottomInRoot, keyboardFrame.minY + 1, "The actual transcript bounds must extend below the real keyboard top.")
                let composer = try XCTUnwrap(nodes.first { $0["selector"] as? String == ".chat-composer" })
                let composerBottom = try XCTUnwrap(composer["bottom"] as? Double)
                let composerBottomInRoot = web.convert(CGPoint(x:0,y:composerBottom), to:rootView).y
                XCTAssertEqual(composerBottomInRoot, keyboardFrame.minY - 8, accuracy:1, "The floating composer must keep its 8-point gap above the real keyboard.")
            }
            await restorePage()
        } catch {
            await restorePage()
            throw error
        }
    }

    @MainActor
    func testChatTranscriptExtendsPastKeyboardEdgeWhenWebViewportContracts() async throws {
        let web = try await loadedWebView()
        let result = try await web.callAsyncJavaScript("""
        const root = document.documentElement;
        const previousRoute = location.hash;
        SteadyNavigation.selectTab('help');
        await new Promise(resolve => setTimeout(resolve, 100));
        const fullHeight = Number(root.dataset.nativeViewportHeight);
        const keyboardTop = fullHeight - 300;
        const originalHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
        const originalKeyboard = root.dataset.nativeKeyboard;
        const originalAvailable = root.dataset.nativeAppHeight;
        try {
          Object.defineProperty(window, 'innerHeight', {configurable:true, value:keyboardTop});
          root.dataset.nativeKeyboard = 'true';
          root.dataset.nativeAppHeight = String(keyboardTop);
          window.dispatchEvent(new Event('resize'));
          for (let i=0;i<3;i++) await new Promise(requestAnimationFrame);
          const scroll = document.querySelector('.chat-scroll').getBoundingClientRect();
          const composer = document.querySelector('.chat-composer').getBoundingClientRect();
          return {fullHeight, keyboardTop, transcriptBottom:scroll.bottom,
            documentHeight:root.getBoundingClientRect().height, composerBottom:composer.bottom,
            composerLeft:composer.left, viewport:document.querySelector('meta[name=viewport]').content};
        } finally {
          if (originalHeight) Object.defineProperty(window, 'innerHeight', originalHeight);
          else delete window.innerHeight;
          root.dataset.nativeKeyboard = originalKeyboard;
          root.dataset.nativeAppHeight = originalAvailable;
          location.hash = previousRoute;
          window.dispatchEvent(new Event('resize'));
        }
        """, arguments: [:], in: nil, contentWorld: .page) as? [String: Any]
        let geometry = try XCTUnwrap(result)
        let fullHeight = try XCTUnwrap(geometry["fullHeight"] as? Double)
        let keyboardTop = try XCTUnwrap(geometry["keyboardTop"] as? Double)
        XCTAssertGreaterThan(fullHeight, 300)
        XCTAssertEqual(try XCTUnwrap(geometry["documentHeight"] as? Double), fullHeight, accuracy: 1)
        XCTAssertEqual(try XCTUnwrap(geometry["transcriptBottom"] as? Double), fullHeight, accuracy: 1)
        XCTAssertEqual(try XCTUnwrap(geometry["composerBottom"] as? Double), keyboardTop - 8, accuracy: 1)
        XCTAssertGreaterThan(try XCTUnwrap(geometry["composerLeft"] as? Double), 0)
        XCTAssertTrue((geometry["viewport"] as? String)?.contains("interactive-widget=overlays-content") == true)
    }

    @MainActor
    func testBurdenReadingNavigationPreservesDraftAndPlace() async throws {
        #if !targetEnvironment(simulator)
        throw XCTSkip("Sample Scripture entries are confined to the simulator.")
        #else
        let web = try await loadedWebView()
        _ = try await web.evaluateJavaScript("""
        (()=>{
        const root=document.documentElement,input=document.getElementById('feelings-note');
        window.steadyNavigationFixture={state,day,save,route:location.hash,top:SteadyViewport.scrollY,
          draft:input.value,scroll:document.querySelector('.chat-scroll').scrollTop,reading:window.steadyExperience.helpReading,
          appearance:Object.fromEntries(['theme','size','font','spacing','motion'].map(key=>[key,root.dataset[key]??null]))};
        save=()=>true;state={...state,profile:{...state.profile,burdenAI:false},savedPassages:['rest'],days:{},scriptureRequests:Array.from({length:6},(_,index)=>({
          id:'navigation-'+index,key:'rest',guide:'exhaustion',text:'I feel tired and need some rest.',at:new Date(Date.UTC(2026,8,27,10,index)).toISOString()
        })).concat([{id:'navigation-study',key:'foundation',text:'John 3:16',at:'2026-09-27T10:06:00.000Z',study:{kind:'reference',query:'John 3:16'}}])};
        day=state.days[today]=prepareDay({feelingsDraft:'Keep this unfinished thought.'});
        root.dataset.size='standard';root.dataset.font='default';root.dataset.spacing='standard';root.dataset.motion='system';
        renderDay();SteadyNavigation.selectTab('home');
        })();
        """)
        func restore() async {
            _ = try? await web.callAsyncJavaScript("""
            const previous=window.steadyNavigationFixture;if(!previous)return;
            document.getElementById('feelings-note').blur();state=previous.state;day=previous.day;save=previous.save;
            for(const [key,value] of Object.entries(previous.appearance))if(value===null)delete document.documentElement.dataset[key];else document.documentElement.dataset[key]=value;
            window.steadyExperience.helpReading=previous.reading;
            applyTheme(previous.appearance.theme??'light');renderDay();navigateScreen(previous.route.slice(1));
            await new Promise(resolve=>setTimeout(resolve,150));
            window.steadyExperience.helpReading=previous.reading;document.getElementById('feelings-note').value=previous.draft;
            document.querySelector('.chat-scroll').scrollTop=previous.scroll;SteadyViewport.scrollTo({top:previous.top,behavior:'instant'});
            delete window.steadyNavigationFixture;delete window.steadyNavigationSource;
            """, arguments:[:], in:nil, contentWorld:.page)
        }
        do {
            for theme in ["light","dark"] {
                let header = try await web.callAsyncJavaScript("""
                applyTheme(theme);SteadyNavigation.selectTab('home');await new Promise(requestAnimationFrame);
                SteadyNavigation.selectTab('help');await new Promise(resolve=>setTimeout(resolve,180));
                const transcript=document.querySelector('.chat-scroll');
                return {visibleFocus:document.activeElement===transcript,transcriptOutline:getComputedStyle(transcript).outlineStyle,header:document.querySelector('.chat-header'),saved:document.querySelector('.saved-hub-link')};
                """, arguments:["theme":theme], in:nil, contentWorld:.page) as? [String:Any]
                let controls=try XCTUnwrap(header)
                XCTAssertEqual(controls["visibleFocus"] as? Bool,true)
                XCTAssertEqual(controls["transcriptOutline"] as? String,"none","Opening Burden must not draw a frame around the transcript in \(theme).")
                XCTAssertTrue(controls["header"] is NSNull)
                XCTAssertTrue(controls["saved"] is NSNull)
                for id in ["navigation-0","navigation-study"] {
                    let chapter = try await web.callAsyncJavaScript("""
                    const pause=()=>new Promise(resolve=>setTimeout(resolve,100));
                    const row=document.querySelector('[data-request-id="'+id+'"]');
                    for(let attempt=0;attempt<100&&!Array.from(row.querySelectorAll('button')).some(button=>button.textContent==='Read chapter');attempt++)await pause();
                    const source=Array.from(row.querySelectorAll('button')).find(button=>button.textContent==='Read chapter');
                    if(!source)throw new Error('Read chapter did not appear');
                    const scroll=document.querySelector('.chat-scroll');
                    scroll.scrollTop+=source.getBoundingClientRect().top-scroll.getBoundingClientRect().top-80;scroll.dispatchEvent(new Event('scroll'));
                    window.steadyNavigationSource={source,top:scroll.scrollTop,draft:document.getElementById('feelings-note').value};
                    source.click();await new Promise(resolve=>setTimeout(resolve,250));
                    const selected=document.querySelector('#chapter-verses .selected-verse'),box=selected?.getBoundingClientRect();
                    return {route:location.hash,back:document.querySelector('.screen-back').getAttribute('href'),title:document.querySelector('#chapter-title').textContent,
                      focus:document.activeElement===selected,verseTop:box?.top,verseBottom:box?.bottom,headerBottom:document.querySelector('.sidebar').getBoundingClientRect().bottom,height:innerHeight};
                    """, arguments:["id":id], in:nil, contentWorld:.page) as? [String:Any]
                    let reading=try XCTUnwrap(chapter)
                    XCTAssertEqual(reading["route"] as? String,"#learn/chapter")
                    XCTAssertEqual(reading["back"] as? String,"#today/feelings")
                    XCTAssertTrue((reading["title"] as? String)?.hasPrefix(id=="navigation-study" ? "John 3" : "Matthew 11") == true)
                    XCTAssertEqual(reading["focus"] as? Bool,true)
                    XCTAssertGreaterThanOrEqual(try XCTUnwrap(reading["verseTop"] as? Double),try XCTUnwrap(reading["headerBottom"] as? Double))
                    XCTAssertLessThan(try XCTUnwrap(reading["verseBottom"] as? Double),try XCTUnwrap(reading["height"] as? Double))
                    if theme=="dark" && id=="navigation-study" {
                        let attachment=XCTAttachment(image:try await web.takeSnapshot(configuration:nil));attachment.name="Burden requested passage";attachment.lifetime = .keepAlways;add(attachment)
                    }
                    let back = try await web.callAsyncJavaScript("""
                    document.querySelector('.screen-back').click();await new Promise(resolve=>setTimeout(resolve,180));
                    const previous=window.steadyNavigationSource;
                    return {route:location.hash,focused:document.activeElement===previous.source,scrollDelta:Math.abs(document.querySelector('.chat-scroll').scrollTop-previous.top),draft:document.getElementById('feelings-note').value,expectedDraft:previous.draft,keyboard:document.documentElement.dataset.nativeKeyboard==='true'};
                    """, arguments:[:], in:nil, contentWorld:.page) as? [String:Any]
                    let returned=try XCTUnwrap(back)
                    XCTAssertEqual(returned["route"] as? String,"#today/feelings")
                    XCTAssertEqual(returned["focused"] as? Bool,true)
                    XCTAssertLessThan(try XCTUnwrap(returned["scrollDelta"] as? Double),1)
                    XCTAssertEqual(returned["draft"] as? String,returned["expectedDraft"] as? String)
                    XCTAssertEqual(returned["keyboard"] as? Bool,false)
                }
                let saved = try await web.callAsyncJavaScript("""
                document.querySelector('.settings-link').click();await new Promise(resolve=>setTimeout(resolve,150));
                document.querySelector('#privacy-preferences a[href="#help/memory"]').click();await new Promise(resolve=>setTimeout(resolve,150));
                const back=document.querySelector('.screen-back').getAttribute('href'),section=document.body.dataset.section;
                const passage=document.querySelector('.saved-passage-card');passage.click();await new Promise(resolve=>setTimeout(resolve,150));
                document.querySelector('.screen-back').click();await new Promise(resolve=>setTimeout(resolve,150));
                const rebuiltFocus=document.activeElement===document.querySelector('.saved-passage-card')&&document.activeElement!==passage;
                document.querySelector('.screen-back').click();await new Promise(resolve=>setTimeout(resolve,150));
                document.querySelector('.settings-back').click();await new Promise(resolve=>setTimeout(resolve,150));
                return {back,section,rebuiltFocus,route:location.hash,focus:document.activeElement===document.querySelector('.chat-scroll'),draft:document.getElementById('feelings-note').value};
                """, arguments:[:], in:nil, contentWorld:.page) as? [String:Any]
                XCTAssertEqual(saved?["back"] as? String,"#settings")
                XCTAssertEqual(saved?["section"] as? String,"home")
                XCTAssertEqual(saved?["route"] as? String,"#today/feelings")
                XCTAssertEqual(saved?["focus"] as? Bool,true)
                XCTAssertEqual(saved?["rebuiltFocus"] as? Bool,true)
                XCTAssertEqual(saved?["draft"] as? String,"Keep this unfinished thought.")
                let focus = try await web.callAsyncJavaScript("""
                const row=document.querySelector('[data-request-id="navigation-'+(theme==='light'?'4':'5')+'"]');
                Array.from(row.querySelectorAll('button')).find(button=>button.textContent==='Forget').click();
                await new Promise(resolve=>setTimeout(resolve,100));
                const transcript=document.querySelector('.chat-scroll');
                return {focused:document.activeElement===transcript,transcriptOutline:getComputedStyle(transcript).outlineStyle,forgotten:!row.isConnected};
                """, arguments:["theme":theme], in:nil, contentWorld:.page) as? [String:Any]
                XCTAssertEqual(focus?["focused"] as? Bool,true)
                XCTAssertEqual(focus?["forgotten"] as? Bool,true)
                XCTAssertEqual(focus?["transcriptOutline"] as? String,"none","Forgetting an entry must not draw a frame around the transcript in \(theme).")
                let attachment=XCTAttachment(image:try await web.takeSnapshot(configuration:nil));attachment.name="Burden floating navigation \(theme)";attachment.lifetime = .keepAlways;add(attachment)
            }
            let wording = try await web.callAsyncJavaScript("""
            const status=await SteadyNative.localAIStatus(),quote=document.querySelector('[data-request-id="navigation-study"] .study-quote').textContent,reference=document.querySelector('[data-request-id="navigation-study"] .verse-reference').textContent;
            state.profile={...state.profile,burdenAI:true};document.dispatchEvent(new CustomEvent('steady:wording-setting'));
            let row=document.querySelector('[data-request-id="navigation-study"]');
            if(status.available)for(let attempt=0;attempt<95&&!row.querySelector('.local-ai-label');attempt++)await new Promise(resolve=>setTimeout(resolve,100));
            const prose=row.querySelector('.moment-context'),label=row.querySelector('.local-ai-label');
            return {available:status.available,label:label?.textContent,wording:prose?.textContent,quoteUnchanged:quote===row.querySelector('.study-quote').textContent,referenceUnchanged:reference===row.querySelector('.verse-reference').textContent,entriesUnchanged:state.scriptureRequests.every(entry=>!Object.hasOwn(entry,'reply')&&!Object.hasOwn(entry,'generatedText'))};
            """, arguments:[:], in:nil, contentWorld:.page) as? [String:Any]
            XCTAssertEqual(wording?["quoteUnchanged"] as? Bool,true)
            XCTAssertEqual(wording?["referenceUnchanged"] as? Bool,true)
            XCTAssertEqual(wording?["entriesUnchanged"] as? Bool,true)
            if wording?["available"] as? Bool == true {
                XCTAssertEqual(wording?["label"] as? String,"Worded with on-device AI")
                XCTAssertFalse((wording?["wording"] as? String ?? "").isEmpty)
                let attachment=XCTAttachment(image:try await web.takeSnapshot(configuration:nil));attachment.name="Burden on-device wording with original Scripture";attachment.lifetime = .keepAlways;add(attachment)
            }
            await restore()
        } catch {await restore();throw error}
        #endif
    }

    @MainActor
    func testBurdenMemoryKeepsDetailsOnDeviceWithReviewAndForgetControls() async throws {
        #if !targetEnvironment(simulator)
        throw XCTSkip("Sample chat entries are confined to the simulator.")
        #else
        let web = try await loadedWebView()
        _ = try await web.evaluateJavaScript("""
        (()=>{
          window.steadyMemoryFixture={state,day,save,route:location.hash,top:SteadyViewport.scrollY,theme:document.documentElement.dataset.theme};
          save=()=>true;state={...state,profile:{...state.profile,burdenAI:false,burdenMemoryEnabled:true},burdenMemory:{version:1,notes:[],processed:[]},scriptureRequests:[],savedPassages:['rest'],days:{}};
          day=state.days[today]=prepareDay({});renderDay();SteadyNavigation.selectTab('help');
        })();
        """)
        func restore() async {
            _ = try? await web.callAsyncJavaScript("""
            const previous=window.steadyMemoryFixture;if(!previous)return;
            state=previous.state;day=previous.day;save=previous.save;applyTheme(previous.theme);
            document.dispatchEvent(new CustomEvent('steady:memory-changed'));renderDay();navigateScreen(previous.route.slice(1));
            await new Promise(resolve=>setTimeout(resolve,150));SteadyViewport.scrollTo({top:previous.top,behavior:'instant'});delete window.steadyMemoryFixture;
            """, arguments:[:], in:nil, contentWorld:.page)
        }
        do {
            let collected = try await web.callAsyncJavaScript("""
            await new Promise(resolve=>setTimeout(resolve,150));
            const status=await SteadyNative.localAIStatus(),text='I feel worn out. I work night shifts. I prefer brief replies.';
            document.getElementById('feelings-note').value=text;
            document.getElementById('feelings-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
            const id=state.scriptureRequests[0].id;
            if(status.available)for(let attempt=0;attempt<120&&!state.burdenMemory.processed.includes(id);attempt++)await new Promise(resolve=>setTimeout(resolve,100));
            if(!status.available)state.burdenMemory=SteadyBurdenMemory.remember(state.burdenMemory,['I work night shifts.','I prefer brief replies.'],{sourceId:id,sourceText:text,at:state.scriptureRequests[0].at});
            return {available:status.available,count:state.burdenMemory.notes.length,verbatim:state.burdenMemory.notes.every(note=>text.includes(note.text)),processed:state.burdenMemory.processed.includes(id),chatCount:state.scriptureRequests.length};
            """, arguments:[:], in:nil, contentWorld:.page) as? [String:Any]
            XCTAssertGreaterThan(try XCTUnwrap(collected?["count"] as? Int),0,"Useful details should be remembered from the new chat when the local model is available.")
            XCTAssertEqual(collected?["verbatim"] as? Bool,true)
            XCTAssertEqual(collected?["processed"] as? Bool,true)
            XCTAssertEqual(collected?["chatCount"] as? Int,1)
            for theme in ["light","dark"] {
                let page = try await web.callAsyncJavaScript("""
                applyTheme(theme);navigateScreen('settings');await new Promise(resolve=>setTimeout(resolve,150));document.querySelector('#privacy-preferences a[href="#help/memory"]').click();await new Promise(resolve=>setTimeout(resolve,150));
                const toggle=document.getElementById('burden-memory-enabled'),first=document.querySelector('.memory-forget'),t=toggle.getBoundingClientRect(),f=first.getBoundingClientRect();
                return {route:location.hash,title:document.getElementById('screen-title').textContent,checked:toggle.checked,notes:document.querySelectorAll('.memory-note').length,kept:document.querySelectorAll('.saved-passage-card').length,storage:document.getElementById('burden-memory-storage').textContent,toggleVisible:t.width>0&&t.height>0,forgetTarget:f.height};
                """, arguments:["theme":theme], in:nil, contentWorld:.page) as? [String:Any]
                XCTAssertEqual(page?["route"] as? String,"#help/memory")
                XCTAssertEqual(page?["title"] as? String,"Memory")
                XCTAssertEqual(page?["checked"] as? Bool,true)
                XCTAssertEqual(page?["notes"] as? Int,collected?["count"] as? Int)
                XCTAssertEqual(page?["kept"] as? Int,1)
                XCTAssertTrue((page?["storage"] as? String)?.contains("bytes") == true)
                XCTAssertEqual(page?["toggleVisible"] as? Bool,true)
                XCTAssertGreaterThanOrEqual(try XCTUnwrap(page?["forgetTarget"] as? Double),44)
                let attachment=XCTAttachment(image:try await web.takeSnapshot(configuration:nil));attachment.name="Burden on-device memory \(theme)";attachment.lifetime = .keepAlways;add(attachment)
                _ = try await web.callAsyncJavaScript("document.querySelector('.screen-back').click();await new Promise(resolve=>setTimeout(resolve,150));",arguments:[:],in:nil,contentWorld:.page)
            }
            let forgotten = try await web.callAsyncJavaScript("""
            navigateScreen('settings');await new Promise(resolve=>setTimeout(resolve,150));document.querySelector('#privacy-preferences a[href="#help/memory"]').click();await new Promise(resolve=>setTimeout(resolve,150));
            const toggle=document.getElementById('burden-memory-enabled');toggle.checked=false;toggle.dispatchEvent(new Event('change',{bubbles:true}));
            const disabled=SteadyBurdenMemoryStore.context('night shifts').length===0,before=state.burdenMemory.notes.length;
            document.querySelector('.memory-forget').click();const oneForgotten=state.burdenMemory.notes.length===before-1;
            if(state.burdenMemory.notes.length){document.getElementById('burden-memory-clear').click();document.getElementById('burden-memory-confirm-forget').click();}
            return {disabled,oneForgotten,notes:state.burdenMemory.notes.length,chatCount:state.scriptureRequests.length,kept:state.savedPassages.length,processed:state.burdenMemory.processed.length,status:document.getElementById('burden-memory-status').textContent};
            """,arguments:[:],in:nil,contentWorld:.page) as? [String:Any]
            XCTAssertEqual(forgotten?["disabled"] as? Bool,true)
            XCTAssertEqual(forgotten?["oneForgotten"] as? Bool,true)
            XCTAssertEqual(forgotten?["notes"] as? Int,0)
            XCTAssertEqual(forgotten?["chatCount"] as? Int,1)
            XCTAssertEqual(forgotten?["kept"] as? Int,1)
            XCTAssertEqual(forgotten?["processed"] as? Int,1)
            await restore()
        } catch {await restore();throw error}
        #endif
    }

    @MainActor
    func testLocalMemoryBridgeExtractsOnlyVerbatimUserDetails() async throws {
        let web = try await loadedWebView()
        for _ in 0..<50 {
            if UIApplication.shared.applicationState == .active { break }
            try await Task.sleep(nanoseconds:100_000_000)
        }
        let result = try await web.callAsyncJavaScript("""
        const previous=location.hash,previousProfile=state.profile;
        try {
          state.profile={...state.profile,burdenAI:false};document.dispatchEvent(new CustomEvent('steady:wording-setting'));
          await SteadyBurdenWording.whenIdle();SteadyNavigation.selectTab('help');await new Promise(resolve=>setTimeout(resolve,200));
          const status=await SteadyNative.localAIStatus(),text='I work night shifts. I prefer brief replies.';
          const result=await SteadyBurdenMemoryStore.runWording(()=>SteadyNative.extractMemory({requestId:'native-memory-smoke',text}));
          return {status,result,text};
        } finally {state.profile=previousProfile;navigateScreen(previous.slice(1));document.dispatchEvent(new CustomEvent('steady:wording-setting'));}
        """,arguments:[:],in:nil,contentWorld:.page) as? [String:Any]
        let response=try XCTUnwrap(result),status=try XCTUnwrap(response["status"] as? [String:Any]),memory=try XCTUnwrap(response["result"] as? [String:Any])
        let attachment=XCTAttachment(data:try JSONSerialization.data(withJSONObject:response,options:[.prettyPrinted,.sortedKeys]),uniformTypeIdentifier:"public.json")
        attachment.name="On-device memory extraction";attachment.lifetime = .keepAlways;add(attachment)
        let notes=try XCTUnwrap(memory["notes"] as? [String]),text=try XCTUnwrap(response["text"] as? String)
        XCTAssertLessThanOrEqual(notes.count,2)
        XCTAssertTrue(notes.allSatisfy { !$0.isEmpty && $0.utf16.count <= 180 && text.contains($0) })
        if status["available"] as? Bool == true {XCTAssertEqual(memory["available"] as? Bool,true);XCTAssertFalse(notes.isEmpty)}
        else {XCTAssertEqual(memory["available"] as? Bool,false);XCTAssertTrue(notes.isEmpty)}
    }

    @MainActor
    func testLocalAIWordingBridgeUsesLibraryProse() async throws {
        let web = try await loadedWebView()
        let result = try await web.callAsyncJavaScript("""
        const previousRoute=location.hash,previousProfile=state.profile;
        try {
          state.profile={...state.profile,burdenAI:false};
          SteadyNavigation.selectTab('help');await new Promise(resolve=>setTimeout(resolve,150));
          const status=await SteadyNative.localAIStatus();
          const sourceText=SteadyScriptureHelp.guides.exhaustion.acknowledgement+' '+SteadyScriptureHelp.guides.exhaustion.context;
          const result=await SteadyNative.organiseReply({requestId:'native-wording-smoke',text:'Explain the prepared note about rest briefly.',sourceText});
          return {status,result,sourceText};
        } finally {state.profile=previousProfile;navigateScreen(previousRoute.slice(1));document.dispatchEvent(new CustomEvent('steady:wording-setting'));}
        """, arguments:[:], in:nil, contentWorld:.page) as? [String:Any]
        let response=try XCTUnwrap(result),status=try XCTUnwrap(response["status"] as? [String:Any]),wording=try XCTUnwrap(response["result"] as? [String:Any])
        let attachment=XCTAttachment(data:try JSONSerialization.data(withJSONObject:response,options:[.prettyPrinted,.sortedKeys]),uniformTypeIdentifier:"public.json")
        attachment.name="On-device AI availability and wording";attachment.lifetime = .keepAlways;add(attachment)
        XCTAssertNotNil(status["available"] as? Bool)
        if status["available"] as? Bool == true {
            XCTAssertEqual(wording["available"] as? Bool,true,"An available model should organise this short library note.")
            if let text=wording["text"] as? String {
                XCTAssertFalse(text.isEmpty)
                XCTAssertLessThanOrEqual(text.utf16.count,700)
                XCTAssertLessThanOrEqual(text.split(whereSeparator: \.isWhitespace).count,100)
            }
        } else {XCTAssertEqual(wording["available"] as? Bool,false)}
    }

    @MainActor
    func testSettingsHeaderRemainsVisibleWithMotionAndScrolling() async throws {
        #if !targetEnvironment(simulator)
        throw XCTSkip("Appearance samples are confined to the simulator.")
        #else
        let web = try await loadedWebView()
        let previous = try await web.evaluateJavaScript("""
        ({route:location.hash,top:SteadyViewport.scrollY,status:document.querySelector('#settings-status').textContent,appearance:Object.fromEntries(['theme','size','font','motion'].map(key=>[key,document.documentElement.dataset[key]??null]))})
        """) as? [String:Any]
        func restore() async {
            guard let previous else { return }
            _ = try? await web.callAsyncJavaScript("""
            for(const [key,value] of Object.entries(appearance))if(value===null)delete document.documentElement.dataset[key];else document.documentElement.dataset[key]=value;
            applyTheme(appearance.theme??'light');document.querySelector('#settings-status').textContent=status;
            navigateScreen(route.slice(1));await new Promise(resolve=>setTimeout(resolve,250));SteadyViewport.scrollTo({top,behavior:'instant'});
            """, arguments:previous, in:nil, contentWorld:.page)
        }
        do {
            var standardOrigin: (title: Double, card: Double)?
            for (theme,motion,top,size) in [("light","system",0,"standard"),("dark","system",0,"standard"),("dark","system",180,"standard"),("light","off",0,"standard"),("dark","off",0,"standard"),("dark","system",0,"large"),("dark","system",180,"large")] {
                let result = try await web.callAsyncJavaScript("""
                const root=document.documentElement;
                root.dataset.motion=motion;root.dataset.size=size;root.dataset.font='default';
                navigateScreen('home');await new Promise(requestAnimationFrame);
                navigateScreen('settings');
                const themeSelector=document.querySelector('#setting-theme'),setItem=Storage.prototype.setItem;
                try {
                  Storage.prototype.setItem=function(key,value){if(this===localStorage&&String(key)==='steady.theme')return;return setItem.call(this,key,value);};
                  themeSelector.value=theme;themeSelector.dispatchEvent(new Event('change',{bubbles:true}));
                } finally {Storage.prototype.setItem=setItem;}
                await new Promise(resolve=>setTimeout(resolve,250));
                SteadyViewport.scrollTo({top,behavior:'instant'});for(let frame=0;frame<2;frame++)await new Promise(requestAnimationFrame);
                const back=document.querySelector('.settings-back'),themeControl=document.querySelector('.theme-toggle');
                const b=back.getBoundingClientRect(),t=themeControl.getBoundingClientRect(),title=document.querySelector('#settings-title').getBoundingClientRect();
                const target=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2),themeTarget=document.elementFromPoint(t.x+t.width/2,t.y+t.height/2);
                const expectedTop=(parseFloat(getComputedStyle(root).getPropertyValue('--steady-safe-top'))||0)+8;
                return {backTop:b.top,backBottom:b.bottom,backRight:b.right,themeTop:t.top,themeLeft:t.left,themeRight:t.right,titleTop:title.top,cardTop:document.querySelector('.settings-card').getBoundingClientRect().top,width:innerWidth,expectedTop,backVisible:target===back||back.contains(target),themeVisible:themeTarget===themeControl||themeControl.contains(themeTarget)};
                """, arguments:["theme":theme,"motion":motion,"top":top,"size":size], in:nil, contentWorld:.page) as? [String:Any]
                let geometry=try XCTUnwrap(result)
                let context="\(theme), motion \(motion), scroll \(top), size \(size)"
                XCTAssertEqual(try XCTUnwrap(geometry["backTop"] as? Double),try XCTUnwrap(geometry["themeTop"] as? Double),accuracy:1,context)
                XCTAssertEqual(try XCTUnwrap(geometry["backTop"] as? Double),try XCTUnwrap(geometry["expectedTop"] as? Double),accuracy:1,context)
                XCTAssertLessThan(try XCTUnwrap(geometry["backRight"] as? Double),try XCTUnwrap(geometry["themeLeft"] as? Double),context)
                XCTAssertGreaterThan(try XCTUnwrap(geometry["themeRight"] as? Double),try XCTUnwrap(geometry["width"] as? Double)-30,context)
                XCTAssertEqual(geometry["backVisible"] as? Bool,true,"Back must remain tappable: \(context)")
                XCTAssertEqual(geometry["themeVisible"] as? Bool,true,"Theme must remain tappable: \(context)")
                if top==0 {XCTAssertLessThan(try XCTUnwrap(geometry["backBottom"] as? Double),try XCTUnwrap(geometry["titleTop"] as? Double),"Back must stay above Settings content: \(context)")}
                if top==0 && size=="standard" {
                    let title=try XCTUnwrap(geometry["titleTop"] as? Double),card=try XCTUnwrap(geometry["cardTop"] as? Double)
                    if let origin=standardOrigin {
                        XCTAssertEqual(title,origin.title,accuracy:1,"Changing theme must not shift the title: \(context)")
                        XCTAssertEqual(card,origin.card,accuracy:1,"Changing theme must not shift the content: \(context)")
                    } else {standardOrigin=(title,card)}
                }
                let attachment=XCTAttachment(image:try await web.takeSnapshot(configuration:nil))
                attachment.name="Settings header \(theme) \(motion) scroll \(top) size \(size)";attachment.lifetime = .keepAlways;add(attachment)
            }
            await restore()
        } catch {await restore();throw error}
        #endif
    }

    @MainActor
    func testMainScreensFitAcrossAppearanceSettings() async throws {
        #if !targetEnvironment(simulator)
        throw XCTSkip("Layout samples are confined to the simulator.")
        #else
        let web = try await loadedWebView()
        _ = try await web.evaluateJavaScript("""
        const root=document.documentElement;
        window.steadyUIFixture={state,day,removedTask,save,route:location.hash,appearance:Object.fromEntries(['theme','size','font','spacing','motion'].map(key=>[key,root.dataset[key]??null]))};
        save=()=>true;
        state={...state,days:{}};
        day=state.days[today]=prepareDay({need:'calm',context:{time:'5',energy:'low'},tasks:[{id:'layout-step',text:'Take a short walk',complete:false}]});
        root.dataset.font='default';root.dataset.spacing='standard';root.dataset.motion='off';
        renderDay();
        """)
        func restore() async {
            _ = try? await web.callAsyncJavaScript("""
            const previous=window.steadyUIFixture;if(!previous)return;
            state=previous.state;day=previous.day;removedTask=previous.removedTask;save=previous.save;
            for(const [key,value] of Object.entries(previous.appearance))if(value===null)delete document.documentElement.dataset[key];else document.documentElement.dataset[key]=value;
            location.hash=previous.route;renderDay();renderScreen();delete window.steadyUIFixture;
            """, arguments:[:], in:nil, contentWorld:.page)
        }
        do {
            let screens=["home","today/check-in","today/step","review","settings"]
            for theme in ["light","dark"] {
                for route in screens {
                    let result = try await web.callAsyncJavaScript("""
                    document.documentElement.dataset.theme=theme;document.documentElement.dataset.size='standard';
                    navigateScreen(route);await new Promise(resolve=>setTimeout(resolve,100));
                    for(let frame=0;frame<2;frame++)await new Promise(requestAnimationFrame);
                    const content=document.querySelector('.app-content');
                    const offenders=[...content.querySelectorAll('*')].filter(node=>{const box=node.getBoundingClientRect();return box.width>0&&(box.right>content.clientWidth+1||box.left<-1);}).map(node=>{const box=node.getBoundingClientRect();return {tag:node.tagName,id:node.id,class:node.className,left:box.left,right:box.right,width:box.width};}).slice(0,12);
                    return {width:content.clientWidth,scrollWidth:content.scrollWidth,offenders};
                    """, arguments:["theme":theme,"route":route], in:nil, contentWorld:.page) as? [String:Any]
                    let dimensions=try XCTUnwrap(result)
                    if (dimensions["scrollWidth"] as? Double ?? 0) > (dimensions["width"] as? Double ?? 0)+1 {
                        let diagnostic=XCTAttachment(data:try JSONSerialization.data(withJSONObject:dimensions,options:[.prettyPrinted,.sortedKeys]),uniformTypeIdentifier:"public.json")
                        diagnostic.name="Layout overflow \(theme) \(route)";diagnostic.lifetime = .keepAlways;add(diagnostic)
                    }
                    XCTAssertLessThanOrEqual(try XCTUnwrap(dimensions["scrollWidth"] as? Double), try XCTUnwrap(dimensions["width"] as? Double)+1, "\(theme) \(route) overflows horizontally")
                    let attachment=XCTAttachment(image:try await web.takeSnapshot(configuration:nil))
                    attachment.name="Steady \(theme) \(route.replacingOccurrences(of:"/",with:"-"))"
                    attachment.lifetime = .keepAlways
                    add(attachment)
                }
            }
            for route in ["today/check-in","review","settings"] {
                let result = try await web.callAsyncJavaScript("""
                document.documentElement.dataset.theme='light';document.documentElement.dataset.size='large';document.documentElement.dataset.font='dyslexic';
                navigateScreen(route);await new Promise(resolve=>setTimeout(resolve,100));
                for(let frame=0;frame<2;frame++)await new Promise(requestAnimationFrame);
                const content=document.querySelector('.app-content');
                return {width:content.clientWidth,scrollWidth:content.scrollWidth};
                """, arguments:["route":route], in:nil, contentWorld:.page) as? [String:Any]
                let dimensions=try XCTUnwrap(result)
                XCTAssertLessThanOrEqual(try XCTUnwrap(dimensions["scrollWidth"] as? Double), try XCTUnwrap(dimensions["width"] as? Double)+1, "Larger text \(route) overflows horizontally")
                let attachment=XCTAttachment(image:try await web.takeSnapshot(configuration:nil))
                attachment.name="Steady larger text \(route.replacingOccurrences(of:"/",with:"-"))"
                attachment.lifetime = .keepAlways
                add(attachment)
            }
            await restore()
        } catch {await restore();throw error}
        #endif
    }

    @MainActor
    func testBurdenMotionRespectsPreferencesAndLeavesBadgeStill() async throws {
        let web = try await loadedWebView()
        let result = try await web.callAsyncJavaScript("""
        const root=document.documentElement, previousRoute=location.hash, previousMotion=root.dataset.motion;
        const badge=document.querySelector('.chat-welcome .donkey-guide'), image=badge.querySelector('img');
        const previousExpression=badge.getAttribute('data-expression');
        const frame=()=>new Promise(requestAnimationFrame);
        try {
          root.dataset.motion='system';
          SteadyNavigation.selectTab('help');
          await new Promise(resolve=>setTimeout(resolve,100));
          badge.setAttribute('data-expression','neutral');
          await frame(); await frame();
          if(matchMedia('(prefers-reduced-motion: reduce)').matches)return {reduced:true};
          const idle=image.getAnimations().find(animation=>animation.animationName==='burden-idle');
          if(!idle)return {missingIdle:true};
          idle.pause(); idle.currentTime=0; await frame();
          const firstTransform=getComputedStyle(image).transform;
          const before=badge.getBoundingClientRect();
          idle.currentTime=1500; await frame(); await frame();
          const movedTransform=getComputedStyle(image).transform;
          const after=badge.getBoundingClientRect();
          const badgeTransform=getComputedStyle(badge).transform;
          badge.setAttribute('data-expression','listening'); await frame();
          const listening=getComputedStyle(image).animationName;
          badge.setAttribute('data-expression','thinking'); await frame();
          const thinking=getComputedStyle(image).animationName;
          root.dataset.motion='off'; await frame();
          return {firstTransform,movedTransform,badgeTransform,badgeStill:before.x===after.x&&before.y===after.y&&before.width===after.width&&before.height===after.height,
            listening,thinking,offAnimation:getComputedStyle(image).animationName,offTransform:getComputedStyle(image).transform};
        } finally {
          badge.setAttribute('data-expression',previousExpression);
          if(previousMotion===undefined)delete root.dataset.motion;else root.dataset.motion=previousMotion;
          location.hash=previousRoute;
        }
        """, arguments:[:], in:nil, contentWorld:.page) as? [String:Any]
        let motion = try XCTUnwrap(result)
        if motion["reduced"] as? Bool == true { throw XCTSkip("Device Reduce Motion correctly disables the animation.") }
        XCTAssertNotEqual(motion["missingIdle"] as? Bool, true)
        XCTAssertNotEqual(motion["firstTransform"] as? String, motion["movedTransform"] as? String)
        XCTAssertEqual(motion["badgeStill"] as? Bool, true)
        XCTAssertEqual(motion["badgeTransform"] as? String, "none")
        XCTAssertEqual(motion["listening"] as? String, "burden-listening")
        XCTAssertEqual(motion["thinking"] as? String, "burden-thinking")
        XCTAssertEqual(motion["offAnimation"] as? String, "none")
        XCTAssertEqual(motion["offTransform"] as? String, "none")
    }

    @MainActor
    func testEverydayActionsAndRecordsInBundledInterface() async throws {
        #if !targetEnvironment(simulator)
        throw XCTSkip("This flow uses temporary sample entries only in the simulator.")
        #else
        let web = try await loadedWebView()
        _ = try await web.evaluateJavaScript("""
        window.steadyFlowFixture = {state, day, removedTask, save, route:location.hash};
        save = () => true;
        state = {...state, days:{}};
        day = state.days[today] = prepareDay({tasks:[{id:'sample-first',text:'Take a short walk',complete:false},{id:'sample-last',text:'Read a page',complete:true}]});
        renderDay();
        """)
        func restore() async {
            _ = try? await web.callAsyncJavaScript("""
            const previous = window.steadyFlowFixture;
            if (!previous) return;
            state=previous.state; day=previous.day; removedTask=previous.removedTask; save=previous.save;
            location.hash=previous.route; renderDay(); renderScreen();
            delete window.steadyFlowFixture;
            """, arguments:[:], in:nil, contentWorld:.page)
        }
        do {
            let result = try await web.callAsyncJavaScript("""
            const go = async route => {navigateScreen(route); await new Promise(resolve=>setTimeout(resolve,100));};
            await go('direction');
            document.querySelector('#tasks .delete-task').click();
            const deletionFocus = document.activeElement.id;
            const undo = document.getElementById('undo-task-removal');
            const undoHeight = undo.getBoundingClientRect().height;
            undo.click();
            const restored = day.tasks.map(task=>({id:task.id,complete:task.complete}));
            const restoredFocus = document.activeElement.id;
            state.days = {[today]:prepareDay({})}; day=state.days[today]; renderDay();
            await go('review');
            await go('review/progress');
            const emptyAction = document.querySelector('#progress-days a')?.getAttribute('href');
            state.days = {[today]:day};
            for(let index=1;index<=10;index++) {
              const date = new Date(today+'T12:00:00'); date.setDate(date.getDate()-index);
              const key = date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
              state.days[key]=prepareDay({tasks:[{id:'sample-'+index,text:'A step to revisit',complete:false}]});
            }
            await go('review/progress');
            const earlier = document.getElementById('more-history'); earlier.focus(); earlier.click();
            const rows = [...document.querySelectorAll('#progress-days .history-entry')];
            const paginationFocus = document.activeElement === rows[7];
            const fullDateLabel = rows[7].getAttribute('aria-label');
            const fullDateYear = rows[7].hash.split('/').pop().slice(0,4);
            const count = rows.length;
            const paginationHidden = earlier.hidden;
            rows[0].click(); await new Promise(resolve=>setTimeout(resolve,100));
            const pendingText = document.querySelector('.day-record').textContent;
            const planned = [...document.querySelectorAll('.day-record .record-section')].find(section=>section.querySelector('h2')?.textContent==='Planned actions');
            const pendingVisible = !!planned && !planned.closest('details') && planned.getBoundingClientRect().height>0;
            const dayTitle = document.getElementById('screen-title').textContent;
            const details = document.querySelector('.day-record .record-details');
            if(details) details.open=true;
            document.getElementById('toast').classList.remove('show');
            for(let index=0;index<2;index++) await new Promise(requestAnimationFrame);
            return {deletionFocus,undoHeight,restored,restoredFocus,emptyAction,paginationFocus,fullDateLabel,fullDateYear,count,paginationHidden,pendingText,pendingVisible,dayTitle};
            """, arguments:[:], in:nil, contentWorld:.page) as? [String:Any]
            let flow = try XCTUnwrap(result)
            XCTAssertEqual(flow["deletionFocus"] as? String, "task-sample-last")
            XCTAssertGreaterThanOrEqual(try XCTUnwrap(flow["undoHeight"] as? Double), 44)
            XCTAssertEqual(flow["restoredFocus"] as? String, "task-sample-first")
            let restored = try XCTUnwrap(flow["restored"] as? [[String:Any]])
            XCTAssertEqual(restored.count, 2)
            XCTAssertEqual(restored[1]["complete"] as? Bool, true)
            XCTAssertEqual(flow["emptyAction"] as? String, "#review")
            XCTAssertEqual(flow["count"] as? Int, 10)
            XCTAssertEqual(flow["paginationFocus"] as? Bool, true)
            XCTAssertEqual(flow["paginationHidden"] as? Bool, true)
            XCTAssertTrue((flow["fullDateLabel"] as? String)?.contains(try XCTUnwrap(flow["fullDateYear"] as? String)) == true)
            XCTAssertTrue((flow["pendingText"] as? String)?.contains("A step to revisit") == true)
            XCTAssertEqual(flow["pendingVisible"] as? Bool, true)
            XCTAssertEqual(flow["dayTitle"] as? String, "Your day")
            let image = try await web.takeSnapshot(configuration:nil)
            let attachment = XCTAttachment(image:image)
            attachment.name = "Steady unfinished step in past record"
            attachment.lifetime = .keepAlways
            add(attachment)
            await restore()
        } catch {
            await restore()
            throw error
        }
        #endif
    }

    @MainActor
    func testBundledInterfaceLoadsOfflineAndNativeBridgePersistsAcrossReload() async throws {
        let web = try await loadedWebView()
        let scheme = try await web.evaluateJavaScript("location.protocol") as? String
        let platform = try await web.evaluateJavaScript("SteadyNative.platform") as? String
        let tabs = try await web.evaluateJavaScript("document.querySelectorAll('.sidebar nav .nav-item').length") as? Int
        let remoteResources = try await web.evaluateJavaScript("performance.getEntriesByType('resource').filter(entry=>/^https?:/.test(entry.name)).length") as? Int
        XCTAssertEqual(scheme, "file:")
        XCTAssertEqual(platform, "ios")
        XCTAssertEqual(tabs, 3)
        XCTAssertEqual(remoteResources, 0)
        let previous = try await web.evaluateJavaScript("localStorage.getItem('steady.theme')") as? String
        let marker = previous == "dark" ? "light" : "dark"
        _ = try await web.callAsyncJavaScript("localStorage.setItem('steady.theme', value); await SteadyNative.flushStorage(); return true;", arguments: ["value":marker], in: nil, contentWorld: .page)
        let support = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: false).appendingPathComponent("Steady")
        XCTAssertEqual(try LocalDataStore(directory: support).snapshot?.values["steady.theme"], marker)
        web.reload()
        // Wait for the old page to leave before checking the replacement document.
        try await Task.sleep(nanoseconds: 300_000_000)
        let reloaded = try await loadedWebView()
        let restored = try await reloaded.evaluateJavaScript("localStorage.getItem('steady.theme')") as? String
        XCTAssertEqual(restored, marker)
        _ = try await reloaded.callAsyncJavaScript("if(value===null)localStorage.removeItem('steady.theme');else localStorage.setItem('steady.theme',value);await SteadyNative.flushStorage();return true;", arguments:["value":previous as Any? ?? NSNull()], in:nil, contentWorld:.page)
        let image = try await reloaded.takeSnapshot(configuration: nil)
        let attachment = XCTAttachment(image: image)
        attachment.name = "Steady bundled interface"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

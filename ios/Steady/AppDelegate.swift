import UIKit
import SwiftUI
import WebKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        true
    }
}

@MainActor
final class SteadyTabState: ObservableObject {
    @Published var webView: WKWebView?
    @Published var isDark = false
}

private final class SteadyWebViewContainer: UIView {
    private var hostedWebView: WKWebView?
    private var webViewConstraints: [NSLayoutConstraint] = []

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func display(_ webView: WKWebView?) {
        guard hostedWebView !== webView || webView?.superview !== self else { return }
        NSLayoutConstraint.deactivate(webViewConstraints)
        webViewConstraints.removeAll()
        if hostedWebView?.superview === self {
            hostedWebView?.removeFromSuperview()
        }
        hostedWebView = webView
        guard let webView else { return }
        webView.removeFromSuperview()
        webView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(webView)
        webViewConstraints = [
            webView.topAnchor.constraint(equalTo: topAnchor),
            webView.leadingAnchor.constraint(equalTo: leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: bottomAnchor)
        ]
        NSLayoutConstraint.activate(webViewConstraints)
    }
}

private struct SteadyWebViewHost: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> SteadyWebViewContainer {
        let container = SteadyWebViewContainer()
        container.display(webView)
        return container
    }

    func updateUIView(_ container: SteadyWebViewContainer, context: Context) {
        container.display(webView)
    }

    static func dismantleUIView(_ container: SteadyWebViewContainer, coordinator: ()) {
        container.display(nil)
    }
}

struct SteadyRootView: View {
    @ObservedObject var state: SteadyTabState

    var body: some View {
        ZStack {
            Color.clear
            if let webView = state.webView {
                SteadyWebViewHost(webView: webView)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .ignoresSafeArea(.container, edges: .all)
            }
        }
        .ignoresSafeArea(.container, edges: .all)
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .preferredColorScheme(state.isDark ? .dark : .light)
    }
}

private final class SteadyNavigationController: UINavigationController {
    override var childForStatusBarStyle: UIViewController? { topViewController }
}

final class SteadySceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        // The navigation controller preserves the page-driven native Back item.
        // The one hosted WebView fills the main screen and secondary routes.
        let navigation = SteadyNavigationController(rootViewController: SteadyViewController())
        navigation.isNavigationBarHidden = true
        window.rootViewController = navigation
        window.makeKeyAndVisible()
        self.window = window
    }
}

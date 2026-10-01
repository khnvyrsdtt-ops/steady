import AVFoundation
import SwiftUI
import UIKit
import WebKit
import UniformTypeIdentifiers

/// Steady's colours, in one place.
///
/// These are the same values as the web tokens in `app/public/branding.css`:
/// `--bg`, `--surface`, `--ink`, `--muted`, `--accent`, `--brand-*`. The two layers
/// draw the same surfaces, so the two lists have to be the same list; anything
/// else shows as a band of a different shade where they meet.
enum SteadyPalette {
    /// True white in light, true black in dark. The canvas behind the page, the
    /// safe areas and the glass all sit on this.
    static func canvas(dark: Bool) -> UIColor { dark ? .black : .white }
    /// Body copy, matched to the page's --muted so the native screens do not
    /// drift a shade away from the web ones.
    static func secondaryInk(dark: Bool) -> UIColor {
        dark ? UIColor(red: 0xa0 / 255, green: 0xa0 / 255, blue: 0xa0 / 255, alpha: 1)
             : UIColor(red: 0x5d / 255, green: 0x64 / 255, blue: 0x6c / 255, alpha: 1)
    }
    /// The one accent that has to be found, and the only colour outside the mark
    /// that the native layer is allowed to introduce: Steady blue #5574D8.
    static let accent = UIColor(red: 0x55 / 255, green: 0x74 / 255, blue: 0xD8 / 255, alpha: 1)
    /// The four approved hues, in reading order.
    static let hues: [UIColor] = [
        UIColor(red: 0x55 / 255, green: 0x74 / 255, blue: 0xD8 / 255, alpha: 1),   // #5574D8 blue
        UIColor(red: 0x5E / 255, green: 0xAE / 255, blue: 0x78 / 255, alpha: 1),   // #5EAE78 green
        UIColor(red: 0xD0 / 255, green: 0xA4 / 255, blue: 0x5A / 255, alpha: 1),   // #D0A45A gold
        UIColor(red: 0xC8 / 255, green: 0x6A / 255, blue: 0x7E / 255, alpha: 1),   // #C86A7E rose
    ]
}

enum NativeViewport {
    static func availableHeight(bounds: CGRect, keyboard: CGRect?) -> CGFloat {
        guard let keyboard, keyboard.height > 0, keyboard.width >= bounds.width * 0.8 else { return bounds.height }
        // Prefer Cross-Fade Transitions can report a zero-origin keyboard frame.
        if keyboard.minY == 0 { return max(0, bounds.height - keyboard.height) }
        guard keyboard.maxY >= bounds.maxY - 2 else { return bounds.height }
        return max(0, min(bounds.height, keyboard.minY - bounds.minY))
    }
}

final class SteadyWebView: WKWebView {
    var hidesFormAccessory = false {
        didSet {
            if oldValue != hidesFormAccessory { reloadInputViews() }
        }
    }

    // Burden has a single composer, so it does not need WebKit's separate
    // previous/next/Done toolbar. Other forms keep their normal controls.
    override var inputAccessoryView: UIView? {
        hidesFormAccessory ? nil : super.inputAccessoryView
    }
}

/// The Steady mark, drawn as the four coloured cells and nothing else.
///
/// There is deliberately no container. No effect view, no plate, no corner
/// radius on this view, no clipping, no shadow, no tint and no blur: it is
/// fully transparent, so the app surface runs continuously behind and around
/// the cells with no square, shade, border or halo of any kind. Anything drawn
/// outside the four discs would be a container, so nothing is.
///
/// Each cell is one disc holding the mark's own light model in the cell's own
/// colours — lit above, the approved hue exactly at the equator, a deeper foot
/// below — so the depth lives inside the disc and can never read as a plate
/// behind the mark. Geometry is the canonical icon geometry scaled down (radius
/// 140, centre offset 167 on the 1024 grid), so the cells stay perfectly round
/// and evenly separated and the mark stays the same mark, the same size, in the
/// same place as the picture it replaces.
final class SteadyMarkView: UIView {
    private static let radius = CGFloat(154) / 1024
    private static let offset = CGFloat(172) / 1024
    private static let hues = SteadyPalette.hues
    /// One cell: a true circle, drawn as a path, carrying the mark's own light
    /// model in the cell's own colours. A circle path in an explicitly square
    /// rect cannot be clamped, stretched or rounded asymmetrically the way a
    /// corner radius can, so the shape is circular at any size and scale.
    private struct Cell {
        let body = CAShapeLayer()
        let ramp = CAGradientLayer()
        let mask = CAShapeLayer()
    }
    private let cells = (0 ..< 4).map { _ in Cell() }

    init() {
        super.init(frame: .zero)
        backgroundColor = .clear
        isOpaque = false
        // Decoration only. The wordmark's own link stays the tap target, and the
        // page already hides the mark from assistive technology, so this must
        // neither take touches nor be announced twice.
        isUserInteractionEnabled = false
        accessibilityElementsHidden = true
        // Nothing above may squeeze this mark along one axis only: a compressed
        // width would turn four circles into four ovals.
        for axis in [NSLayoutConstraint.Axis.horizontal, .vertical] {
            setContentHuggingPriority(.required, for: axis)
            setContentCompressionResistancePriority(.required, for: axis)
        }
        for cell in cells {
            // The light rides on top of the hue, and the same circle clips it,
            // so nothing is ever drawn outside a cell.
            cell.mask.fillColor = UIColor.black.cgColor
            cell.ramp.mask = cell.mask
            layer.addSublayer(cell.body)
            layer.addSublayer(cell.ramp)
        }
        setAppearance(dark: traitCollection.userInterfaceStyle == .dark)
    }

    required init?(coder: NSCoder) { fatalError("SteadyMarkView is created in code") }

    private func mix(_ a: UIColor, _ b: UIColor, _ f: CGFloat) -> UIColor {
        var ar: CGFloat = 0, ag: CGFloat = 0, ab: CGFloat = 0, aa: CGFloat = 0
        var br: CGFloat = 0, bg: CGFloat = 0, bb: CGFloat = 0, ba: CGFloat = 0
        a.getRed(&ar, green: &ag, blue: &ab, alpha: &aa)
        b.getRed(&br, green: &bg, blue: &bb, alpha: &ba)
        return UIColor(red: ar + (br - ar) * f, green: ag + (bg - ag) * f,
                       blue: ab + (bb - ab) * f, alpha: 1)
    }

    /// The same light model in both appearances, held inside each cell. The
    /// equator stop is the approved hue itself, unshifted, so the brand colour
    /// is never washed toward pastel at the top or muddied at the foot. Dark
    /// takes a slightly deeper foot so a cell never dissolves into black.
    func setAppearance(dark: Bool) {
        let lit: CGFloat = dark ? 0.30 : 0.32
        let foot: CGFloat = dark ? 0.32 : 0.22
        for (cell, hue) in zip(cells, Self.hues) {
            let white = UIColor.white
            let black = UIColor.black
            cell.ramp.colors = [
                mix(hue, white, lit).cgColor,
                mix(hue, white, lit * 0.15).cgColor,
                hue.cgColor,
                mix(hue, black, foot * 0.45).cgColor,
                mix(hue, black, foot).cgColor,
            ]
            cell.ramp.startPoint = CGPoint(x: 0.5, y: 0)
            cell.ramp.endPoint = CGPoint(x: 0.5, y: 1)
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        // One square governs everything, so width and height can never be
        // derived from different measurements and the four cells cannot differ.
        let side = min(bounds.width, bounds.height)
        let diameter = side * Self.radius * 2
        let offset = side * Self.offset
        // The arrangement is centred on the square itself, not on the view's
        // own midpoint, so a non-square frame letterboxes instead of shifting
        // or squashing the block.
        let originX = (bounds.width - side) / 2
        let originY = (bounds.height - side) / 2
        let centre = CGPoint(x: originX + side / 2, y: originY + side / 2)
        let centres = [CGPoint(x: centre.x - offset, y: centre.y - offset),
                       CGPoint(x: centre.x + offset, y: centre.y - offset),
                       CGPoint(x: centre.x - offset, y: centre.y + offset),
                       CGPoint(x: centre.x + offset, y: centre.y + offset)]
        for (cell, (hue, at)) in zip(cells, zip(Self.hues, centres)) {
            // A square rect of exactly the same number of points on both axes,
            // so the oval inscribed in it is a circle and not an ellipse.
            let rect = CGRect(x: at.x - diameter / 2, y: at.y - diameter / 2,
                              width: diameter, height: diameter)
            cell.ramp.frame = rect
            // The shape layer keeps a zero origin and the path is absolute. A
            // layer with a non-zero frame would shift its own path by that
            // origin, which throws every circle off by its own position.
            cell.body.frame = bounds
            cell.body.path = UIBezierPath(ovalIn: rect).cgPath
            cell.body.fillColor = hue.cgColor
            // A mask is composited in the masked layer's own coordinate space, so
            // it is zero-origin and the size of the gradient it clips. Offsetting
            // it by the disc's own position shifts the clip sideways and leaves
            // a wedge of gradient hanging outside the circle.
            cell.mask.frame = CGRect(origin: .zero, size: rect.size)
            cell.mask.path = UIBezierPath(ovalIn: CGRect(origin: .zero, size: rect.size)).cgPath
        }
    }
}

final class SteadyViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandlerWithReply, UIDocumentPickerDelegate, AVSpeechSynthesizerDelegate, UIScrollViewDelegate, UITextFieldDelegate, UIAdaptivePresentationControllerDelegate {
    private var webView: SteadyWebView?
    private(set) var selectedTab = SteadyTab.home
    private let tabState = SteadyTabState()
    private var hostingController: UIHostingController<SteadyRootView>?
    private var store: LocalDataStore?
    private var webRoot: URL?
    private var keyboardFrame: CGRect?
    private var isShowingChat = false
    private var isShowingSettings = false
    private var isAnchoringChatViewport = false
    private var isDark = false
    private var appIconChangePending = false
    private var useLightStatusBar = false
    private var hideStatusBar = false
    private var isShowingStorageError = false
    private var errorView: UIView?
    private var loadingView: UIView?
    private var bridgeTemplate: String?
    private let speechSynthesizer = AVSpeechSynthesizer()
    private let replyOrganizer = BurdenReplyOrganizer()
    private var speechKey: String?
    private var viewportScheduled = false
    private var lastViewportHeight: CGFloat = -1
    private var lastViewportFullHeight: CGFloat = -1
    private var lastViewportTop: CGFloat = -1
    private var lastViewportBottom: CGFloat = -1
    private var lastViewportKeyboardOpen = false
    // The web view is transparent, so these are the colours behind every safe
    // area, glass blur and overscroll edge. They must equal the web --bg
    // exactly: any drift shows as a band of a different shade above and below
    // the content, which is what the old off-white and near-black values did.
    private var lightCanvas: UIColor { SteadyPalette.canvas(dark: false) }
    private var darkCanvas: UIColor { SteadyPalette.canvas(dark: true) }
    // The one accent that has to be found. Used only where an action must not be
    // missed.
    private let accent = SteadyPalette.accent
    private var markView: SteadyMarkView?
    private var burdenSearchField: UISearchTextField?
    private var burdenSearchBottom: NSLayoutConstraint?
    private var chatTopShade: UIView?
    private var chatTopShadeGradient: CAGradientLayer?
    private var chatTopShadeHeight: NSLayoutConstraint?
    private var animalBackdrop: UIVisualEffectView?
    private var nativeHeaderButtons: UIStackView?
    private var nativeBackButton: UIButton?
    private var nativeSettingsTitle: UILabel?
    private var nativeHeaderReady = false
    // The page states whether there is somewhere to go back to; this records what
    // the bar was last asked to do, so a repeated identical request neither
    // restarts the show/hide animation nor leaves a stale Back control behind.
    private var isNativeNavigationVisible = false
    /// Legacy section names remain for the page's route bridge. The app now
    /// presents one main screen without visible native or web tabs.
    enum SteadyTab: Int, CaseIterable, Hashable, Identifiable {
        case home, burden, reflect
        var id: Self { self }
        var title: String {
            switch self {
            case .home: return "Home"
            case .burden: return "Ask"
            case .reflect: return "Reflect"
            }
        }
        var symbol: String {
            switch self {
            case .home: return "house"
            case .burden: return "bubble.left"
            case .reflect: return "moon.stars"
            }
        }
        /// The page section this tab stands on, as `document.body.dataset.section` reports it.
        var section: String {
            switch self {
            case .home: return "home"
            case .burden: return "help"
            case .reflect: return "review"
            }
        }
        /// The fallback route, used only when the page's own tab switcher is
        /// unreachable. The primary path calls the page's `selectTab`, which
        /// keeps its trail, details and haptic semantics exactly as a tap on
        /// the page's own control would.
        var route: String {
            switch self {
            case .home: return "home"
            case .burden: return "today/feelings"
            case .reflect: return "review"
            }
        }
    }
    private lazy var edgeBack: UIScreenEdgePanGestureRecognizer = {
        let recognizer = UIScreenEdgePanGestureRecognizer(target: self, action: #selector(edgeBackPanned(_:)))
        recognizer.edges = .left
        recognizer.isEnabled = false
        return recognizer
    }()

    private func installNativeTabs() {
        let host = UIHostingController(rootView: SteadyRootView(state: tabState))
        host.view.backgroundColor = .clear
        addChild(host)
        view.addSubview(host.view)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            host.view.topAnchor.constraint(equalTo: view.topAnchor),
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        host.didMove(toParent: self)
        hostingController = host
        installChatTopShade()
        installBurdenSearchField()
        installNativeHeaderButtons()
        installNativeBackButton()
        installNativeSettingsTitle()
    }

    private func installNativeHeaderButtons() {
        guard traitCollection.userInterfaceIdiom == .phone else { return }
        func button(symbol: String, label: String, action: UIAction) -> UIButton {
            var configuration: UIButton.Configuration
            if #available(iOS 26.0, *) {
                configuration = .glass()
            } else {
                configuration = .gray()
            }
            configuration.image = UIImage(systemName: symbol)
            configuration.cornerStyle = .capsule
            let control = UIButton(configuration: configuration, primaryAction: action)
            control.accessibilityLabel = label
            control.tintColor = .black
            control.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                control.widthAnchor.constraint(equalToConstant: 44),
                control.heightAnchor.constraint(equalToConstant: 44)
            ])
            return control
        }
        let settings = button(symbol: "gearshape", label: "Settings", action: UIAction { [weak self] _ in
            self?.webView?.evaluateJavaScript("document.querySelector('.settings-link')?.click()")
        })
        if var configuration = settings.configuration {
            configuration.preferredSymbolConfigurationForImage = UIImage.SymbolConfiguration(pointSize: 17, weight: .light)
            // Keep the 44pt hit target while the glass itself occupies 36pt.
            configuration.background.backgroundInsets = NSDirectionalEdgeInsets(top: 4, leading: 4, bottom: 4, trailing: 4)
            configuration.background.backgroundColor = UIColor.secondarySystemBackground.withAlphaComponent(0.12)
            settings.configuration = configuration
        }
        let row = UIStackView(arrangedSubviews: [settings])
        row.axis = .horizontal
        row.spacing = 12
        row.translatesAutoresizingMaskIntoConstraints = false
        row.isHidden = true
        view.addSubview(row)
        NSLayoutConstraint.activate([
            row.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
            row.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20)
        ])
        nativeHeaderButtons = row
    }

    private func updateNativeHeaderButtons() {
        guard let row = nativeHeaderButtons else { return }
        row.isHidden = !nativeHeaderReady || isNativeNavigationVisible || errorView != nil
            || (isShowingChat && lastViewportKeyboardOpen)
        row.overrideUserInterfaceStyle = isDark ? .dark : .light
        for button in row.arrangedSubviews.compactMap({ $0 as? UIButton }) {
            button.tintColor = (isDark ? UIColor.white : UIColor.black).withAlphaComponent(0.82)
        }
    }

    private func installNativeBackButton() {
        guard traitCollection.userInterfaceIdiom == .phone else { return }
        var configuration: UIButton.Configuration
        if #available(iOS 26.0, *) {
            configuration = .glass()
        } else {
            configuration = .gray()
        }
        configuration.image = UIImage(systemName: "chevron.backward")
        configuration.title = "Back"
        configuration.imagePlacement = .leading
        configuration.imagePadding = 5
        configuration.contentInsets = NSDirectionalEdgeInsets(top: 0, leading: 12, bottom: 0, trailing: 14)
        configuration.cornerStyle = .capsule
        let button = UIButton(configuration: configuration, primaryAction: UIAction { [weak self] _ in
            self?.nativeBack()
        })
        button.translatesAutoresizingMaskIntoConstraints = false
        button.isHidden = true
        button.accessibilityLabel = "Back"
        button.tintColor = isDark ? .white : .black
        view.addSubview(button)
        NSLayoutConstraint.activate([
            button.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
            button.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            button.widthAnchor.constraint(greaterThanOrEqualToConstant: 88),
            button.heightAnchor.constraint(equalToConstant: 44)
        ])
        nativeBackButton = button
    }

    private func installNativeSettingsTitle() {
        guard traitCollection.userInterfaceIdiom == .phone else { return }
        let title = UILabel()
        title.text = "Settings"
        title.font = .systemFont(ofSize: 22, weight: .semibold)
        title.textAlignment = .center
        title.translatesAutoresizingMaskIntoConstraints = false
        title.isUserInteractionEnabled = false
        title.isAccessibilityElement = true
        title.accessibilityTraits = .header
        title.isHidden = true
        title.textColor = isDark ? .white : .black
        view.addSubview(title)
        NSLayoutConstraint.activate([
            title.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
            title.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            title.heightAnchor.constraint(equalToConstant: 44)
        ])
        nativeSettingsTitle = title
    }

    private func updateNativeSettingsTitle() {
        nativeSettingsTitle?.isHidden = !(isShowingSettings && errorView == nil)
        nativeSettingsTitle?.textColor = isDark ? .white : .black
    }

    private func chatTopShadeColors(dark: Bool) -> [CGColor] {
        let canvas = SteadyPalette.canvas(dark: dark)
        // Ease continuously across the whole shade, with no solid lower band.
        return (0...32).map { step in
            let progress = CGFloat(step) / 32
            let opacity = 1 - progress * progress * (3 - 2 * progress)
            return canvas.withAlphaComponent(opacity).cgColor
        }
    }

    private func updateTopShade() {
        chatTopShade?.isHidden = !nativeHeaderReady || !isShowingChat || errorView != nil
        // Shade the status indicators, tapering only 16pt beyond their safe
        // area. Keep the same short fade with and without the keyboard.
        let height = max(24, view.safeAreaInsets.top + 16)
        chatTopShadeHeight?.constant = height
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        chatTopShadeGradient?.colors = chatTopShadeColors(dark: isDark)
        chatTopShadeGradient?.locations = nil
        CATransaction.commit()
    }

    private func installChatTopShade() {
        let shade = UIView()
        shade.translatesAutoresizingMaskIntoConstraints = false
        shade.isUserInteractionEnabled = false
        shade.isHidden = true
        shade.accessibilityElementsHidden = true
        let gradient = CAGradientLayer()
        gradient.colors = chatTopShadeColors(dark: isDark)
        shade.layer.addSublayer(gradient)
        view.addSubview(shade)
        let height = shade.heightAnchor.constraint(equalToConstant: 24)
        NSLayoutConstraint.activate([
            shade.topAnchor.constraint(equalTo: view.topAnchor),
            shade.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            shade.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            height
        ])
        chatTopShade = shade
        chatTopShadeGradient = gradient
        chatTopShadeHeight = height
        updateTopShade()
    }

    private func installBurdenSearchField() {
        let field = UISearchTextField()
        field.translatesAutoresizingMaskIntoConstraints = false
        field.attributedPlaceholder = NSAttributedString(
            string: "Say it your way…",
            attributes: [.foregroundColor: SteadyPalette.secondaryInk(dark: isDark)])
        field.accessibilityLabel = "Write a thought or question"
        field.accessibilityIdentifier = "burden-native-search"
        field.returnKeyType = .send
        field.autocorrectionType = .default
        field.overrideUserInterfaceStyle = .light
        field.delegate = self
        field.isHidden = true
        field.addTarget(self, action: #selector(burdenSearchChanged(_:)), for: .editingChanged)
        let send = UIButton(type: .system)
        send.setPreferredSymbolConfiguration(UIImage.SymbolConfiguration(pointSize: 28, weight: .regular), forImageIn: .normal)
        send.setImage(UIImage(systemName: "arrow.up.circle.fill"), for: .normal)
        send.tintColor = accent
        send.accessibilityLabel = "Send message"
        send.addTarget(self, action: #selector(sendBurdenSearch), for: .touchUpInside)
        send.frame = CGRect(x: 0, y: 0, width: 44, height: 44)
        field.rightView = send
        field.rightViewMode = .always
        send.isEnabled = false
        let tools = UIButton(type: .system)
        var toolsStyle = UIButton.Configuration.plain()
        toolsStyle.title = "Tools"
        toolsStyle.image = UIImage(systemName: "plus", withConfiguration: UIImage.SymbolConfiguration(pointSize: 14, weight: .semibold))
        toolsStyle.imagePadding = 5
        toolsStyle.contentInsets = NSDirectionalEdgeInsets(top: 0, leading: 10, bottom: 0, trailing: 10)
        toolsStyle.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var attributes = incoming
            attributes.font = UIFont.systemFont(ofSize: 13, weight: .semibold)
            return attributes
        }
        tools.configuration = toolsStyle
        tools.tintColor = isDark ? .white : .black
        tools.accessibilityLabel = "Open tools"
        tools.accessibilityHint = "Talk it through, choose a next step, explore Scripture or keep a reflection"
        tools.frame = CGRect(x: 0, y: 0, width: 78, height: 44)
        func toolAction(_ title: String, _ symbol: String, _ key: String) -> UIAction {
            UIAction(title: title, image: UIImage(systemName: symbol)) { [weak self] _ in
                self?.openMainTool(key)
            }
        }
        tools.menu = UIMenu(children: [
            UIMenu(title: "Perspectives", options: .displayInline, children: [
                toolAction("Talk it through", "bubble.left", "talk"),
                toolAction("One next step", "arrow.right.circle", "step"),
                toolAction("Explore Scripture", "book.closed", "scripture"),
                toolAction("Keep a reflection", "moon.stars", "reflect")
            ]),
            toolAction("My actions", "checklist", "actions"),
            toolAction("Write freely", "square.and.pencil", "write")
        ])
        tools.showsMenuAsPrimaryAction = true
        field.leftView = tools
        field.leftViewMode = .always
        view.addSubview(field)
        let bottom = field.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -16)
        NSLayoutConstraint.activate([
            field.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            view.trailingAnchor.constraint(equalTo: field.trailingAnchor, constant: 16),
            field.heightAnchor.constraint(equalToConstant: 54),
            bottom
        ])
        burdenSearchField = field
        burdenSearchBottom = bottom
    }

    private func updateBurdenSendButton() {
        guard let field = burdenSearchField, let send = field.rightView as? UIButton else { return }
        let hasText = !(field.text?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
        send.isEnabled = hasText
        send.tintColor = hasText ? accent : SteadyPalette.secondaryInk(dark: isDark)
    }

    private func setBurdenPrompt(_ prompt: String, saveReflection: Bool, saveAction: Bool = false) {
        guard let field = burdenSearchField else { return }
        let wording = prompt.isEmpty ? "Say it your way…" : String(prompt.prefix(80))
        field.attributedPlaceholder = NSAttributedString(
            string: wording,
            attributes: [.foregroundColor: SteadyPalette.secondaryInk(dark: isDark)])
        if let send = field.rightView as? UIButton {
            send.setImage(UIImage(systemName: (saveReflection || saveAction) ? "checkmark.circle.fill" : "arrow.up.circle.fill"), for: .normal)
            send.accessibilityLabel = saveAction ? "Save action" : saveReflection ? "Save reflection" : "Send message"
        }
        updateBurdenSendButton()
    }

    private func openMainTool(_ key: String) {
        guard ["talk", "step", "scripture", "reflect", "actions", "write"].contains(key) else { return }
        burdenSearchField?.resignFirstResponder()
        UISelectionFeedbackGenerator().selectionChanged()
        webView?.callAsyncJavaScript("window.SteadyMain?.openTool(key)", arguments: ["key": key], in: nil, in: .page)
    }

    @objc private func burdenSearchChanged(_ field: UISearchTextField) {
        let text = String((field.text ?? "").prefix(1200))
        if field.text != text { field.text = text }
        updateBurdenSendButton()
        webView?.callAsyncJavaScript("window.SteadyBurdenComposer?.setDraft(text)", arguments: ["text": text], in: nil, in: .page)
    }

    @objc private func sendBurdenSearch() {
        guard let field = burdenSearchField, let draft = field.text else { return }
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else {
            burdenSearchField?.becomeFirstResponder()
            return
        }
        webView?.callAsyncJavaScript("window.SteadyBurdenComposer?.send(text) === true", arguments: ["text": text], in: nil, in: .page) { [weak self] result in
            if case .success(let value) = result, (value as? Bool) == true,
               self?.burdenSearchField?.text == draft {
                self?.burdenSearchField?.text = ""
                self?.updateBurdenSendButton()
            }
        }
    }

    func textFieldDidBeginEditing(_ textField: UITextField) {
        guard textField === burdenSearchField else { return }
        webView?.evaluateJavaScript("window.SteadyBurdenComposer?.setFocused(true)")
    }

    func textFieldDidEndEditing(_ textField: UITextField) {
        guard textField === burdenSearchField else { return }
        webView?.evaluateJavaScript("window.SteadyBurdenComposer?.setFocused(false)")
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        sendBurdenSearch()
        return false
    }

    private func positionBurdenSearchField() {
        guard let bottom = burdenSearchBottom else { return }
        let keyboardOverlap: CGFloat
        if let keyboardFrame, let window = view.window {
            let local = window.screen.coordinateSpace.convert(keyboardFrame, to: view)
            keyboardOverlap = max(0, view.bounds.maxY - local.minY)
        } else {
            keyboardOverlap = 0
        }
        bottom.constant = -(max(view.safeAreaInsets.bottom, keyboardOverlap) + 8)
    }

    /// Retained for callers that still use the page's legacy section bridge.
    func selectNativeTab(_ tab: SteadyTab) {
        selectedTab = tab
        UISelectionFeedbackGenerator().selectionChanged()
        webView?.evaluateJavaScript(
            "window.SteadyNavigation ? window.SteadyNavigation.selectTab('\(tab.section)') : (window.selectTab ? window.selectTab('\(tab.section)') : location.hash = '\(tab.route)')")
    }

    /// The page owns section routing; this remembers it for bridge compatibility.
    private func applySection(_ section: String) {
        guard let tab = SteadyTab.allCases.first(where: { $0.section == section }) else { return }
        selectedTab = tab
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { useLightStatusBar ? .lightContent : .darkContent }
    override var prefersStatusBarHidden: Bool { hideStatusBar }
    override var preferredStatusBarUpdateAnimation: UIStatusBarAnimation { .slide }

    override func viewDidLoad() {
        super.viewDidLoad()
        speechSynthesizer.delegate = self
        view.backgroundColor = isDark ? darkCanvas : lightCanvas
        installNativeTabs()
        view.addGestureRecognizer(edgeBack)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardChanged(_:)), name: UIResponder.keyboardWillChangeFrameNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardHidden), name: UIResponder.keyboardWillHideNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(didBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(contentSizeChanged), name: UIContentSizeCategory.didChangeNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(displayPreferencesChanged), name: UIAccessibility.reduceTransparencyStatusDidChangeNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(displayPreferencesChanged), name: UIAccessibility.darkerSystemColorsStatusDidChangeNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(cancelReplyGeneration), name: UIApplication.willResignActiveNotification, object: nil)
        openApp()
    }

    deinit { NotificationCenter.default.removeObserver(self) }

    @objc private func contentSizeChanged() {
        let large = UIFont.preferredFont(forTextStyle: .body).pointSize >= 19
        webView?.evaluateJavaScript("document.documentElement.dataset.systemLargeText='\(large)';window.dispatchEvent(new Event('steady:system-text-size'))")
    }

    private var displayPreferences: [String: Any] {
        let nativeDesign: String
        if #available(iOS 26.0, *) { nativeDesign = "liquid-glass" }
        else { nativeDesign = "classic" }
        return [
            "nativeDesign": nativeDesign,
            "reducedTransparency": UIAccessibility.isReduceTransparencyEnabled,
            "increasedContrast": UIAccessibility.isDarkerSystemColorsEnabled
        ]
    }

    @objc private func displayPreferencesChanged() {
        guard let data = try? JSONSerialization.data(withJSONObject: displayPreferences),
              let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript("window.SteadyNative?.updateDisplayPreferences(\(json))")
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if previousTraitCollection?.accessibilityContrast != traitCollection.accessibilityContrast {
            displayPreferencesChanged()
        }
    }

    @objc private func openApp() {
        errorView?.removeFromSuperview()
        errorView = nil
        // A replacement document reports its own navigation state from scratch,
        // so the bar must not be left holding the previous document's answer.
        isNativeNavigationVisible = false
        nativeHeaderReady = false
        nativeBackButton?.isHidden = true
        isShowingSettings = false
        updateNativeSettingsTitle()
        updateNativeHeaderButtons()
        edgeBack.isEnabled = false
        navigationItem.leftBarButtonItem = nil
        navigationController?.setNavigationBarHidden(true, animated: false)
        selectedTab = .home
        stopSpeech()
        replyOrganizer.cancel()
        viewportScheduled = false
        lastViewportHeight = -1
        lastViewportFullHeight = -1
        lastViewportTop = -1
        lastViewportBottom = -1
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "steady", contentWorld: .page)
        webView?.removeFromSuperview()
        webView = nil
        tabState.webView = nil
        view.backgroundColor = isDark ? darkCanvas : lightCanvas
        showLoading()
        do {
            let support = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("Steady", isDirectory: true)
            let store = try LocalDataStore(directory: support)
            self.store = store
            guard let bundledWeb = Bundle.main.url(forResource: "Web", withExtension: nil),
                  let bridgeURL = Bundle.main.url(forResource: "NativeBridge", withExtension: "js") else { throw LaunchError.missingContent }
            let root = try store.installWebContent(from: bundledWeb)
            webRoot = root
            bridgeTemplate = try String(contentsOf: bridgeURL, encoding: .utf8)
            let script = try seededBridgeScript()
            let controller = WKUserContentController()
            controller.addScriptMessageHandler(self, contentWorld: .page, name: "steady")
            controller.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            let configuration = WKWebViewConfiguration()
            configuration.websiteDataStore = .default()
            configuration.userContentController = controller
            configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
            configuration.allowsInlineMediaPlayback = true
            let web = SteadyWebView(frame: view.bounds, configuration: configuration)
            webView = web
            tabState.webView = web
            web.navigationDelegate = self
            web.uiDelegate = self
            web.isOpaque = false
            web.backgroundColor = isDark ? darkCanvas : lightCanvas
            web.scrollView.backgroundColor = isDark ? darkCanvas : lightCanvas
            web.scrollView.contentInsetAdjustmentBehavior = .never
            web.scrollView.automaticallyAdjustsScrollIndicatorInsets = false
            web.scrollView.bounces = false
            web.scrollView.delegate = self
            web.scrollView.keyboardDismissMode = .interactive
            web.scrollView.showsVerticalScrollIndicator = false
            web.scrollView.showsHorizontalScrollIndicator = false
            web.allowsBackForwardNavigationGestures = false
            #if DEBUG
            if #available(iOS 16.4, *) { web.isInspectable = true }
            #endif
            // The mark is native glass laid over the slot the page reports, so
            // the header is laid out by the page exactly as it always was.
            let mark = SteadyMarkView()
            mark.frame = .zero
            mark.isHidden = true
            view.addSubview(mark)
            markView = mark
            web.loadFileURL(root.appendingPathComponent("index.html"), allowingReadAccessTo: root)
        } catch { showLaunchError() }
    }

    private enum LaunchError: Error { case missingContent }

    private func seededBridgeScript() throws -> String {
        guard let store, let bridgeTemplate else { throw LaunchError.missingContent }
        var seed = displayPreferences
        seed["systemLargeText"] = UIFont.preferredFont(forTextStyle: .body).pointSize >= 19
        if let snapshot = store.snapshot {
            seed["snapshot"] = ["version": snapshot.version, "revision": snapshot.revision, "values": snapshot.values]
        }
        if let error = store.readError { seed["error"] = error.localizedDescription }
        let data = try JSONSerialization.data(withJSONObject: seed)
        guard let json = String(data: data, encoding: .utf8) else { throw LaunchError.missingContent }
        return bridgeTemplate.replacingOccurrences(of: "__STEADY_NATIVE_SEED__", with: json)
    }

    /// Show the system's bar only when the page has somewhere to go back to.
    /// The bar is left entirely to UIKit: no appearance, no background, no
    /// border and no hand-made glass, so it picks up the platform's own
    /// treatment. There is no title, because the page already draws the screen's
    /// heading and a second one would say the same thing twice.
    private func applyNavigation(back: String) {
        guard let navigation = navigationController else { return }
        let show = !back.isEmpty
        if let button = nativeBackButton, isShowingSettings {
            isNativeNavigationVisible = show
            button.isHidden = !show
            button.accessibilityLabel = "Back to \(back)"
            navigationItem.leftBarButtonItem = nil
            navigation.setNavigationBarHidden(true, animated: false)
            edgeBack.isEnabled = show
            updateNativeHeaderButtons()
            return
        }
        nativeBackButton?.isHidden = true
        // The page restates the destination on every screen change, so only the
        // label is refreshed here. Switching immediately prevents the Back
        // control from sliding upward when returning from Memory to Ask.
        if show != isNativeNavigationVisible || navigation.isNavigationBarHidden == show {
            isNativeNavigationVisible = show
            navigationItem.leftBarButtonItem = show ? makeNativeBackItem(back) : nil
            navigation.setNavigationBarHidden(!show, animated: false)
            edgeBack.isEnabled = show
        } else if show, navigationItem.leftBarButtonItem?.accessibilityLabel != "Back to \(back)" {
            navigationItem.leftBarButtonItem = makeNativeBackItem(back)
        }
        updateNativeHeaderButtons()
    }

    /// A standard bar button item, so the system draws the chevron, the label,
    /// the hit area and the platform's own glass rather than anything here
    /// imitating them. The label names the destination, which is what the page's
    /// own Back control said before it stepped aside for this one.
    private func makeNativeBackItem(_ back: String) -> UIBarButtonItem {
        // The system's own back item, so the chevron, the destination name, the
        // hit area and the platform's glass are all drawn by UIKit. Nothing here
        // imitates them, and nothing is drawn by hand on top of them.
        let action = UIAction(title: back, image: UIImage(systemName: "chevron.backward")) { [weak self] _ in
            self?.nativeBack()
        }
        let item = UIBarButtonItem(primaryAction: action)
        item.style = .plain
        item.accessibilityLabel = "Back to \(back)"
        return item
    }

    /// The page owns the history. This asks it to take exactly the step its own
    /// Back control takes, so there is one navigation model rather than two that
    /// can disagree about where Back goes.
    @objc private func nativeBack() {
        UISelectionFeedbackGenerator().selectionChanged()
        if isShowingSettings {
            isShowingSettings = false
            updateNativeSettingsTitle()
        }
        webView?.evaluateJavaScript("window.SteadyNavigation && window.SteadyNavigation.back()")
    }

    /// Swipe in from the leading edge to go back. This is the system's own edge
    /// gesture, and it asks the page for the same step the Back control takes,
    /// so a swipe and a tap can never disagree about where Back goes. It is only
    /// live while there is somewhere to go back to, so it can never reach the
    /// previous tab, the dock or a control at the edge.
    @objc private func edgeBackPanned(_ recognizer: UIScreenEdgePanGestureRecognizer) {
        guard recognizer.state == .ended else { return }
        let translation = recognizer.translation(in: view).x
        let velocity = recognizer.velocity(in: view).x
        guard translation > 28 || velocity > 320 else { return }
        nativeBack()
    }

    // Place the glass mark over the slot the page reports. The page owns the
    // header, so it reports position and size and this view only follows; an
    // absent or empty slot (the mark is hidden off Home) hides the glass.
    private func placeMark(x: CGFloat, y: CGFloat, size: CGFloat, dark: Bool) {
        guard let mark = markView, let webView, webView.window === view.window,
              size >= 1, size <= webView.bounds.width,
              x.isFinite, y.isFinite else { markView?.isHidden = true; return }
        mark.isHidden = false
        // The mark follows the app's theme choice, not the system setting,
        // exactly as the Burden header pills do: the page may be light on a dark
        // device, and the mark has to agree with the surface it sits on.
        mark.overrideUserInterfaceStyle = dark ? .dark : .light
        mark.setAppearance(dark: dark)
        mark.frame = webView.convert(CGRect(x: x, y: y, width: size, height: size), to: view)
    }

    private func showLoading() {
        if loadingView == nil {
            let background = UIView(frame: view.bounds)
            background.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            background.backgroundColor = view.backgroundColor ?? lightCanvas
            background.accessibilityIdentifier = "SteadyLoading"
            let spinner = UIActivityIndicatorView(style: .medium)
            spinner.color = SteadyPalette.secondaryInk(dark: isDark)
            spinner.translatesAutoresizingMaskIntoConstraints = false
            spinner.accessibilityLabel = "Loading Steady"
            background.addSubview(spinner)
            NSLayoutConstraint.activate([
                spinner.centerXAnchor.constraint(equalTo: background.centerXAnchor),
                spinner.centerYAnchor.constraint(equalTo: background.centerYAnchor)
            ])
            spinner.startAnimating()
            loadingView = background
            view.addSubview(background)
        }
        // Keep loading above the web view while content is still arriving.
        if let loadingView { view.bringSubviewToFront(loadingView) }
    }

    private func hideLoading() {
        loadingView?.removeFromSuperview()
        loadingView = nil
    }

    private func showLaunchError() {
        hideLoading()
        guard errorView == nil else { return }
        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 18
        let heading = UILabel()
        heading.text = "Let’s try again."
        heading.font = .preferredFont(forTextStyle: .title1)
        heading.adjustsFontForContentSizeCategory = true
        heading.textColor = .label
        heading.numberOfLines = 0
        heading.textAlignment = .center
        heading.accessibilityTraits = .header
        let copy = UILabel()
        copy.text = "Steady couldn’t open its on-device content. Your saved entries have not been removed. Try again, or close and reopen the app."
        copy.font = .preferredFont(forTextStyle: .body)
        copy.adjustsFontForContentSizeCategory = true
        copy.textColor = SteadyPalette.secondaryInk(dark: isDark)
        copy.textAlignment = .center
        copy.numberOfLines = 0
        var configuration = UIButton.Configuration.filled()
        configuration.title = "Try again"
        configuration.baseBackgroundColor = accent
        configuration.cornerStyle = .medium
        configuration.contentInsets = NSDirectionalEdgeInsets(top: 14, leading: 24, bottom: 14, trailing: 24)
        let retry = UIButton(configuration: configuration)
        retry.addTarget(self, action: #selector(openApp), for: .touchUpInside)
        retry.accessibilityHint = "Reloads Steady without removing saved entries"
        [heading, copy, retry].forEach(stack.addArrangedSubview)
        let background = UIView(frame: view.bounds)
        background.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        background.backgroundColor = isDark ? darkCanvas : lightCanvas
        background.accessibilityIdentifier = "SteadyLaunchError"
        stack.translatesAutoresizingMaskIntoConstraints = false
        background.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerYAnchor.constraint(equalTo: background.safeAreaLayoutGuide.centerYAnchor),
            stack.centerXAnchor.constraint(equalTo: background.centerXAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: background.safeAreaLayoutGuide.leadingAnchor, constant: 28),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: background.safeAreaLayoutGuide.trailingAnchor, constant: -28),
            stack.widthAnchor.constraint(lessThanOrEqualToConstant: 460)
        ])
        errorView = background
        view.addSubview(background)
        UIAccessibility.post(notification: .screenChanged, argument: heading)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateTopShade()
        chatTopShadeGradient?.frame = chatTopShade?.bounds ?? .zero
        requestViewport()
    }
    override func viewSafeAreaInsetsDidChange() { super.viewSafeAreaInsetsDidChange(); requestViewport() }
    @objc private func didBecomeActive() {
        requestViewport()
        displayPreferencesChanged()
        webView?.evaluateJavaScript("window.SteadyNative?.flushStorage().catch(() => {});")
    }
    @objc private func keyboardChanged(_ notification: Notification) {
        keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect
        positionBurdenSearchField()
        requestViewport()
    }
    @objc private func keyboardHidden() {
        keyboardFrame = nil
        positionBurdenSearchField()
        requestViewport()
    }

    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        guard isShowingChat, !isAnchoringChatViewport, scrollView === webView?.scrollView,
              abs(scrollView.zoomScale - 1) < 0.001,
              scrollView.contentOffset != .zero else { return }
        // The transcript scrolls inside the page. WebKit's separate caret pan
        // shifts its backing view up and clips content at the keyboard edge.
        // Keep that outer view anchored while the composer handles the keyboard.
        isAnchoringChatViewport = true
        defer { isAnchoringChatViewport = false }
        scrollView.setContentOffset(.zero, animated: false)
    }

    private var localKeyboardFrame: CGRect? {
        guard let keyboardFrame, let webView, let window = webView.window else { return nil }
        return window.screen.coordinateSpace.convert(keyboardFrame, to: webView)
    }

    private func requestViewport() {
        guard !viewportScheduled else { return }
        viewportScheduled = true
        DispatchQueue.main.async { [weak self] in
            self?.viewportScheduled = false
            self?.publishViewport()
        }
    }

    private func publishViewport() {
        guard let web = webView, web.window === view.window, web.bounds.height > 0 else { return }
        let localKeyboard = localKeyboardFrame
        let height = NativeViewport.availableHeight(bounds: web.bounds, keyboard: localKeyboard)
        // SwiftUI/WebKit may shrink the WebView to the keyboard edge before
        // this runs. Then comparing those two heights reports "closed" even
        // while the native input is editing. Use the controller's full view.
        let keyboardInView = keyboardFrame.flatMap { frame in
            view.window.map { $0.screen.coordinateSpace.convert(frame, to: view) }
        }
        let keyboardOverlap = keyboardInView.map { max(0, view.bounds.maxY - $0.minY) } ?? 0
        let open = keyboardOverlap > 40 && (keyboardInView?.width ?? 0) >= view.bounds.width * 0.8
        let top = view.safeAreaInsets.top
        let bottom = view.safeAreaInsets.bottom
        // Skip duplicate updates during keyboard animation and repeated layout passes.
        guard height != lastViewportHeight || web.bounds.height != lastViewportFullHeight || top != lastViewportTop || bottom != lastViewportBottom || open != lastViewportKeyboardOpen else { return }
        lastViewportHeight = height
        lastViewportFullHeight = web.bounds.height
        lastViewportTop = top
        lastViewportBottom = bottom
        lastViewportKeyboardOpen = open
        updateTopShade()
        updateNativeHeaderButtons()
        positionBurdenSearchField()
        let script = """
        if(document.documentElement){
          const root=document.documentElement;
          root.style.setProperty('--steady-safe-top','\(top)px');
          root.style.setProperty('--steady-safe-bottom','\(bottom)px');
          root.style.setProperty('--steady-tabbar','0px');
          root.dataset.nativeTabs='true';
          root.dataset.nativeSingleScreen='true';
          root.dataset.nativeHeader='true';
          root.dataset.nativeComposer='true';
          root.dataset.nativeKeyboard='\(open)';
          root.dataset.nativeAppHeight='\(height)';
          root.dataset.nativeViewportHeight='\(web.bounds.height)';
          window.dispatchEvent(new Event('resize'));
        }
        """
        web.evaluateJavaScript(script)
    }

    private func isTrusted(_ url: URL?) -> Bool {
        guard let url, url.isFileURL, let webRoot else { return false }
        return url.standardizedFileURL.path == webRoot.appendingPathComponent("index.html").standardizedFileURL.path
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if navigationAction.targetFrame?.isMainFrame != false && isTrusted(url) {
            if navigationAction.navigationType == .reload, let script = try? seededBridgeScript() {
                let controller = webView.configuration.userContentController
                controller.removeAllUserScripts()
                controller.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            }
            decisionHandler(.allow)
            return
        }
        // Only an actual activated link in the local page may leave Steady. Other
        // schemes, remote redirects, subframes and programmatic window.open are blocked.
        if navigationAction.navigationType == .linkActivated,
           navigationAction.sourceFrame.isMainFrame,
           isTrusted(navigationAction.sourceFrame.request.url),
           ["https", "http", "mailto"].contains(url.scheme?.lowercased() ?? "") {
            UIApplication.shared.open(url, options: [:]) { [weak self] opened in
                if !opened { self?.showMessage(title: "Couldn’t open that link", message: "Check your connection or available mail app, then try again.") }
            }
        }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        hideLoading()
        displayPreferencesChanged()
        // A replacement document has no viewport attributes, even when the
        // native frame is identical to the page that was just reloaded.
        lastViewportFullHeight = -1
        requestViewport()
        #if DEBUG
        // Simulator diagnostics only: a launch environment script, never in Release.
        if let d = ProcessInfo.processInfo.environment["STEADY_DRIVE"] {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
                self?.webView?.evaluateJavaScript(d)
            }
        }
        #endif
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { showLaunchError() } else { hideLoading() }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { showLaunchError() } else { hideLoading() }
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { openApp() }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        guard frame.isMainFrame, isTrusted(frame.request.url), presentedViewController == nil else { completionHandler(); return }
        let alert = UIAlertController(title: "Steady", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        guard frame.isMainFrame, isTrusted(frame.request.url), presentedViewController == nil else { completionHandler(false); return }
        let alert = UIAlertController(title: "Steady", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "Continue", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    private func syncAppIconAppearance() {
        let application = UIApplication.shared
        guard application.supportsAlternateIcons, !appIconChangePending else { return }
        // Keep the light glass tile independent of the in-app reading theme.
        let desired = "AppIconCleanGlass"
        guard application.alternateIconName != desired else { return }
        appIconChangePending = true
        application.setAlternateIconName(desired) { [weak self] error in
            DispatchQueue.main.async {
                self?.appIconChangePending = false
                if let error { NSLog("Steady icon appearance could not update: %@", error.localizedDescription) }
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, isTrusted(message.frameInfo.request.url),
              let payload = message.body as? [String: Any], let type = payload["type"] as? String else {
            replyHandler(nil, "This action is not available from that page.")
            return
        }
        do {
            switch type {
            case "persist":
                guard let raw = payload["snapshot"], JSONSerialization.isValidJSONObject(raw), let store else { throw LocalDataStore.StoreError.invalid }
                let data = try JSONSerialization.data(withJSONObject: raw)
                let snapshot = try JSONDecoder().decode(LocalDataStore.Snapshot.self, from: data)
                try store.save(snapshot)
            case "appearance":
                isDark = payload["dark"] as? Bool == true
                syncAppIconAppearance()
                nativeHeaderReady = true
                chatTopShadeGradient?.colors = chatTopShadeColors(dark: isDark)
                nativeBackButton?.overrideUserInterfaceStyle = isDark ? .dark : .light
                nativeBackButton?.tintColor = isDark ? .white : .black
                updateNativeSettingsTitle()
                let onChat = payload["chat"] as? Bool == true
                isShowingChat = onChat
                updateTopShade()
                burdenSearchField?.isHidden = !onChat
                if onChat {
                    webView?.evaluateJavaScript("window.SteadyBurdenComposer?.getDraft()") { [weak self] result, _ in
                        guard self?.isShowingChat == true else { return }
                        self?.burdenSearchField?.text = result as? String ?? ""
                        self?.updateBurdenSendButton()
                    }
                    positionBurdenSearchField()
                } else {
                    burdenSearchField?.resignFirstResponder()
                }
                if !onChat { replyOrganizer.cancel() }
                webView?.hidesFormAccessory = onChat
                // The status bar stays visible everywhere: time and battery
                // matter more than full-bleed immersion.
                hideStatusBar = false
                useLightStatusBar = isDark
                tabState.isDark = isDark
                hostingController?.overrideUserInterfaceStyle = isDark ? .dark : .light
                burdenSearchField?.overrideUserInterfaceStyle = isDark ? .dark : .light
                setBurdenPrompt(burdenSearchField?.attributedPlaceholder?.string ?? "Say it your way…",
                                saveReflection: (burdenSearchField?.rightView as? UIButton)?.accessibilityLabel == "Save reflection",
                                saveAction: (burdenSearchField?.rightView as? UIButton)?.accessibilityLabel == "Save action")
                (burdenSearchField?.leftView as? UIButton)?.tintColor = isDark ? .white : .black
                view.backgroundColor = isDark ? darkCanvas : lightCanvas
                webView?.backgroundColor = view.backgroundColor
                webView?.scrollView.backgroundColor = view.backgroundColor
                webView?.scrollView.isScrollEnabled = !onChat
                if onChat, let scrollView = webView?.scrollView { scrollViewDidScroll(scrollView) }
                loadingView?.backgroundColor = view.backgroundColor
                if errorView != nil {
                    // Rebuild the retry screen so its brand colors match the theme.
                    errorView?.removeFromSuperview()
                    errorView = nil
                    showLaunchError()
                }
                setNeedsStatusBarAppearanceUpdate()
                navigationController?.setNeedsStatusBarAppearanceUpdate()
                updateNativeHeaderButtons()
            case "markFrame":
                // Geometry only, never content: the page is already trusted as
                // the main frame, and this just moves a view.
                placeMark(x: payload["x"] as? CGFloat ?? 0,
                          y: payload["y"] as? CGFloat ?? 0,
                          size: payload["size"] as? CGFloat ?? 0,
                          dark: payload["dark"] as? Bool == true)
            case "showAnimalWheel":
                // The wheel draws the page's own registry; it never decides the
                // mode. SteadyAnimalChosen is the single place a choice is applied,
                // and it lives in the page, so the two layers cannot drift.
                presentAnimalWheel(payload["registry"] as? [String: Any] ?? [:])
            case "navigation":
                // The destination the page would return to, or nothing. Labels
                // arrive as plain text for a title, never as markup. The section
                // reflects the selected tab; routes without a tab leave the
                // selection where it is.
                let back = (payload["back"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                isShowingSettings = payload["settings"] as? Bool == true
                updateTopShade()
                applyNavigation(back: String(back.prefix(60)))
                updateNativeSettingsTitle()
                applySection(payload["section"] as? String ?? "")
            case "storageError":
                if !isShowingStorageError {
                    isShowingStorageError = true
                    showMessage(title: "Check your saved entries", message: "Steady couldn’t safely save or restore its on-device copy. Keep this screen open and export a backup from Settings if you can. Existing saved files have not been removed.")
                }
            case "diagLog":
                print("DIAG| \(payload["line"] as? String ?? "")")
            case "haptic":
                if !UIAccessibility.isReduceMotionEnabled { UISelectionFeedbackGenerator().selectionChanged() }
            case "focusAsk":
                guard isShowingChat else { throw LocalDataStore.StoreError.invalid }
                setBurdenPrompt(payload["prompt"] as? String ?? "", saveReflection: payload["saveReflection"] as? Bool == true, saveAction: payload["saveAction"] as? Bool == true)
                burdenSearchField?.becomeFirstResponder()
            case "setAskPrompt":
                guard isShowingChat else { throw LocalDataStore.StoreError.invalid }
                setBurdenPrompt(payload["prompt"] as? String ?? "", saveReflection: payload["saveReflection"] as? Bool == true, saveAction: payload["saveAction"] as? Bool == true)
            case "speak":
                guard let text = payload["text"] as? String, !text.isEmpty, text.count <= 2000,
                      let key = payload["key"] as? String, !key.isEmpty, key.count <= 160 else { throw LocalDataStore.StoreError.invalid }
                speak(text, key: key)
            case "stopSpeaking":
                stopSpeech()
            case "localAIStatus":
                replyHandler(replyOrganizer.status().bridgeValue, nil)
                return
            case "answerAsk":
                guard isShowingChat, let request = BurdenAskRequest(payload: payload) else {
                    replyHandler(["available": false], nil)
                    return
                }
                Task { [weak self, weak requestingWebView = message.webView] in
                    guard let self, self.isShowingChat, requestingWebView === self.webView,
                          UIApplication.shared.applicationState == .active else {
                        replyHandler(["requestId": request.requestId, "available": false], nil)
                        return
                    }
                    let result = await self.replyOrganizer.answer(request)
                    guard self.isShowingChat, requestingWebView === self.webView,
                          UIApplication.shared.applicationState == .active else {
                        replyHandler(["requestId": request.requestId, "available": false], nil)
                        return
                    }
                    replyHandler(result.bridgeValue, nil)
                }
                return
            case "organiseReply":
                guard isShowingChat, let request = BurdenReplyRequest(payload: payload) else {
                    replyHandler(["available": false], nil)
                    return
                }
                Task { [weak self, weak requestingWebView = message.webView] in
                    guard let self, self.isShowingChat, requestingWebView === self.webView,
                          UIApplication.shared.applicationState == .active else {
                        replyHandler(["requestId": request.requestId, "available": false], nil)
                        return
                    }
                    let result = await self.replyOrganizer.organise(request)
                    replyHandler(result.bridgeValue, nil)
                }
                return
            case "interpretAsk":
                guard isShowingChat, let request = BurdenInterpretationRequest(payload: payload) else {
                    replyHandler(["available": false], nil)
                    return
                }
                Task { [weak self, weak requestingWebView = message.webView] in
                    guard let self, self.isShowingChat, requestingWebView === self.webView,
                          UIApplication.shared.applicationState == .active else {
                        replyHandler(["requestId": request.requestId, "available": false], nil)
                        return
                    }
                    let result = await self.replyOrganizer.interpret(request)
                    replyHandler(result.bridgeValue, nil)
                }
                return
            case "extractMemory":
                guard isShowingChat, let request = BurdenMemoryRequest(payload: payload) else {
                    replyHandler(["available": false, "notes": []], nil)
                    return
                }
                Task { [weak self, weak requestingWebView = message.webView] in
                    guard let self, self.isShowingChat, requestingWebView === self.webView,
                          UIApplication.shared.applicationState == .active else {
                        replyHandler(["requestId": request.requestId, "available": false, "notes": []], nil)
                        return
                    }
                    let result = await self.replyOrganizer.extractMemory(request)
                    replyHandler(result.bridgeValue, nil)
                }
                return
            case "exportBackup":
                guard let text = payload["text"] as? String else { throw LocalDataStore.StoreError.invalid }
                try shareBackup(text)
            case "importBackup":
                guard presentedViewController == nil else { throw LocalDataStore.StoreError.invalid }
                let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.json], asCopy: true)
                picker.delegate = self
                picker.allowsMultipleSelection = false
                present(picker, animated: true)
            default:
                throw LocalDataStore.StoreError.invalid
            }
            replyHandler(true, nil)
        } catch { replyHandler(nil, error.localizedDescription) }
    }

    private func shareBackup(_ text: String) throws {
        guard presentedViewController == nil, let data = text.data(using: .utf8), data.count <= LocalDataStore.maximumBytes,
              (try? JSONSerialization.jsonObject(with: data)) != nil else { throw LocalDataStore.StoreError.invalid }
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("SteadyExport-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: false, attributes: [.protectionKey: FileProtectionType.complete])
        let url = folder.appendingPathComponent("Steady-backup.json")
        try data.write(to: url, options: [.atomic, .completeFileProtection])
        let share = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        share.excludedActivityTypes = [.postToFacebook, .postToTwitter, .postToWeibo, .postToTencentWeibo]
        share.popoverPresentationController?.sourceView = view
        share.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        share.completionWithItemsHandler = { _, _, _, _ in try? FileManager.default.removeItem(at: folder) }
        present(share, animated: true)
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let url = urls.first else { return }
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        do {
            let resource = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
            guard resource.isRegularFile == true, let size = resource.fileSize, size <= LocalDataStore.maximumBytes else { throw LocalDataStore.StoreError.tooLarge }
            let data = try Data(contentsOf: url)
            guard data.count <= LocalDataStore.maximumBytes, let text = String(data: data, encoding: .utf8) else { throw LocalDataStore.StoreError.invalid }
            // Wait for the picker to disappear so the web import's native confirmation
            // can be presented. Arguments are data, never executable source.
            controller.dismiss(animated: true) { [weak self] in
                self?.webView?.callAsyncJavaScript("return await window.SteadyData.receiveImport(text);", arguments: ["text": text], in: nil, in: .page) { [weak self] result in
                    if case .failure = result { self?.showMessage(title: "Backup not imported", message: "Steady couldn’t import this file. Check that it is a Steady JSON backup and try again.") }
                }
            }
        } catch { showMessage(title: "Backup not imported", message: error.localizedDescription) }
    }

    // MARK: - Who is helping

    /// The registry the page sent, turned into something drawable.
    ///
    /// Artwork is addressed by the same relative path the page uses, resolved
    /// inside the bundled content, so there is one copy of every portrait and
    /// the wheel can only ever show the artwork the page pointed at.
    private func animalEntries(from registry: [String: Any]) -> [AnimalEntry] {
        // Elements are converted one at a time rather than casting the whole
        // array at once: the registry arrives as a plist-bridged object graph, and
        // a single conditional cast over a nested collection is exactly the kind
        // of thing that comes back nil for no visible reason.
        let list = (registry["animals"] as? [Any]) ?? []
        let raw: [[String: Any]] = list.compactMap { $0 as? [String: Any] }
        guard !raw.isEmpty, let webRoot else { return [] }
        return raw.compactMap { item -> AnimalEntry? in
            guard let id = item["id"] as? String, let name = item["name"] as? String else { return nil }
            let role = item["role"] as? String ?? ""
            var image: UIImage?
            if let path = item["artwork"] as? String {
                let relative = path.hasPrefix("./") ? String(path.dropFirst(2)) : path
                // A path that tries to leave the bundled content is not a picture.
                guard !relative.hasPrefix(".."), !relative.hasPrefix("/") else { return nil }
                let url = webRoot.appendingPathComponent(relative)
                if let data = try? Data(contentsOf: url), let loaded = UIImage(data: data) {
                    image = loaded
                }
            }
            return AnimalEntry(id: id, name: name, role: role, image: image)
        }
    }

    private func presentAnimalWheel(_ registry: [String: Any]) {
        let entries = animalEntries(from: registry)
        let current = (registry["current"] as? String) ?? ""
        let isAutomatic = (registry["mode"] as? String) != "manual"
        guard !entries.isEmpty, presentedViewController == nil, isShowingChat else { return }
        let wheel = AnimalWheelView(animals: entries, current: current, isAutomatic: isAutomatic, isDark: isDark) { [weak self] choice in
            // The wheel does not apply anything. It reports what was chosen, and
            // the page applies it, so the mode has exactly one owner.
            self?.chooseAnimal(choice)
        } onClose: { [weak self] in
            self?.hideAnimalBackdrop()
        }
        let host = UIHostingController(rootView: wheel)
        // The sheet follows the app's own appearance, not the device's. Without
        // this the sheet's own text colours are chosen for the system appearance
        // and end up dark ink on the app's dark surface.
        host.overrideUserInterfaceStyle = isDark ? .dark : .light
        host.view.backgroundColor = SteadyPalette.canvas(dark: isDark)
        host.modalPresentationStyle = .formSheet
        host.isModalInPresentation = true
        if let sheet = host.sheetPresentationController {
            sheet.detents = [.custom(identifier: .init("animalWheel")) { context in
                min(610, context.maximumDetentValue)
            }]
            sheet.prefersScrollingExpandsWhenScrolledToEdge = false
            // The only pull target is the handle inside the wheel. Swiping an
            // animal cannot move or dismiss the sheet itself.
            sheet.prefersGrabberVisible = false
        }
        host.presentationController?.delegate = self
        showAnimalBackdrop()
        present(host, animated: true)
    }

    private func showAnimalBackdrop() {
        animalBackdrop?.removeFromSuperview()
        let style: UIBlurEffect.Style = isDark ? .systemThinMaterialDark : .systemThinMaterialLight
        let backdrop = UIVisualEffectView(effect: UIBlurEffect(style: style))
        let backdropHost = tabBarController?.view ?? view!
        backdrop.frame = backdropHost.bounds
        backdrop.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        backdrop.isUserInteractionEnabled = false
        backdrop.alpha = 0
        backdropHost.addSubview(backdrop)
        animalBackdrop = backdrop
        UIView.animate(withDuration: 0.32, delay: 0, options: [.beginFromCurrentState, .curveEaseOut]) {
            backdrop.alpha = 1
        }
    }

    private func hideAnimalBackdrop() {
        guard let backdrop = animalBackdrop else { return }
        animalBackdrop = nil
        UIView.animate(withDuration: 0.28, delay: 0, options: [.beginFromCurrentState, .curveEaseInOut]) {
            backdrop.alpha = 0
        } completion: { _ in
            backdrop.removeFromSuperview()
        }
    }

    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        hideAnimalBackdrop()
    }

    private func chooseAnimal(_ choice: String?) {
        UISelectionFeedbackGenerator().selectionChanged()
        // Encode the ID itself. Wrapping it in an array passes ["owl"] to
        // JavaScript, which cannot match the string IDs in SteadyAnimals.
        guard let data = try? JSONEncoder().encode(choice ?? "auto"),
              let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript(
            "window.SteadyAnimalChosen && window.SteadyAnimalChosen(\(json));",
            in: nil, in: .page
        )
    }

    private func showMessage(title: String, message: String) {
        guard presentedViewController == nil, view.window != nil else { return }
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    // Spoken answers use the on-device speech synthesizer with word ranges
    // forwarded to the web view for highlighting. No audio leaves the device.
    // Speech follows the mute switch; nothing is recorded.
    private func speak(_ text: String, key: String) {
        speechSynthesizer.stopSpeaking(at: .immediate)
        speechKey = key
        let utterance = AVSpeechUtterance(string: text)
        speechSynthesizer.speak(utterance)
    }

    private func stopSpeech() {
        speechKey = nil
        if speechSynthesizer.isSpeaking { speechSynthesizer.stopSpeaking(at: .immediate) }
    }

    @objc private func cancelReplyGeneration() {
        replyOrganizer.cancel()
    }

    private func publishSpeechRange(key: String?, location: Int, length: Int) {
        var encoded = "null"
        if let key, let data = try? JSONSerialization.data(withJSONObject: [key]),
           let json = String(data: data, encoding: .utf8) { encoded = json }
        webView?.evaluateJavaScript("window.SteadySpeechRange(\(encoded),\(location),\(length));")
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, willSpeakRangeOfSpeechString range: NSRange, utterance: AVSpeechUtterance) {
        guard let key = speechKey else { return }
        publishSpeechRange(key: key, location: range.location, length: range.length)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        publishSpeechRange(key: nil, location: -1, length: 0)
        speechKey = nil
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        speechKey = nil
    }
}

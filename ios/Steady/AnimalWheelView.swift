import SwiftUI
import UIKit

/// One animal as the page described it.
///
/// The registry arrives by value from `SteadyAnimals.describe()`, so this is a
/// copy of the same list the router routes with. It cannot name an animal
/// differently from the one that would actually be chosen, and it cannot invent
/// one: an entry the page did not send is simply not shown.
struct AnimalEntry: Identifiable, Equatable {
    let id: String
    let name: String
    let role: String
    let image: UIImage?

    init?(id: String, name: String, role: String, image: UIImage?) {
        guard !id.isEmpty, !name.isEmpty else { return nil }
        self.id = id
        self.name = name
        // One short line, said in Steady's voice. Never a paragraph.
        self.role = role.count <= 120 ? role : String(role.prefix(117)) + "..."
        self.image = image
    }
}

/// One animal's place on the ring, and everything that follows from it.
///
/// All five numbers come out of the same angle on the same circle. Nothing here
/// is eased, blended or animated on its own; the perspective divide that decides
/// how big a portrait is drawn is the same divide that decides where it sits and
/// how clearly it is drawn, so an animal cannot be small in one place, large in
/// another, or fade on a different schedule from the one it moves on.
///
/// Depth itself is not carried. It is the quantity the divide consumes, and once
/// it has been divided into size, clarity and draw order there is nothing left
/// for it to do that those three do not already say.
private struct Placement {
    /// Across the screen, measured from the centre of the ring.
    let x: CGFloat
    /// Down the screen, measured from the front of the ring. The circle stands
    /// tilted, so the far side rides higher: back animals are up as well as
    /// small, front animals are down as well as large, and turning the ring
    /// traces a true ellipse rather than a sideways slide.
    let y: CGFloat
    /// The perspective divide, as a multiplier on the portrait's true size.
    let scale: CGFloat
    /// The same divide read as opacity, so an animal going away dims at the rate
    /// it shrinks. Floor is deliberate: the animal furthest back stays faintly
    /// present rather than vanishing and leaving a hole in the ring.
    let clarity: CGFloat
    /// Drawing order, straight off the depth. The animal nearest the camera is
    /// the one drawn last, so the ring is stacked in the order it is seen in.
    let facing: CGFloat
}

/// SwiftUI interpolates this one angle before the ring is drawn. Animating the
/// portraits' offsets separately would move them along straight chords, while
/// the title would already show the destination animal. Feeding the displayed
/// angle back through the geometry keeps portraits and words on the same frame.
private struct AnimatedWheelPosition<Content: View>: View, Animatable {
    var position: CGFloat
    let content: (CGFloat) -> Content

    init(position: CGFloat, @ViewBuilder content: @escaping (CGFloat) -> Content) {
        self.position = position
        self.content = content
    }

    var animatableData: CGFloat {
        get { position }
        set { position = newValue }
    }

    var body: some View { content(position) }
}

/// The ring of animals.
///
/// Automatic Mode is not an animal, so it is not on the ring. It is its own
/// explicit control underneath, because "let Steady choose" and "I want the fox"
/// are two different decisions and must not sit one tap apart.
///
/// # The geometry
///
/// The animals are physically placed around one invisible circle lying in a
/// horizontal plane, tipped slightly toward the viewer like a carousel, and
/// the whole ring turns about its centre.
///
/// There is a single number for that turn -- `position`, in degrees -- and every
/// property of every animal is read from it. `angle(for:)` gives an animal the
/// one angle it stands at, and that angle is the sole input to where it sits
/// on the screen's ellipse, how deep it is, how large it is drawn, how clearly it is
/// drawn and which animal is in front. Nothing moves on its own timeline and
/// nothing is offset by a hand-tuned constant, so an animal cannot drift out of
/// the ring, change orbit, or snap somewhere the geometry did not put it.
///
/// The angle is deliberately *not* folded into a single turn. It travels without
/// bound while the ring turns, and folding it mid-turn is what used to empty the
/// ring after about six steps in one direction while the caption carried on
/// naming animals that were no longer drawn. `sin` and `cos` are periodic, so an
/// unbounded angle is continuous through every crossing of the fold. Resting
/// places are calculated relative to the current turn so no fold is needed.
///
/// # Why the projection is worked out here
///
/// The divide that makes the far side of the ring recede is applied once, in
/// `placement(for:)`, rather than left to `rotation3DEffect`.
///
/// SwiftUI rasterises each view in two dimensions and gives a `rotation3DEffect`
/// its own projection matrix, but that matrix applies to the view it is on, not
/// independently to each child inside it. A child placed further back does not
/// get its own divide: a ring built out of `offset(z:)` plus a rotated parent
/// therefore laid its animals out correctly and then drew every one of them at
/// the same size, which is a tilted row of pictures rather than a circle.
///
/// Worse, the two rotations that way compose additively about the same centre, so
/// a parent turning by `position` while each child had already turned by
/// `index * step - position` summed to `index * step` -- a constant. The ring did
/// not turn at all. The animals only changed size, sitting still while they grew
/// and shrank, which is exactly the "moving sideways" reading this replaced.
///
/// So the ring is projected by hand, here, from the same circle the drag turns.
/// The result is a real circle: every portrait is one radius from the centre at
/// all times, an animal swinging towards you is genuinely nearer the camera, and
/// one going away recedes by the same divide rather than by a second animation.
///
/// # The feel
///
/// A drag turns the ring at the speed the finger is actually moving the rim --
/// the arc under the finger, one radius to the turn -- so the wheel is under the
/// hand rather than chasing it. On release the ring keeps the flick the person
/// made and coasts to rest with an animal squarely in front.
///
/// The ring is correct from the first frame. It opens turned to whichever animal
/// is already helping, as the initial value of the one number rather than
/// something set once the view appears, so the choice is in the centre before
/// anything is touched and the ring is never seen swinging into place.
///
/// Under Reduce Motion the ring is replaced by stepping round it, never removed:
/// which animal is helping is information, not decoration.
struct AnimalWheelView: View {
    let animals: [AnimalEntry]
    let current: String
    let isAutomatic: Bool
    let isDark: Bool
    let onChoose: (String?) -> Void
    let onClose: () -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// The whole ring, in degrees. The only number the geometry is built from.
    @State private var position: CGFloat = 0
    /// Where the ring stood when this drag started, so the finger is measured
    /// from one point rather than accumulated change by change.
    @State private var grabOrigin: CGFloat = 0
    @State private var grabbing = false
    @State private var automaticSelected = true
    @State private var committedID: String
    @State private var confirmingID: String?
    @State private var holdProgress: CGFloat = 0

    /// The radius of the invisible ring. Every animal is exactly this far from
    /// the centre at every moment, which is what guarantees a constant orbit.
    private let radius: CGFloat = 112
    /// How far the ring tips toward the viewer. The circle stands in a
    /// horizontal plane seen slightly from the front, so its screen image is an
    /// ellipse this fraction as tall as it is wide. Small on purpose: the tilt
    /// is a depth cue, not the show.
    private let tilt: CGFloat = 0.22
    /// Where the eye is, in front of the screen plane. Perspective is this over
    /// this plus the animal's depth, so one number decides how much the far side
    /// of the ring recedes. Far enough back that the effect is a cue rather than
    /// a trick.
    private let eye: CGFloat = 600
    /// The size of the portrait at the front of the ring. Everything further
    /// back is this multiplied by the divide, so the ring is one object measured
    /// against itself rather than four sizes set by hand.
    private let portraitSize: CGFloat = 100
    /// How far the far side of the ring rides above the front, in points.
    private var rise: CGFloat { 2 * radius * tilt }
    /// The far-side portrait's scale, from the same divide as everything else.
    private var backScale: CGFloat { eye / (eye + 2 * radius) }
    /// The ellipse sits low in its frame -- the front portrait hangs below the
    /// front point by half its size, while the back one rises above it -- so the
    /// whole travel is nudged down until the highest top and the lowest bottom
    /// sit equidistant from the frame's centre. Read from the same constants as
    /// the geometry, so the ring can never drift off-centre.
    private var lift: CGFloat { (rise + backScale * portraitSize / 2 - portraitSize / 2) / 2 }

    /// A full turn is a whole cycle, so there is always one animal on each side
    /// of the front one and the spacing never drifts as the ring is turned.
    private var step: Double { 360 / Double(max(animals.count, 1)) }

    init(animals: [AnimalEntry], current: String, isAutomatic: Bool, isDark: Bool,
         onChoose: @escaping (String?) -> Void, onClose: @escaping () -> Void) {
        self.animals = animals
        self.current = current
        self.isAutomatic = isAutomatic
        self.isDark = isDark
        self.onChoose = onChoose
        self.onClose = onClose
        // The ring opens turned to the animal that is already helping, as the
        // initial value rather than a correction in onAppear. onAppear is not
        // guaranteed to run before the first frame is shown, so setting it there
        // is setting it too late: the wheel could be drawn once already facing
        // the wrong way, with the correct animal already sliding towards the
        // centre. Starting turned is what makes the perspective right from the
        // first frame instead of arriving a frame or two late.
        let index = animals.firstIndex { $0.id == current } ?? 0
        // The front of the ring is angle zero, and an animal's angle is its own
        // step plus the turn, so the animal already helping stands at zero when
        // the turn is the negation of its step. The sign matters: the positive
        // multiple parks the mirror animal at the front instead.
        let opening = -CGFloat(Double(index) * (360 / Double(max(animals.count, 1))))
        _position = State(initialValue: opening)
        _grabOrigin = State(initialValue: opening)
        _automaticSelected = State(initialValue: isAutomatic)
        _committedID = State(initialValue: current)
    }

    // ------------------------------------------------------------ geometry --

    /// How far the finger has to travel to turn the ring by so many degrees.
    ///
    /// This is the arc under a point on the rim, so the drag is a rigid grab on
    /// the ring rather than a scaled-down copy of it: one animal is one eighth
    /// of a turn of the circle, and it takes that much finger to do it.
    private func turn(_ points: CGFloat) -> CGFloat { points / radius * 180 / .pi }

    /// Where one animal stands, in degrees. Unwrapped on purpose, and the only
    /// input to everything that animal does.
    private func angle(for n: Int, at displayedPosition: CGFloat) -> CGFloat {
        CGFloat(Double(n) * step) + displayedPosition
    }

    /// The one projection, from the one angle, onto the one circle.
    private func placement(for n: Int, at displayedPosition: CGFloat) -> Placement {
        let a = Double(angle(for: n, at: displayedPosition)) * .pi / 180
        // Around the circle, and one radius behind the screen plane at the front.
        let x = radius * CGFloat(sin(a))
        let depth = radius * (1 - CGFloat(cos(a)))
        // The tilt lays the circle down: at the front the depth is zero and the
        // animal sits on the ring's near edge; at the back the full diameter
        // lifts it by the rise. Across against down this is an exact ellipse,
        // (x/R)^2 + ((y + rise/2)/(rise/2))^2 = 1, so every animal travels one
        // closed loop and the loop never changes shape.
        let y = -depth * tilt + lift
        // The perspective divide, and the only place depth becomes size.
        let scale = eye / (eye + depth)
        // The same divide read as opacity. Keyed off depth rather than scale so
        // the fade is even across the ring rather than bunched at the front, and
        // floored so the far side recedes instead of disappearing.
        let recede = min(1, max(0, depth / (2 * radius)))
        return Placement(x: x, y: y, scale: scale,
                         clarity: 0.34 + 0.66 * (1 - recede), facing: -depth)
    }

    /// The resting place on the ring nearest a given turn.
    private func nearestRest(to p: CGFloat) -> CGFloat {
        let by = CGFloat(step)
        return (p / by).rounded() * by
    }

    /// The animal at the centre, and therefore the one a tap would take. Read
    /// from the one position, so the picture, the caption and the tap target
    /// cannot disagree about which animal that is.
    private func front(at displayedPosition: CGFloat) -> Int {
        let count = max(animals.count, 1)
        guard count > 1 else { return 0 }
        let nearest = Int((Double(-displayedPosition) / step).rounded())
        return ((nearest % count) + count) % count
    }

    // ------------------------------------------------------------- drawing --

    private var ring: some View {
        AnimatedWheelPosition(position: position) { displayedPosition in
            let selected = front(at: displayedPosition)
            VStack(spacing: 14) {
                ZStack {
                    ForEach(Array(animals.enumerated()), id: \.element.id) { n, animal in
                        let place = placement(for: n, at: displayedPosition)
                        Portrait(animal: animal, size: portraitSize * place.scale, clarity: place.clarity, isDark: isDark)
                        .scaleEffect(confirmingID == animal.id ? 1.14 : 1)
                        .overlay(alignment: .bottomTrailing) {
                            if confirmingID == animal.id {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 25, weight: .semibold))
                                    .foregroundStyle(Color(uiColor: SteadyPalette.accent))
                                    .background(Circle().fill(Color(uiColor: SteadyPalette.canvas(dark: isDark))))
                                    .transition(.scale(scale: 0.4).combined(with: .opacity))
                            }
                        }
                        .animation(.spring(response: 0.3, dampingFraction: 0.66), value: confirmingID)
                        .contentShape(Rectangle())
                        // Portraits preview the ring. The single hold control
                        // below is the only touch confirmation, so a pause
                        // during a swipe cannot choose an animal by accident.
                        .offset(x: place.x, y: place.y)
                        .zIndex(place.facing)
                        .accessibilityLabel(animal.name + ". " + animal.role)
                        .accessibilityHint(n == selected ? "Use the hold control below to choose " + animal.name : "Swipe the wheel to bring " + animal.name + " to the front")
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: portraitSize * 1.6)
                VStack(spacing: 4) {
                    Text(animals.indices.contains(selected) ? animals[selected].name : "")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    Text(animals.indices.contains(selected) ? animals[selected].role : "")
                        .font(.subheadline)
                        .foregroundStyle(Color(uiColor: SteadyPalette.secondaryInk(dark: isDark)))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(animals.indices.contains(selected) ? (automaticSelected ? "Automatic is on" : committedID == animals[selected].id ? "Currently selected" : "Preview only") : "")
                        .font(.caption)
                        .foregroundStyle(Color(uiColor: SteadyPalette.secondaryInk(dark: isDark)))
                }
                .frame(maxWidth: 320, minHeight: 72)
                .padding(.horizontal, 8)
                .frame(maxWidth: .infinity)
                .accessibilityHidden(true)
                if animals.indices.contains(selected) {
                    let animal = animals[selected]
                    Text(confirmingID == nil ? "Press and hold to choose \(animal.name)" : "\(animal.name) selected")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color(uiColor: SteadyPalette.accent))
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(alignment: .leading) {
                            GeometryReader { proxy in
                                Capsule().fill(Color(uiColor: SteadyPalette.accent).opacity(0.16))
                                    .frame(width: proxy.size.width * holdProgress)
                            }
                            .clipShape(Capsule())
                        }
                        .overlay(Capsule().stroke(Color(uiColor: SteadyPalette.accent).opacity(0.55), lineWidth: 1))
                        .contentShape(Capsule())
                        .onLongPressGesture(minimumDuration: 0.65, maximumDistance: 15, pressing: { pressed in
                            withAnimation(pressed ? .linear(duration: 0.65) : .easeOut(duration: 0.16)) {
                                holdProgress = pressed ? 1 : 0
                            }
                        }, perform: {
                            guard !grabbing, confirmingID == nil,
                                  abs(displayedPosition - nearestRest(to: displayedPosition)) < 6 else { return }
                            choose(animal)
                        })
                        .accessibilityAddTraits(.isButton)
                        .accessibilityHint("Double tap to use \(animal.name)")
                        .accessibilityAction(.default) { choose(animal) }
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Choose an answer style")
        .accessibilityAdjustableAction { direction in
            guard animals.count > 1 else { return }
            // VoiceOver cannot drag, so the wheel steps round instead. A whole
            // step at a time, which is always already a resting place.
            let by = CGFloat(step)
            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.22)) {
                position += direction == .increment ? by : -by
            }
        }
        .gesture(gesture)
    }

    /// Turning the ring. A drag carries the finger directly, one radius of
    /// circle to one radius of travel, so the ring is under the hand rather than
    /// chasing it; the release hands over to momentum, which decays on its own
    /// until the ring settles with an animal squarely in front.
    private var gesture: some Gesture {
        DragGesture(minimumDistance: 4)
            .onChanged { value in
                // Under Reduce Motion the ring does not turn, and the ring's own
                // adjustable action is the way round it.
                guard !reduceMotion, confirmingID == nil else { return }
                if !grabbing {
                    // One origin per drag, so the position is read rather than
                    // accumulated, and a dropped frame cannot leave the ring
                    // somewhere the finger never passed.
                    grabbing = true
                    grabOrigin = position
                }
                position = grabOrigin + turn(value.translation.width)
            }
            .onEnded { value in
                guard !reduceMotion, confirmingID == nil else { return }
                grabbing = false
                // Limit the throw to roughly one or two animals. An isolated
                // velocity spike should not send the whole ring whipping around.
                let launch = min(650, max(-650, turn(value.velocity.width)))
                let projected = turn(value.predictedEndTranslation.width - value.translation.width)
                let horizon = launch * CGFloat(coastHorizon)
                // The system prediction is useful, but can vary sharply from
                // one release to the next. Blend a bounded, same-direction part
                // of it with the measured speed for a consistent handoff.
                let alignedProjection = projected * launch > 0
                    ? min(abs(projected), abs(horizon) * 1.5) * (launch < 0 ? -1 : 1)
                    : 0
                let travel = horizon * 0.7 + alignedProjection * 0.3
                coast(to: position + travel, launch: launch)
            }
    }

    /// How long the coast is read as running before deciding where it stops.
    /// Tuned to the spring below: the ring has very nearly arrived after this.
    private let coastHorizon: TimeInterval = 0.20

    /// The coast, and the gentle settling. One animation does both: the ring
    /// keeps the speed it was let go with, and because the rest place is the
    /// animal nearest the front, it always comes to rest with an animal squarely
    /// in front rather than between two.
    ///
    /// Launched at the speed the flick was let go with, which is what makes a
    /// flick carry rather than ease in from a standstill. Just shy of critically
    /// damped, so it arrives quickly and only just overshoots: enough to feel
    /// physical, not enough to bounce.
    private func coast(to landing: CGFloat, launch: CGFloat) {
        // Landing already includes the signed flick travel. Folding it to the
        // nearest equivalent turn reverses a throw that crosses half a circle.
        let target = nearestRest(to: landing)
        let distance = target - position
        guard abs(distance) > 0.01 else { return }
        guard !reduceMotion else { position = target; return }
        // SwiftUI's initialVelocity is measured in animation distances per
        // second, not degrees per second. Passing the raw drag velocity made
        // the spring leap far beyond its target before snapping back.
        let springVelocity = min(2.5, max(-2.5, launch / distance))
        withAnimation(.interpolatingSpring(mass: 1, stiffness: 105, damping: 19,
                                          initialVelocity: Double(springVelocity))) {
            position = target
        }
    }

    var body: some View {
        VStack(spacing: 16) {
            Capsule()
                .fill(Color(uiColor: SteadyPalette.secondaryInk(dark: isDark)).opacity(0.5))
                .frame(width: 38, height: 5)
                .frame(maxWidth: .infinity, minHeight: 28)
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 8).onEnded { value in
                    if value.translation.height > 55 || value.predictedEndTranslation.height > 100 {
                        close()
                    }
                })
                .accessibilityLabel("Pull down to close")
                .accessibilityAddTraits(.isButton)
                .accessibilityAction(.default) { close() }
            Text("Answer style")
                .font(.title2.weight(.semibold))
            ring
            Button {
                if automaticSelected {
                    // A preview is not a choice. Turning Automatic off holds
                    // the helper already active, even if another is in front.
                    guard let index = animals.firstIndex(where: { $0.id == committedID }) else { return }
                    automaticSelected = false
                    onChoose(committedID)
                    let turn = CGFloat(Double(index) * step)
                    withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.32)) {
                        position = ((position + turn) / 360).rounded() * 360 - turn
                    }
                } else {
                    automaticSelected = true
                    committedID = animals.first?.id ?? current
                    onChoose(nil)
                    // Automatic starts with Burden. Keep the visible wheel in
                    // sync with the helper the page now shows.
                    withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.32)) {
                        position = (position / 360).rounded() * 360
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: automaticSelected ? "checkmark.circle.fill" : "circle")
                    Text("Automatic")
                }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 48)
                .foregroundStyle(automaticSelected ? (isDark ? Color.black : Color.white) : Color(uiColor: SteadyPalette.accent))
                .background(Capsule().fill(automaticSelected ? Color(uiColor: SteadyPalette.accent) : Color.clear))
                .overlay(Capsule().stroke(Color(uiColor: SteadyPalette.accent), lineWidth: 1.5))
            }
            .buttonStyle(.plain)
            .disabled(confirmingID != nil)
            .accessibilityLabel("Automatic")
            // Whether Automatic is on is the one thing a person cannot see from
            // the ring itself, so it is stated rather than left to the tick.
            .accessibilityValue(automaticSelected ? "On" : "Off")
            .accessibilityHint(automaticSelected ? "Turn off and keep the animal already helping" : "Let Steady choose who helps")
            Button("Close") { close() }
                .font(.subheadline.weight(.medium))
                .frame(minWidth: 88, minHeight: 44)
                .tint(Color(uiColor: SteadyPalette.accent))
                .disabled(confirmingID != nil)
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        // The sheet is the app's own surface, in the app's own appearance, rather
        // than the system's default grouped grey.
        .background(Color(uiColor: SteadyPalette.canvas(dark: isDark)))
    }

    private func close() {
        onClose()
        dismiss()
    }

    private func choose(_ animal: AnimalEntry) {
        guard animals.contains(animal), confirmingID == nil else { return }
        withAnimation(.spring(response: 0.3, dampingFraction: 0.66)) {
            confirmingID = animal.id
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        onChoose(animal.id)
        DispatchQueue.main.asyncAfter(deadline: .now() + (reduceMotion ? 0.15 : 0.48)) {
            close()
        }
    }
}

/// One animal, placed on the ring.
///
/// The portraits are painted cutouts. Keep their edges smoothly sampled as
/// they move through the changing perspective, without a second scale effect.
///
/// The size the ring asks for is handed straight to the image as the size it is
/// drawn at, rather than reached with a `scaleEffect` on top of a fixed frame.
/// Drawing at the size asked for makes the whole set consistent at each depth.
///
/// The ring turns the animals around a circle; it does not turn the animals
/// themselves, so nothing is ever seen edge-on, sheared or warped. A portrait
/// always faces the viewer square, and only its size and clarity change with
/// depth.
private struct Portrait: View {
    let animal: AnimalEntry
    let size: CGFloat
    let clarity: CGFloat
    let isDark: Bool

    private var glow: Color {
        let index: Int
        switch animal.id {
        case "owl": index = 0
        case "tortoise": index = 1
        case "fox": index = 3
        default: index = 2
        }
        return Color(uiColor: SteadyPalette.hues[index])
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(RadialGradient(colors: [glow.opacity((isDark ? 0.16 : 0.10) * clarity), .clear],
                                     center: .center, startRadius: 0, endRadius: size * 0.75))
                .frame(width: size * 1.55, height: size * 1.55)
                .accessibilityHidden(true)
            Group {
                if let image = animal.image {
                    Image(uiImage: image)
                        .resizable()
                        .interpolation(.high)
                        .aspectRatio(contentMode: .fit)
                } else {
                    Image(systemName: "questionmark")
                        .resizable()
                        .interpolation(.high)
                        .aspectRatio(contentMode: .fit)
                        .foregroundStyle(Color(uiColor: SteadyPalette.secondaryInk(dark: isDark)))
                }
            }
            .frame(width: size, height: size)
            .shadow(color: .black.opacity(isDark ? 0.35 : 0.20), radius: size * 0.09, y: size * 0.05)
        }
        .frame(width: size, height: size)
        .opacity(clarity)
        .accessibilityHidden(true)
    }
}

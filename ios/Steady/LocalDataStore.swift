import Foundation

/// A second, app-owned copy protects entries if WebKit changes a file origin on update.
/// It is local, excluded from cloud/device backups, and never used as telemetry.
final class LocalDataStore {
    static let keys: Set<String> = ["steady.v1", "steady.settings", "steady.reading", "steady.theme", "steadyTasks", "steadyReflection", "steady.reminded", "steady.animal"]
    static let maximumBytes = 12 * 1024 * 1024

    struct Snapshot: Codable {
        let version: Int
        let revision: Int64
        let values: [String: String]
    }

    enum StoreError: LocalizedError {
        case unreadable, invalid, tooLarge
        var errorDescription: String? {
            switch self {
            case .unreadable: return "Steady could not read its saved entries. The existing file has not been changed. Close and reopen the app to try again."
            case .invalid: return "Steady could not safely save these entries. Existing saved entries have not been changed."
            case .tooLarge: return "These entries are too large to save. Export a copy before making further changes."
            }
        }
    }

    let directory: URL
    private let file: URL
    private(set) var snapshot: Snapshot?
    private(set) var readError: Error?

    init(directory: URL) throws {
        self.directory = directory
        file = directory.appendingPathComponent("entries-v1.json")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
        var excluded = directory
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try excluded.setResourceValues(values)
        guard FileManager.default.fileExists(atPath: file.path) else { return }
        do {
            let data = try Data(contentsOf: file)
            guard data.count <= Self.maximumBytes else { throw StoreError.tooLarge }
            let decoded = try JSONDecoder().decode(Snapshot.self, from: data)
            try Self.validate(decoded)
            snapshot = decoded
        } catch {
            // Never replace a corrupt or temporarily locked file with empty state.
            readError = StoreError.unreadable
        }
    }

    static func validate(_ snapshot: Snapshot) throws {
        guard snapshot.version == 1, snapshot.revision >= 0,
              snapshot.revision <= 9_007_199_254_740_990,
              Set(snapshot.values.keys).isSubset(of: keys) else { throw StoreError.invalid }
        guard snapshot.values.reduce(0, { $0 + $1.key.utf8.count + $1.value.utf8.count }) <= maximumBytes else { throw StoreError.tooLarge }
        if let raw = snapshot.values["steady.v1"] {
            guard let data = raw.data(using: .utf8),
                  let state = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  state["days"] is [String: Any] else { throw StoreError.invalid }
        }
    }

    func save(_ incoming: Snapshot) throws {
        if let readError { throw readError }
        try Self.validate(incoming)
        if let snapshot, incoming.revision < snapshot.revision { throw StoreError.invalid }
        let data = try JSONEncoder().encode(incoming)
        guard data.count <= Self.maximumBytes else { throw StoreError.tooLarge }
        try data.write(to: file, options: [.atomic, .completeFileProtection])
        snapshot = incoming
    }

    /// Refresh only public app resources. The stable directory keeps file-origin storage
    /// consistent across releases; the separate entries file is never touched here.
    func installWebContent(from source: URL) throws -> URL {
        let destination = directory.appendingPathComponent("WebContent", isDirectory: true)
        let staging = directory.appendingPathComponent("WebContent-next", isDirectory: true)
        if FileManager.default.fileExists(atPath: staging.path) { try FileManager.default.removeItem(at: staging) }
        try FileManager.default.copyItem(at: source, to: staging)
        if FileManager.default.fileExists(atPath: destination.path) {
            _ = try FileManager.default.replaceItemAt(destination, withItemAt: staging)
        } else {
            try FileManager.default.moveItem(at: staging, to: destination)
        }
        return destination
    }
}

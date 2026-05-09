// Metro config tuned for this pnpm monorepo.
//
// Default `getDefaultConfig(__dirname)` only looks in the package's own
// node_modules and refuses to follow symlinks. In pnpm, packages live under
// `<workspace>/node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>`, and the
// project-level `node_modules/<pkg>` is a symlink into that store. Without
// symlink + workspace-root awareness, Metro resolves native module shims to
// the wrong copy and crashes at first call with
// `Exception in HostFunction: <unknown>`.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..", "..");

const config = getDefaultConfig(projectRoot);

config.resolver.unstable_enableSymlinks = true;
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Native-only packages that need to be aliased to a tiny stub on web,
// because their entry points statically import react-native internals
// (codegenNativeComponent, TurboModuleRegistry, etc.) that don't exist
// in the web target. Runtime `Platform.OS === "web"` guards in the
// callers ensure no property of the stub is ever accessed.
const WEB_NATIVE_STUBS = {
  "react-native-google-mobile-ads": path.resolve(
    projectRoot,
    "lib/ads.web-stub.js",
  ),
};

const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && WEB_NATIVE_STUBS[moduleName]) {
    return {
      filePath: WEB_NATIVE_STUBS[moduleName],
      type: "sourceFile",
    };
  }
  return baseResolveRequest
    ? baseResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

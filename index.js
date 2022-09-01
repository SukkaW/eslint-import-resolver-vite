const path = require("path");
const resolve = require("resolve");
const fs = require("fs");
const debug = require("debug");

const namespace = "eslint-plugin-import:resolver:vite";

const log = debug(namespace);

const logError = (message) => {
    log(message);
    console.log(`[${namespace}] ${message}`);
};

exports.interfaceVersion = 2;

exports.resolve = (source, file, config) => {
    log("resolving:", source);
    log("in file:", file);

    if (resolve.isCore(source)) {
        return { found: true, path: null };
    }

    try {
        // combine default config with user defined config
        const pluginConfig = {
            configPath: "vite.config.js",
            ...(config ?? {}),
        };

        // load vite config
        const viteConfigPath = path.resolve(pluginConfig.configPath);
        if (!fs.existsSync(viteConfigPath)) {
            logError(`vite config file doesn't exist at '${viteConfigPath}'`);
        }
        const viteConfigFile = require(viteConfigPath);

        let viteConfig;
        if (pluginConfig.namedExport) {
            viteConfig = viteConfigFile[pluginConfig.namedExport]
        }
        else {
            viteConfig = typeof viteConfigFile.default === "function" ? viteConfigFile.default() : viteConfigFile.default;
        }

        const defaultExtensions = [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"];
        const { alias, extensions } = viteConfig.resolve ?? {};

        let actualSource = source;

        // parse and replace alias
        if (alias) {
            Object.entries(alias).forEach(([find, replacement]) => {
                actualSource = actualSource.replace(find, replacement);
            });
        }

        // resolve module
        const resolvedPath = resolve.sync(actualSource, {
            basedir: path.dirname(path.resolve(file)),
            extensions: extensions ?? defaultExtensions,
        });
        log("resolved to:", resolvedPath);
        return { found: true, path: resolvedPath };
    }
    catch (err) {
        log("Path not found:", err);
        return { found: false };
    }
};

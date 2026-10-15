(function (root) {
  "use strict";

  var DEFAULT_POSTHOG_KEY = "phc_qzSxEBzrxYBZZTRHUbRYAsUbTfH5XvBZogErmdwAJx8J";
  var POSTHOG_HOST = "https://us.i.posthog.com";
  var POSTHOG_DEFAULTS = "2026-05-30";
  var POSTHOG_KEY_PATTERN = /^phc_[A-Za-z0-9]+$/;
  var POSTHOG_KEY_ENV_NAMES = [
    "POSTHOG_KEY",
    "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN",
    "NEXT_PUBLIC_POSTHOG_KEY",
    "VITE_POSTHOG_KEY",
  ];
  var STUB_METHODS = [
    "init",
    "capture",
    "register",
    "register_once",
    "register_for_session",
    "unregister",
    "unregister_for_session",
    "getFeatureFlag",
    "getFeatureFlagResult",
    "isFeatureEnabled",
    "reloadFeatureFlags",
    "updateEarlyAccessFeatureEnrollment",
    "getEarlyAccessFeatures",
    "on",
    "onFeatureFlags",
    "onSessionId",
    "getSurveys",
    "getActiveMatchingSurveys",
    "renderSurvey",
    "canRenderSurvey",
    "getNextSurveyStep",
    "identify",
    "setPersonProperties",
    "group",
    "resetGroups",
    "setPersonPropertiesForFlags",
    "resetPersonPropertiesForFlags",
    "setGroupPropertiesForFlags",
    "resetGroupPropertiesForFlags",
    "reset",
    "get_distinct_id",
    "getGroups",
    "get_session_id",
    "get_session_replay_url",
    "alias",
    "set_config",
    "startSessionRecording",
    "stopSessionRecording",
    "sessionRecordingStarted",
    "captureException",
    "loadToolbar",
    "get_property",
    "getSessionProperty",
    "createPersonProfile",
    "opt_in_capturing",
    "opt_out_capturing",
    "has_opted_in_capturing",
    "has_opted_out_capturing",
    "clear_opt_in_out_capturing",
    "debug",
  ];

  function resolvePostHogKey(env) {
    var source = env || {};
    for (var index = 0; index < POSTHOG_KEY_ENV_NAMES.length; index += 1) {
      var value = source[POSTHOG_KEY_ENV_NAMES[index]];
      if (typeof value !== "string") continue;
      var trimmed = value.trim();
      if (POSTHOG_KEY_PATTERN.test(trimmed)) return trimmed;
    }
    return DEFAULT_POSTHOG_KEY;
  }

  function postHogInitOptions() {
    return {
      api_host: POSTHOG_HOST,
      defaults: POSTHOG_DEFAULTS,
      capture_pageview: true,
      person_profiles: "identified_only",
      disable_session_recording: true,
      disable_surveys: true,
    };
  }

  function shouldCapture(windowRef) {
    var location = windowRef && windowRef.location;
    if (!location) return true;
    if (location.protocol === "file:") return false;
    var hostname = String(location.hostname || "").toLowerCase();
    return hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1";
  }

  function assetUrl(apiHost) {
    return String(apiHost || POSTHOG_HOST).replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
  }

  function install(windowRef) {
    if (!windowRef || windowRef.__VIBEDECK_POSTHOG_STARTED__) return false;
    var documentRef = windowRef.document;
    if (!documentRef || typeof documentRef.createElement !== "function") return false;
    windowRef.__VIBEDECK_POSTHOG_STARTED__ = true;
    if (!shouldCapture(windowRef)) return false;

    var existing = windowRef.posthog;
    if (existing && existing.__loaded && typeof existing.init === "function") {
      existing.init(resolvePostHogKey(windowRef.__VIBEDECK_ENV__), postHogInitOptions());
      return true;
    }
    if (existing && existing.__SV) return false;

    var stub = (windowRef.posthog = []);
    var scriptInserted = false;
    stub._i = [];
    stub.init = function (key, options, name) {
      var apiHost = options && options.api_host ? options.api_host : POSTHOG_HOST;
      if (!scriptInserted) {
        var script = documentRef.createElement("script");
        script.type = "text/javascript";
        script.crossOrigin = "anonymous";
        script.async = true;
        script.src = assetUrl(apiHost);
        script.onerror = function () {
          scriptInserted = false;
        };
        var firstScript = documentRef.getElementsByTagName("script")[0];
        if (firstScript && firstScript.parentNode) firstScript.parentNode.insertBefore(script, firstScript);
        else if (documentRef.head && typeof documentRef.head.appendChild === "function") documentRef.head.appendChild(script);
        scriptInserted = true;
      }

      function queue(target, methodName) {
        var parts = methodName.split(".");
        var method = methodName;
        var receiver = target;
        if (parts.length === 2) {
          receiver = target[parts[0]];
          method = parts[1];
        }
        receiver[method] = function () {
          receiver.push([method].concat(Array.prototype.slice.call(arguments, 0)));
        };
      }

      var client = name ? (stub[name] = []) : stub;
      client.people = client.people || [];
      for (var index = 0; index < STUB_METHODS.length; index += 1) queue(client, STUB_METHODS[index]);
      stub._i.push([key, options, name]);
    };
    stub.__SV = 1;
    stub.init(resolvePostHogKey(windowRef.__VIBEDECK_ENV__), postHogInitOptions());
    return true;
  }

  root.VibeDeckAnalytics = {
    DEFAULT_POSTHOG_KEY: DEFAULT_POSTHOG_KEY,
    POSTHOG_HOST: POSTHOG_HOST,
    POSTHOG_DEFAULTS: POSTHOG_DEFAULTS,
    resolvePostHogKey: resolvePostHogKey,
    postHogInitOptions: postHogInitOptions,
    shouldCapture: shouldCapture,
    assetUrl: assetUrl,
    install: install,
  };

  if (root.document && typeof root.document.createElement === "function") {
    install(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : this);

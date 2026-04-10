/** @link https://developer.chrome.com/docs/extensions/reference/api/i18n#locales */
export type LocaleCode =
  | 'ar' // Arabic
  | 'am' // Amharic
  | 'bg' // Bulgarian
  | 'bn' // Bengali
  | 'ca' // Catalan
  | 'cs' // Czech
  | 'da' // Danish
  | 'de' // German
  | 'el' // Greek
  | 'en' // English
  | 'en_AU' // English (Australia)
  | 'en_GB' // English (Great Britain)
  | 'en_US' // English (USA)
  | 'es' // Spanish
  | 'es_419' // Spanish (Latin America and Caribbean)
  | 'et' // Estonian
  | 'fa' // Persian
  | 'fi' // Finnish
  | 'fil' // Filipino
  | 'fr' // French
  | 'gu' // Gujarati
  | 'he' // Hebrew
  | 'hi' // Hindi
  | 'hr' // Croatian
  | 'hu' // Hungarian
  | 'id' // Indonesian
  | 'it' // Italian
  | 'ja' // Japanese
  | 'kn' // Kannada
  | 'ko' // Korean
  | 'lt' // Lithuanian
  | 'lv' // Latvian
  | 'ml' // Malayalam
  | 'mr' // Marathi
  | 'ms' // Malay
  | 'nl' // Dutch
  | 'no' // Norwegian
  | 'pl' // Polish
  | 'pt_BR' // Portuguese (Brazil)
  | 'pt_PT' // Portuguese (Portugal)
  | 'ro' // Romanian
  | 'ru' // Russian
  | 'sk' // Slovak
  | 'sl' // Slovenian
  | 'sr' // Serbian
  | 'sv' // Swedish
  | 'sw' // Swahili
  | 'ta' // Tamil
  | 'te' // Telugu
  | 'th' // Thai
  | 'tr' // Turkish
  | 'uk' // Ukrainian
  | 'vi' // Vietnamese
  | 'zh_CN' // Chinese (China)
  | 'zh_TW' // Chinese (Taiwan)

export type Localization<T extends string = string> = {
  /**
   * Maximum of 45 characters.
   *
   * Bullshield
   */
  manifest_name: T
  /**
   * No HTML or other formatting; no more than 132 characters.
   *
   * Automatically change the user agent ...
   */
  manifest_description: T
  /**
   * The tooltip, or title, appears when the user hovers the mouse on the extension's icon in the toolbar.
   *
   * Bullshield
   */
  manifest_action_default_title: T
  /** Generate new profile */
  manifest_command_renew_useragent: T
  /** Active profile */
  active_user_agent: T
  /** Pause protection */
  pause_switcher: T
  /** Resume protection */
  unpause_switcher: T
  /** Enable protection */
  enable_switcher: T
  /** Enabled on this domain */
  enabled_on_this_domain: T
  /** Sync the current OS with the generated user agent */
  sync_useragent_with_host_os: T
  /** Generate new profile */
  get_new_agent: T
  /** Open settings */
  open_settings: T
  /** General settings */
  general_settings: T
  /** Control how Bullshield generates and refreshes the active profile */
  general_settings_hint: T
  /** Automatically refresh the active profile after a specified interval */
  auto_renew: T
  /** Refresh interval in seconds */
  auto_renew_interval: T
  /** Refresh profile on browser startup */
  auto_renew_on_startup: T
  /** Protect against detection by JavaScript */
  js_protection: T
  /** Generator settings */
  generator_settings: T
  /** Fingerprint settings */
  fingerprint_settings: T
  /** Choose which browser families and operating systems Bullshield can emulate */
  generator_settings_hint: T
  /** Blacklist settings */
  blacklist_settings: T
  /** Blacklist mode - ... */
  blacklist_settings_hint: T
  /** Blacklist mode */
  blacklist_mode: T
  /** Whitelist mode */
  whitelist_mode: T
  /** Domain names list */
  blacklist_domains: T
  /** Remove */
  remove: T
  /** Edge on Windows */
  edge_win: T
  /** Edge on Mac */
  edge_mac: T
  /** Chrome on Windows */
  chrome_win: T
  /** Chrome on Mac */
  chrome_mac: T
  /** Chrome on Linux */
  chrome_linux: T
  /** Chrome on Android */
  chrome_android: T
  /** FireFox on Windows */
  firefox_win: T
  /** FireFox on Mac */
  firefox_mac: T
  /** FireFox on Linux */
  firefox_linux: T
  /** Firefox on Android */
  firefox_android: T
  /** Opera on Windows */
  opera_win: T
  /** Opera on Mac */
  opera_mac: T
  /** Safari on iPhone */
  safari_iphone: T
  /** Safari on Mac */
  safari_mac: T
  /** Grant permissions */
  grant_permission_button: T
  /** Continue after reading the explanation */
  onboarding_continue_button: T
  /** First run */
  onboarding_first_run_badge: T
  /** Before you enable Bullshield */
  onboarding_first_run_title: T
  /** First-run lead */
  onboarding_first_run_lead: T
  /** Permission required */
  onboarding_returning_title: T
  /** Returning lead */
  onboarding_returning_lead: T
  /** Permissions used */
  onboarding_permissions_title: T
  /** Permission description */
  onboarding_permission_all_urls: T
  /** Permission description */
  onboarding_permission_scripting: T
  /** Permission description */
  onboarding_permission_dnr: T
  /** Permission description */
  onboarding_permission_debugger: T
  /** Permission description */
  onboarding_permission_cookies: T
  /** Permission description */
  onboarding_permission_web_navigation: T
  /** Permission description */
  onboarding_permission_storage: T
  /** Permission description */
  onboarding_permission_tabs: T
  /** Permission description */
  onboarding_permission_alarms: T
  /** What Bullshield does not do */
  onboarding_does_not_title: T
  /** Negative disclosure */
  onboarding_does_not_sell_data: T
  /** Negative disclosure */
  onboarding_does_not_ads: T
  /** Negative disclosure */
  onboarding_does_not_account: T
  /** Negative disclosure */
  onboarding_does_not_remote_code: T
  /** Local data */
  onboarding_local_data_title: T
  /** Local data text */
  onboarding_local_data_text: T
  /** Site access section title */
  onboarding_site_access_title: T
  /** Chrome site access note */
  onboarding_site_access_chrome: T
  /** Acknowledge explanation */
  onboarding_acknowledge: T
  /** Not now */
  onboarding_not_now: T
  /** Footnote */
  onboarding_notice: T
}
